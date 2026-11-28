"""Dil modeli katmanı (Faz 4; K8: "model değiştirilebilir şekilde soyutlanmış").

Ajanlar modeli doğrudan değil bu katman üzerinden çağırır:

- `LLMIstemcisi`: dakikalık istek sınırı, yeniden deneme, çalıştırma başına token tavanı (K6) ve her çağrının
  kaydı (hangi ajan, hangi tur, kaç token; K12).
- `Konusma`: bir ajanın tek görevdeki yazışması: sistem istemi, araçlar (function calling) ve araç sonuçları.
- Sağlayıcılar:
  - `GeminiSaglayici`: Google Gen AI SDK (google-genai).
  - `SahteSaglayici`: önceden yazılmış yanıtlar. API anahtarı olmadan uçtan uca deneme ve testler için.
  Başka bir model eklemek için aynı üç metodu olan bir sınıf yazmak yeterli.

Gemini notları (Kasım 2026, belge 25):
- generateContent kullanılıyor. Google yeni projelere Interactions API'yi öneriyor ama generateContent "tam destekli".
  Araç çağırmada düşünce imzaları (thought signature), modelin döndürdüğü içerik geçmişe olduğu gibi eklendiği için
  korunuyor. Geçiş gerekirse yalnızca GeminiSaglayici değişir.
- Ücretsiz katmanda dakikalık ve günlük istek sınırı var. Her model çağrısı bir istektir; araç sonucunu geri
  göndermek de bir istektir.
- Ücretsiz katmanda gönderilen içerik Google ürünlerini geliştirmek için kullanılabilir. Gerçek kullanıcı kodu
  için ücretli anahtar gerekir.
"""
from __future__ import annotations

import json
import re
import time
from dataclasses import dataclass, field, replace
from pathlib import Path
from typing import Any, Callable, Protocol


@dataclass
class Arac:
    """Modelin çağırabileceği bir araç (function calling). parametreler: JSON Schema."""

    ad: str
    aciklama: str
    parametreler: dict


@dataclass
class AracCagrisi:
    ad: str
    argumanlar: dict
    kimlik: str | None = None


@dataclass
class Yanit:
    metin: str = ""
    arac_cagrilari: list[AracCagrisi] = field(default_factory=list)
    giris_token: int = 0
    cikis_token: int = 0
    dusunme_token: int = 0
    bitis_nedeni: str | None = None
    # Sağlayıcıya özgü içerik; konuşma geçmişine olduğu gibi eklenir (Gemini: düşünce imzalı Content)
    ham: Any = None

    @property
    def toplam_token(self) -> int:
        return self.giris_token + self.cikis_token + self.dusunme_token


class LLMHatasi(Exception):
    """Model çağrılamadı. Mesaj kullanıcıya gösterilecek Türkçe metindir."""


class KotaHatasi(LLMHatasi):
    """Günlük kota doldu ya da geçici hatalar için yeniden denemeler tükendi."""


class TavanAsildi(LLMHatasi):
    """Çalıştırmanın token tavanı doldu (K6)."""


class Durduruldu(Exception):
    """Kullanıcı testi durdurdu."""


class YenidenDene(Exception):
    """Geçici hata: bekleyip aynı isteği yeniden gönder."""

    def __init__(self, bekleme_sn: float, neden: str):
        super().__init__(neden)
        self.bekleme_sn, self.neden = bekleme_sn, neden


class Saglayici(Protocol):
    model: str

    def kullanici_icerigi(self, metin: str) -> Any: ...

    def arac_sonuclari_icerigi(self, sonuclar: list[tuple[AracCagrisi, dict]]) -> Any: ...

    def uret(self, *, sistem: str, gecmis: list, araclar: list[Arac], zorunlu: list[str] | None, en_fazla_cikis: int) -> Yanit: ...


# Model aracı bozuk çağırdıysa ya da boş yanıt döndüyse aynı istek yeniden gönderilir (en fazla 2 kez)
BOZUK_YANIT = {"MALFORMED_FUNCTION_CALL", "MALFORMED_RESPONSE", "UNEXPECTED_TOOL_CALL", "BOS"}
EN_FAZLA_YENIDEN_DENEME = 4
GUNLUK_KESIT = 120_000  # ayrıntılı günlükte bir metnin en fazla karakteri


class Konusma:
    """Bir ajanın tek görevdeki yazışması. Her `gonder` ve `arac_sonuclari` bir model isteğidir.

    zorunlu: None → model araç çağırıp çağırmamaya kendi karar verir; [] → mutlaka bir araç çağırır;
             ["write_tests"] → mutlaka bu araçlardan birini çağırır.
    """

    def __init__(self, istemci: LLMIstemcisi, ajan: str, sistem: str, araclar: list[Arac], tur: int | None):
        self.istemci, self.ajan, self.sistem, self.araclar, self.tur = istemci, ajan, sistem, list(araclar), tur
        self.gecmis: list = []
        self.istek_sayisi = 0

    def gonder(self, metin: str, zorunlu: list[str] | None = None) -> Yanit:
        self.gecmis.append(self.istemci.saglayici.kullanici_icerigi(metin))
        return self._cagir(zorunlu, metin)

    def arac_sonuclari(self, sonuclar: list[tuple[AracCagrisi, dict]], zorunlu: list[str] | None = None) -> Yanit:
        self.gecmis.append(self.istemci.saglayici.arac_sonuclari_icerigi(sonuclar))
        ozet = json.dumps([{"arac": c.ad, "sonuc": s} for c, s in sonuclar], ensure_ascii=False, indent=1, default=str)
        return self._cagir(zorunlu, ozet)

    def _cagir(self, zorunlu, son_mesaj: str) -> Yanit:
        self.istek_sayisi += 1
        yanit = self.istemci.cagir(self, zorunlu, son_mesaj)
        if yanit.ham is not None:
            self.gecmis.append(yanit.ham)
        return yanit


class LLMIstemcisi:
    """Bütün ajanların ortak model istemcisi: sınırlar, yeniden deneme ve kayıt burada."""

    def __init__(
        self,
        saglayici: Saglayici,
        *,
        dakika_istek: int = 10,
        token_tavani: int = 200_000,
        en_fazla_cikis: int = 32_768,
        durdu_mu: Callable[[], bool] | None = None,
        ayrintili_klasor: Path | str | None = None,
        kayit_ekle: Callable[[dict], None] | None = None,
    ):
        self.saglayici = saglayici
        self.aralik_sn = 60 / dakika_istek if dakika_istek and dakika_istek > 0 else 0.0
        self.token_tavani = token_tavani
        self.en_fazla_cikis = en_fazla_cikis
        self.durdu_mu = durdu_mu or (lambda: False)
        self.ayrintili = Path(ayrintili_klasor) if ayrintili_klasor else None
        if self.ayrintili:
            self.ayrintili.mkdir(parents=True, exist_ok=True)
        self.kayit_ekle = kayit_ekle
        self.kayitlar: list[dict] = []
        self._son_istek = 0.0

    @property
    def model(self) -> str:
        return self.saglayici.model

    @property
    def harcanan(self) -> int:
        return sum(k["toplam"] for k in self.kayitlar)

    def konusma(self, ajan: str, sistem: str, araclar: list[Arac] = (), tur: int | None = None) -> Konusma:
        return Konusma(self, ajan, sistem, list(araclar), tur)

    def ozet(self) -> dict:
        """Token kullanımı: toplam ve ajan başına (K12; kullanıcıya gösterilmez, başarım raporunda kullanılır)."""
        bos = lambda: {"istek": 0, "giris": 0, "cikis": 0, "dusunme": 0, "toplam": 0}  # noqa: E731
        toplam, ajanlar = bos(), {}
        for k in self.kayitlar:
            for hedef in (toplam, ajanlar.setdefault(k["ajan"], bos())):
                hedef["istek"] += 1
                for alan in ("giris", "cikis", "dusunme", "toplam"):
                    hedef[alan] += k[alan]
        return {"model": self.model, "tavan": self.token_tavani, **toplam, "ajanlar": ajanlar}

    def _bekle(self, sn: float) -> None:
        bitis = time.monotonic() + sn
        while (kalan := bitis - time.monotonic()) > 0:
            if self.durdu_mu():
                raise Durduruldu()
            time.sleep(min(0.5, kalan))

    def cagir(self, konusma: Konusma, zorunlu: list[str] | None, son_mesaj: str) -> Yanit:
        if self.harcanan >= self.token_tavani:
            raise TavanAsildi(f"Çalıştırmanın token tavanı ({self.token_tavani:,} token) doldu.".replace(",", "."))
        bozuk = yeniden = 0
        while True:
            if self.durdu_mu():
                raise Durduruldu()
            gecen = time.monotonic() - self._son_istek
            if gecen < self.aralik_sn:
                self._bekle(self.aralik_sn - gecen)
            self._son_istek = baslangic = time.monotonic()
            try:
                yanit = self.saglayici.uret(
                    sistem=konusma.sistem, gecmis=konusma.gecmis, araclar=konusma.araclar,
                    zorunlu=zorunlu, en_fazla_cikis=self.en_fazla_cikis,
                )
            except YenidenDene as hata:
                yeniden += 1
                self._kaydet(konusma, None, time.monotonic() - baslangic, son_mesaj, hata=hata.neden)
                if yeniden > EN_FAZLA_YENIDEN_DENEME:
                    raise KotaHatasi(f"Model {yeniden} kez üst üste yanıt vermedi ({hata.neden}). Biraz sonra yeniden dene.") from hata
                self._bekle(hata.bekleme_sn)
                continue
            self._kaydet(konusma, yanit, time.monotonic() - baslangic, son_mesaj)
            if yanit.bitis_nedeni in BOZUK_YANIT and not yanit.arac_cagrilari and not yanit.metin and bozuk < 2:
                bozuk += 1
                continue
            return yanit

    def _kaydet(self, konusma: Konusma, yanit: Yanit | None, sure: float, son_mesaj: str, hata: str | None = None) -> None:
        kayit = {
            "no": len(self.kayitlar) + 1,
            "ajan": konusma.ajan,
            "tur": konusma.tur,
            "model": self.model,
            "giris": yanit.giris_token if yanit else 0,
            "cikis": yanit.cikis_token if yanit else 0,
            "dusunme": yanit.dusunme_token if yanit else 0,
            "toplam": yanit.toplam_token if yanit else 0,
            "sure_sn": round(sure, 2),
            "bitis": yanit.bitis_nedeni if yanit else None,
            "araclar": [c.ad for c in yanit.arac_cagrilari] if yanit else [],
            "hata": hata,
        }
        self.kayitlar.append(kayit)
        if self.kayit_ekle:
            self.kayit_ekle(kayit)
        if self.ayrintili:
            self._ayrintili_yaz(kayit, konusma, yanit, son_mesaj)

    def _ayrintili_yaz(self, kayit: dict, konusma: Konusma, yanit: Yanit | None, son_mesaj: str) -> None:
        """Geliştirirken istemleri ve yanıtları incelemek için (yalnızca deneme betiği açar; dosyalar yerelde kalır)."""
        ajan = re.sub(r"[^a-z]+", "-", konusma.ajan.lower().translate(str.maketrans("çğıöşü", "cgiosu"))).strip("-")
        bolumler = [f"# {kayit['no']}. istek · {konusma.ajan} · tur {konusma.tur} · {self.model}", ""]
        if konusma.istek_sayisi == 1 and kayit["hata"] is None:
            bolumler += ["## Sistem istemi", konusma.sistem, ""]
        bolumler += ["## Gönderilen (son mesaj)", son_mesaj[:GUNLUK_KESIT], ""]
        if yanit is None:
            bolumler += ["## Hata", kayit["hata"] or ""]
        else:
            bolumler += [
                f"## Yanıt (bitiş: {yanit.bitis_nedeni}; giriş {yanit.giris_token}, çıkış {yanit.cikis_token}, düşünme {yanit.dusunme_token} token)",
                yanit.metin[:GUNLUK_KESIT],
            ]
            for cagri in yanit.arac_cagrilari:
                metin = json.dumps(cagri.argumanlar, ensure_ascii=False, indent=1)
                bolumler += [f"### Araç çağrısı: {cagri.ad}", "```json", metin[:GUNLUK_KESIT], "```"]
        (self.ayrintili / f"{kayit['no']:02d}-{ajan}-tur{konusma.tur or 0}.md").write_text("\n".join(bolumler), encoding="utf-8")


# ── Gemini ───────────────────────────────────────────────────────────────

def _ad(deger: Any) -> str | None:
    if deger is None:
        return None
    return getattr(deger, "value", None) or getattr(deger, "name", None) or str(deger)


def _bekleme_sn(metin: str, varsayilan: float) -> float:
    eslesme = re.search(r"retry(?:_d|D)elay['\"]?\s*[:=]\s*['\"]?(\d+(?:\.\d+)?)s", metin)
    sn = float(eslesme.group(1)) + 1 if eslesme else varsayilan
    return max(5.0, min(sn, 90.0))


def _ag_hatasi_mi(hata: Exception) -> bool:
    if isinstance(hata, (ConnectionError, TimeoutError, OSError)):
        return True
    return type(hata).__module__.split(".")[0] in {"httpx", "httpx2", "httpcore", "httpcore2", "requests", "urllib3", "aiohttp"}


class GeminiSaglayici:
    """Google Gemini (google-genai SDK, generateContent; araç çağırma elle yönetilir)."""

    def __init__(self, model: str, api_key: str, *, dusunme: str = "", zaman_asimi_sn: int = 180, taban_url: str | None = None):
        if not api_key:
            raise LLMHatasi("GEMINI_API_KEY bulunamadı. backend/.env dosyasına GEMINI_API_KEY=... satırını ekle (belge 25).")
        try:
            from google import genai
            from google.genai import errors, types
        except ImportError as hata:
            raise LLMHatasi("google-genai paketi kurulu değil. backend klasöründe: pip install -r requirements.txt") from hata
        self.model = model
        self._types, self._errors = types, errors
        # Yeniden denemeyi SDK değil LLMIstemcisi yapar (SDK'nın varsayılanı zaten yeniden denememek).
        # taban_url yalnızca testlerde: sahte bir Gemini sunucusuyla istek biçimini doğrulamak için.
        secenekler = {"timeout": zaman_asimi_sn * 1000, **({"base_url": taban_url} if taban_url else {})}
        self._istemci = genai.Client(api_key=api_key, http_options=types.HttpOptions(**secenekler))
        self.dusunme = (dusunme or "").strip().upper()

    def kullanici_icerigi(self, metin: str):
        t = self._types
        return t.Content(role="user", parts=[t.Part.from_text(text=metin)])

    def arac_sonuclari_icerigi(self, sonuclar: list[tuple[AracCagrisi, dict]]):
        t = self._types
        return t.Content(
            role="user",
            parts=[t.Part(function_response=t.FunctionResponse(id=c.kimlik, name=c.ad, response=s)) for c, s in sonuclar],
        )

    def uret(self, *, sistem: str, gecmis: list, araclar: list[Arac], zorunlu: list[str] | None, en_fazla_cikis: int) -> Yanit:
        t = self._types
        ayar: dict[str, Any] = {
            "system_instruction": sistem,
            "max_output_tokens": en_fazla_cikis,
            "automatic_function_calling": t.AutomaticFunctionCallingConfig(disable=True),
        }
        if araclar:
            ayar["tools"] = [t.Tool(function_declarations=[
                t.FunctionDeclaration(name=a.ad, description=a.aciklama, parameters_json_schema=a.parametreler) for a in araclar
            ])]
            if zorunlu is not None:
                ayar["tool_config"] = t.ToolConfig(function_calling_config=t.FunctionCallingConfig(
                    mode="ANY", allowed_function_names=list(zorunlu) or None,
                ))
        if self.dusunme:
            ayar["thinking_config"] = t.ThinkingConfig(thinking_level=self.dusunme)
        try:
            yanit = self._istemci.models.generate_content(model=self.model, contents=gecmis, config=t.GenerateContentConfig(**ayar))
        except self._errors.ClientError as hata:
            raise self._istemci_hatasi(hata) from hata
        except self._errors.ServerError as hata:
            raise YenidenDene(15, f"Gemini sunucu hatası ({hata.code})") from hata
        except Exception as hata:
            if _ag_hatasi_mi(hata):
                raise YenidenDene(10, f"bağlantı hatası ({type(hata).__name__})") from hata
            raise
        return self._cevir(yanit)

    def _cevir(self, yanit) -> Yanit:
        u = yanit.usage_metadata
        sayilar = {
            "giris_token": (u.prompt_token_count or 0) if u else 0,
            "cikis_token": (u.candidates_token_count or 0) if u else 0,
            "dusunme_token": (u.thoughts_token_count or 0) if u else 0,
        }
        aday = yanit.candidates[0] if yanit.candidates else None
        if aday is None or aday.content is None or not aday.content.parts:
            neden = None
            if yanit.prompt_feedback is not None and yanit.prompt_feedback.block_reason:
                neden = f"ENGELLENDI_{_ad(yanit.prompt_feedback.block_reason)}"
            elif aday is not None:
                neden = _ad(aday.finish_reason)
            return Yanit(bitis_nedeni=neden if neden not in (None, "STOP") else "BOS", **sayilar)
        parcalar = aday.content.parts
        return Yanit(
            metin="".join(p.text for p in parcalar if p.text and not p.thought),
            arac_cagrilari=[
                AracCagrisi(ad=p.function_call.name, argumanlar=dict(p.function_call.args or {}), kimlik=p.function_call.id)
                for p in parcalar if p.function_call
            ],
            bitis_nedeni=_ad(aday.finish_reason),
            ham=aday.content,
            **sayilar,
        )

    def _istemci_hatasi(self, hata) -> Exception:
        metin = f"{hata.status} {hata.message} {json.dumps(hata.details, ensure_ascii=False, default=str)}"
        if hata.code == 429:
            if re.search(r"PerDay|per day|daily", metin, re.IGNORECASE):
                return KotaHatasi(
                    "Gemini'nin günlük ücretsiz kotası doldu (Pasifik saatiyle gece yarısı sıfırlanır). "
                    "Yarın yeniden dene ya da .env'deki GEMINI_MODEL'i günlük kotası daha geniş bir modelle değiştir."
                )
            return YenidenDene(_bekleme_sn(metin, 30), "dakikalık istek sınırı (429)")
        if hata.code in (401, 403) or "API_KEY" in metin or "API key not valid" in metin:
            return LLMHatasi(
                f"Gemini anahtarı kabul edilmedi ({hata.code} {hata.status}). backend/.env'deki GEMINI_API_KEY'i kontrol et. "
                "AI Studio'nun yeni (AQ. ile başlayan) anahtarları bazı hesaplarda bu hatayı veriyor; AI Studio'da yeni bir anahtar "
                "oluşturmayı dene. Bilgisayarında eski bir GOOGLE_API_KEY ortam değişkeni varsa onu kaldır."
            )
        if hata.code == 404:
            return LLMHatasi(f"Model bulunamadı: {self.model}. Erişebildiğin modelleri görmek için: python araclar/gemini_dene.py --modeller")
        if "location" in metin.lower() and "not supported" in metin.lower():
            return LLMHatasi("Gemini API bu konumdan kullanılamıyor (FAILED_PRECONDITION).")
        return LLMHatasi(f"Gemini isteği reddedildi ({hata.code} {hata.status}): {hata.message}")

    def modeller(self) -> list[dict]:
        """Bu anahtarın içerik üretebildiği modeller (bağlantı denemesi için; kotaya sayılmaz)."""
        liste = []
        for m in self._istemci.models.list():
            eylemler = getattr(m, "supported_actions", None) or []
            if eylemler and "generateContent" not in eylemler:
                continue
            liste.append({"ad": (m.name or "").removeprefix("models/"), "aciklama": m.display_name or "",
                          "giris_siniri": m.input_token_limit, "cikis_siniri": m.output_token_limit})
        return liste


# ── Sahte (önceden yazılmış yanıtlar) ───────────────────────────────────

class SahteSaglayici:
    """Önceden yazılmış yanıtları sırayla döndürür. API anahtarı ve ağ gerektirmez.

    Bulutta ve API anahtarı olmadan uçtan uca deneme içindir; gerçek bir dil modeli değildir.
    Token sayıları kaba tahmindir (~4 karakter = 1 token). Yanıtlar bitince boş bir araç çağrısı döner.
    """

    model = "sahte"

    def __init__(self, yanitlar: list[Yanit | Callable[..., Yanit]]):
        self.yanitlar = list(yanitlar)
        self.istekler: list[dict] = []

    def kullanici_icerigi(self, metin: str) -> dict:
        return {"rol": "kullanici", "metin": metin}

    def arac_sonuclari_icerigi(self, sonuclar: list[tuple[AracCagrisi, dict]]) -> dict:
        return {"rol": "arac", "sonuclar": [{"ad": c.ad, "sonuc": s} for c, s in sonuclar]}

    def uret(self, *, sistem: str, gecmis: list, araclar: list[Arac], zorunlu: list[str] | None, en_fazla_cikis: int) -> Yanit:
        self.istekler.append({"sistem": sistem, "gecmis": list(gecmis), "araclar": [a.ad for a in araclar], "zorunlu": zorunlu})
        if self.yanitlar:
            yanit = self.yanitlar.pop(0)
            if callable(yanit):
                yanit = yanit(sistem=sistem, gecmis=gecmis, araclar=araclar)
        else:
            yanit = self._bos_yanit([a.ad for a in araclar])
        giris = (len(sistem) + sum(len(json.dumps(g, ensure_ascii=False, default=str)) for g in gecmis)) // 4
        cikis = (len(yanit.metin) + len(json.dumps([c.argumanlar for c in yanit.arac_cagrilari], ensure_ascii=False))) // 4
        return replace(
            yanit,
            giris_token=yanit.giris_token or giris,
            cikis_token=yanit.cikis_token or cikis,
            bitis_nedeni=yanit.bitis_nedeni or "STOP",
            ham={"rol": "model", "metin": yanit.metin, "araclar": [c.ad for c in yanit.arac_cagrilari]},
        )

    @staticmethod
    def _bos_yanit(arac_adlari: list[str]) -> Yanit:
        if "write_tests" in arac_adlari:
            return Yanit(arac_cagrilari=[AracCagrisi("write_tests", {"files": [], "notes": "Senaryoda yeni yanıt yok."})])
        if "save_plan" in arac_adlari:
            return Yanit(arac_cagrilari=[AracCagrisi("save_plan", {"units": []})])
        return Yanit(metin="(senaryo bitti)")
