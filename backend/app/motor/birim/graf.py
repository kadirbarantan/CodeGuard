"""Birim alt grafı (K9): Planlayıcı → Test Yazıcı → Doğrulayıcı döngüsü, LangGraph ile.

    analiz → planla → yaz → doğrula ─┬─ devam  → yaz  (sonraki tur)
                                     ├─ düzelt → yaz  (aynı tur, hızlı düzeltme)
                                     └─ bitir  → son  (3 kez çalıştır, kararsızları ayıkla) → bitiş

Döngü kuralları (K6):
- İlk tur + en fazla 3 tekrar.
- Sözdizimi ve toplama (içe aktarma) hataları için tur başına en fazla 2 hızlı düzeltme; tur sayacından düşmez.
- 2 tur üst üste ilerleme yoksa erken durma. İlerleme: satır ya da dal kapsaması arttı, geçen test arttı ya da
  çözülmemiş kalan test azaldı.
- Çalıştırma başına token tavanı. Tavan ya da günlük kota dolarsa o ana kadarki testlerle rapora geçilir.

Ajanlar yalnızca istemde verilenleri görür (K4): Planlayıcı Kod Haritası'nı, Test Yazıcı planlanan birimlerin
kaynağını, mevcut testleri ve geri bildirimi. Doğrulama deterministiktir; LLM tahmine değil sandbox'ın gerçek
çıktısına dayanır.
"""
from __future__ import annotations

import difflib
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, TypedDict

from langgraph.graph import END, START, StateGraph

from app.analiz.kod_haritasi import birim_kaynagi
from app.motor.birim import istemler
from app.motor.birim.araclar import KAYNAK_ARACI, PLAN_ARACI, YAZMA_ARACI
from app.motor.birim.denetim import ayni_test_mi, dosyayi_denetle, fonksiyon_kaynagi, fonksiyonu_koy, test_adlari, yol_duzelt
from app.motor.birim.dogrulayici import Dogrulayici, anahtar, anahtar_coz
from app.motor.llm import Durduruldu, LLMHatasi, LLMIstemcisi, Yanit

log = logging.getLogger("codeguard.motor.birim")

AJAN_PLANLAYICI = "Planlayıcı Ajan"
AJAN_YAZICI = "Test Yazıcı Ajan"
AJAN_DOGRULAYICI = "Doğrulayıcı · Standardizasyon Katmanı"
EN_FAZLA_SENARYO = 12
KAYNAK_ISTEK_SINIRI = 3  # tur başına get_source turu; sonra write_tests zorunlu
DOSYA_KAYNAK_SINIRI = 20_000  # get_source ile bütün bir dosya istendiğinde verilen en fazla karakter
PLAN_TAMAMLAMA_SINIRI = 40  # test edilebilir birim sayısı bunu aşmıyorsa planda olmayanlar da plana eklenir


class KurulumHatasi(Exception):
    """Projenin bağımlılıkları kurulamadı (K5: süreç durur, "kurulum hatası" raporlanır)."""


class Durum(TypedDict, total=False):
    tur: int
    hizli_duzeltme: int
    ilerlemesiz: int
    plan: dict
    dosyalar: dict
    olasi_hatalar: dict
    reddedilenler: list
    yazim_sorunlari: dict
    geri_cekilenler: list
    duzeltilenler: list
    geri_alinan_toplam: int
    reddedilen_toplam: int
    duzeltme_hatalari: list
    dogrulama: dict
    turlar: list
    karar: str
    bitis_nedeni: str
    son: dict


@dataclass
class Baglam:
    kaynak: object  # Path
    secim: dict
    harita: dict
    istemci: LLMIstemcisi
    dogrulayici: Dogrulayici
    bildir: Callable[[dict], None]
    durdu_mu: Callable[[], bool]
    en_fazla_tur: int = 4
    hizli_duzeltme_siniri: int = 2
    metrik: dict = field(default_factory=lambda: {"coverage": 0, "uiCovered": 0, "uiTotal": 0, "passed": 0, "bugs": 0, "calistirilamadi": 0})

    @property
    def birimler(self) -> dict[str, dict]:
        return {b["id"]: b for b in self.harita["birimler"]}

    def test_edilebilirler(self) -> list[dict]:
        return [b for b in self.harita["birimler"] if b["tur"] != "sinif" and b.get("hedef") and b.get("test_edilebilir")]

    def olay(self, agent: str, kind: str, message: str, tur: int) -> None:
        """Canlı akış adımı: docs/api-sozlesmesi.md'deki agent_step biçimi (sahte motorla aynı)."""
        self.bildir({"type": "agent_step", "agent": agent, "kind": kind, "message": message,
                     "round": tur, "maxRounds": self.en_fazla_tur, "metrics": dict(self.metrik)})

    def kontrol(self) -> None:
        if self.durdu_mu():
            raise Durduruldu()


# ── Yardımcılar ──────────────────────────────────────────────────────────

def _birim_bul(b: Baglam, metin: str) -> dict | None:
    metin = (metin or "").strip()
    birimler = b.birimler
    if metin in birimler:
        return birimler[metin]
    adaylar = [x for x in birimler.values() if x["tam_ad"] == metin or x["ad"] == metin or x["id"].endswith("::" + metin)]
    return adaylar[0] if len(adaylar) == 1 else None


def _test_bul(metin: str, dosyalar: dict[str, str]) -> str | None:
    """Ajanın yazdığı test adını anahtara çevirir: "test_x", "TestA::test_x", "tests/test_posts.py::test_x" …"""
    metin = (metin or "").strip().split("[")[0]
    dosya_parcasi, _, ad = metin.rpartition("::") if "::" in metin else ("", "", metin)
    sinif = ""
    if dosya_parcasi and "::" in dosya_parcasi:  # tests/test_x.py::TestA::test_y
        dosya_parcasi, _, sinif = dosya_parcasi.rpartition("::")
    elif dosya_parcasi and not dosya_parcasi.endswith(".py") and "/" not in dosya_parcasi and dosya_parcasi.startswith("Test"):
        dosya_parcasi, sinif = "", dosya_parcasi
    for yol, icerik in dosyalar.items():
        if dosya_parcasi:
            kok = dosya_parcasi.replace("\\", "/").split("/")[-1].removesuffix(".py")
            if yol != f"tests/{kok}.py":
                continue
        for test in test_adlari(icerik):
            parcalar = test.split("::")
            if parcalar[-1] == ad and (not sinif or (len(parcalar) > 1 and parcalar[0] == sinif)):
                return anahtar(yol, test)
    return None


def _yazimi_uygula(b: Baglam, yazmalar: list[dict], dosyalar: dict[str, str], olasi_hatalar: dict, tur: int,
                   kalanlar: set[str] = frozenset()) -> dict:
    """write_tests çağrılarını uygular: yol kuralı, sözdizimi, hile denetimi, Olası Hata işaretleri ve kilidi.

    Olası Hata kilidi (K6, "test koda uydurulmaz"): işaretlenen testin kaynağı saklanır. Ajan sonraki turlarda testi
    değiştirir ya da silerse eski hâli geri konur. Son turda kalan bir test işaretlenirken aynı çağrıda değiştirildiyse
    kalan (hatayı gösteren) hâli kilitlenir. İşaret yanlışsa ajan retracted_bugs ile gerekçesini yazarak geri çeker;
    ancak o zaman test değiştirilebilir. kalanlar: son turda kalan testlerin anahtarları.

    Kalan test kilidi: son turda kalan ve işaretlenmeyen bir test yalnızca fixed_tests'te gerekçesi yazılırsa
    değiştirilebilir (testin kendi hatası). Gerekçesiz değişiklik ya da silme geri alınır; böylece ajan beklentiyi
    kodun davranışına uyduramaz, senaryoyu ya da parametreyi sessizce silemez.
    """
    sonuc = {"sozdizimi": [], "dosya_retleri": [], "reddedilenler": [], "yazilan": [], "silinen": [], "gecersiz_yol": [],
             "yeni_olasi_hata": [], "notlar": [], "geri_cekilen": [], "kilit_geri_alinan": [], "kalan_geri_alinan": [],
             "duzeltilen": []}
    onceki = dict(dosyalar)
    # 1) Geri çekilen işaretler (testin kendisi yanlışsa)
    for arg in yazmalar:
        for oge in arg.get("retracted_bugs") or []:
            if not isinstance(oge, dict):
                continue
            k = _test_bul(str(oge.get("test", "")), onceki)
            if k and k in olasi_hatalar:
                olasi_hatalar.pop(k)
                sonuc["geri_cekilen"].append({"test": k, "gerekce": str(oge.get("reason") or "").strip()[:600], "tur": tur})
    # 2) Dosyalar
    for arg in yazmalar:
        for oge in arg.get("files") or []:
            if not isinstance(oge, dict):
                continue
            ham_yol, icerik = str(oge.get("path", "")), oge.get("content")
            yol = yol_duzelt(ham_yol)
            if yol is None:
                sonuc["gecersiz_yol"].append(ham_yol)
                continue
            if not isinstance(icerik, str):
                continue
            if not icerik.strip():
                if dosyalar.pop(yol, None) is not None:
                    sonuc["silinen"].append(yol)
                continue
            denetim = dosyayi_denetle(yol, icerik)
            if denetim.sozdizimi_hatasi:
                sonuc["sozdizimi"].append({"path": yol, "hata": denetim.sozdizimi_hatasi})
                continue
            if denetim.dosya_reddi:
                sonuc["dosya_retleri"].append({"path": yol, "neden": denetim.dosya_reddi})
                continue
            dosyalar[yol] = denetim.icerik
            sonuc["yazilan"].append(yol)
            sonuc["reddedilenler"] += [{"test": anahtar(yol, r["test"]), "neden": r["neden"]} for r in denetim.reddedilenler]
        if arg.get("notes"):
            sonuc["notlar"].append(str(arg["notes"])[:500])
    # 3) Kilit: işaretli testler değişmişse ya da silinmişse eski hâline dön
    for k, bilgi in olasi_hatalar.items():
        dosya, ad = anahtar_coz(k)
        kilitli = bilgi.get("kod")
        if not kilitli:
            continue
        if dosya not in dosyalar:  # dosya silindiyse önceki hâli geri gelir
            if dosya in onceki:
                dosyalar[dosya] = onceki[dosya]
                sonuc["kilit_geri_alinan"].append(k)
            continue
        if ayni_test_mi(fonksiyon_kaynagi(dosyalar[dosya], ad), kilitli):
            continue
        yeni = fonksiyonu_koy(dosyalar[dosya], ad, kilitli)
        if yeni is not None:
            dosyalar[dosya] = yeni
            sonuc["kilit_geri_alinan"].append(k)
    # 3b) Kalan test kilidi: gerekçesiz değişiklik ya da silme geri alınır
    isaretlenecek = {k for arg in yazmalar for oge in (arg.get("suspected_bugs") or [])
                     if isinstance(oge, dict) and (k := _test_bul(str(oge.get("test", "")), dosyalar))}
    gerekceler: dict[str, str] = {}
    for arg in yazmalar:
        for oge in arg.get("fixed_tests") or []:
            if not isinstance(oge, dict) or not str(oge.get("reason") or "").strip():
                continue
            k = _test_bul(str(oge.get("test", "")), dosyalar) or _test_bul(str(oge.get("test", "")), onceki)
            if k:
                gerekceler[k] = str(oge["reason"]).strip()[:600]
    for k in sorted(kalanlar):
        if k in olasi_hatalar or k in isaretlenecek:
            continue
        dosya, ad = anahtar_coz(k)
        eski = fonksiyon_kaynagi(onceki[dosya], ad) if dosya in onceki else None
        if eski is None:
            continue
        if ayni_test_mi(fonksiyon_kaynagi(dosyalar[dosya], ad) if dosya in dosyalar else None, eski):
            continue
        if k in gerekceler:
            sonuc["duzeltilen"].append({"test": k, "gerekce": gerekceler[k], "tur": tur})
            continue
        if dosya not in dosyalar:
            dosyalar[dosya] = onceki[dosya]
        else:
            yeni = fonksiyonu_koy(dosyalar[dosya], ad, eski)
            if yeni is None:
                continue
            dosyalar[dosya] = yeni
        sonuc["kalan_geri_alinan"].append(k)
    # 4) Yeni Olası Hata işaretleri (testin o anki hâli kilitlenir)
    for arg in yazmalar:
        for oge in arg.get("suspected_bugs") or []:
            if not isinstance(oge, dict):
                continue
            k = _test_bul(str(oge.get("test", "")), dosyalar)
            if k is None or k in olasi_hatalar:
                continue
            birim = _birim_bul(b, str(oge.get("unit", "")))
            satir = oge.get("line")
            if not isinstance(satir, int) or satir <= 0:
                satir = (birim.get("govde_satirlari") or birim["satirlar"])[0] if birim else None
            dosya, ad = anahtar_coz(k)
            kod = fonksiyon_kaynagi(dosyalar[dosya], ad)
            onceki_kod = fonksiyon_kaynagi(onceki[dosya], ad) if dosya in onceki else None
            if k in kalanlar and onceki_kod and not ayni_test_mi(onceki_kod, kod):
                # Kalan test işaretlenirken değiştirilmiş: hatayı gösteren önceki hâli kilitlenir
                yeni = fonksiyonu_koy(dosyalar[dosya], ad, onceki_kod)
                if yeni is not None:
                    dosyalar[dosya], kod = yeni, onceki_kod
                    sonuc["kilit_geri_alinan"].append(k)
            sonuc["yeni_olasi_hata"].append(k)
            olasi_hatalar[k] = {
                "test": k,
                "birim": birim["id"] if birim else str(oge.get("unit", ""))[:200],
                "dosya": birim["dosya"] if birim else None,
                "satir": satir,
                "baslik": (str(oge.get("title") or "").strip() or ad.split("::")[-1])[:160],
                "gerekce": str(oge.get("reason") or "").strip()[:1500],
                "tur": tur,
                "kod": kod,
            }
    # Testi gerçekten kalmayan işaretler düşer (ör. kilitlenemeyen, dosyadan çıkarılmış test)
    mevcut = {anahtar(y, t) for y, i in dosyalar.items() for t in test_adlari(i)}
    for k in [k for k in olasi_hatalar if k not in mevcut]:
        del olasi_hatalar[k]
    return sonuc


def _kaynak_ver(b: Baglam, argumanlar: dict) -> dict:
    idler = [str(x) for x in (argumanlar.get("unit_ids") or [])][:8]
    dosya_yollari = {d["yol"] for d in b.harita["dosyalar"]}
    kaynaklar, bulunamayan = [], []
    for bid in idler:
        yol = bid.strip().replace("\\", "/").removeprefix("./")
        if yol in dosya_yollari:  # bütün dosya istendi
            satirlar = (Path(b.kaynak) / yol).read_text(encoding="utf-8", errors="replace").splitlines()
            genislik = len(str(len(satirlar)))
            metin = "\n".join(f"{no:>{genislik}} | {satir}" for no, satir in enumerate(satirlar, 1))
            kaynaklar.append({"unit": yol, "source": metin[:DOSYA_KAYNAK_SINIRI]})
            continue
        birim = _birim_bul(b, bid)
        if birim is None:
            bulunamayan.append(bid)
            continue
        kaynaklar.append({"unit": birim["id"], "source": birim_kaynagi(b.kaynak, b.harita, birim["id"])})
    sonuc: dict = {"sources": kaynaklar}
    if bulunamayan:
        # Hem tam kimliklere hem kısa adlara bak ("slugfy" → app/utils/slug.py::slugify)
        adlar: dict[str, str] = {}
        for x in b.birimler.values():
            adlar.setdefault(x["tam_ad"], x["id"])
            adlar[x["id"]] = x["id"]
        oneriler = set()
        for aranan in bulunamayan:
            for metin in {aranan, aranan.split("::")[-1]}:
                oneriler.update(adlar[e] for e in difflib.get_close_matches(metin, list(adlar), n=3, cutoff=0.6))
        sonuc["not_found"] = bulunamayan
        sonuc["hint"] = "Benzer kimlikler: " + (", ".join(sorted(oneriler)) if oneriler else "yok; haritadaki kimlikleri kullan.")
    return sonuc


def _yazici_konusmasi(b: Baglam, konusma, yanit: Yanit, dosyalar: dict, olasi_hatalar: dict, tur: int, hizli: int,
                      kalanlar: set[str] = frozenset()) -> tuple[dict, int]:
    """Test Yazıcı'nın araç çağrılarını yürütür: get_source sonuçları, write_tests ve sözdizimi için hızlı düzeltme."""
    kaynak_turu = durtme = 0
    toplam = {"sozdizimi": [], "dosya_retleri": [], "reddedilenler": [], "yazilan": [], "silinen": [], "gecersiz_yol": [],
              "yeni_olasi_hata": [], "notlar": [], "geri_cekilen": [], "kilit_geri_alinan": [], "kalan_geri_alinan": [],
              "duzeltilen": [], "kaynak_istegi": 0, "hizli_sozdizimi": 0, "yazildi": False}
    while True:
        b.kontrol()
        yazmalar = [c for c in yanit.arac_cagrilari if c.ad == "write_tests"]
        kaynaklar = [c for c in yanit.arac_cagrilari if c.ad == "get_source"]
        digerleri = [c for c in yanit.arac_cagrilari if c.ad not in ("write_tests", "get_source")]
        if yazmalar:
            sonuc = _yazimi_uygula(b, [c.argumanlar for c in yazmalar], dosyalar, olasi_hatalar, tur, kalanlar)
            for alan in ("sozdizimi", "dosya_retleri", "reddedilenler", "yazilan", "silinen", "gecersiz_yol", "yeni_olasi_hata",
                         "notlar", "geri_cekilen", "kilit_geri_alinan", "kalan_geri_alinan", "duzeltilen"):
                toplam[alan] += sonuc[alan]
            toplam["yazildi"] = True
            if sonuc["sozdizimi"] and hizli < b.hizli_duzeltme_siniri:
                hizli += 1
                toplam["hizli_sozdizimi"] += 1
                hata = {
                    "status": "fix_required",
                    "syntax_errors": sonuc["sozdizimi"],
                    "message": "Bu dosyalar derlenmiyor ve kaydedilmedi. Düzeltip yalnızca bu dosyaları write_tests ile yeniden gönder.",
                }
                cevaplar = [(c, hata) for c in yazmalar] + [(c, _kaynak_ver(b, c.argumanlar)) for c in kaynaklar]
                cevaplar += [(c, {"error": "Bilinmeyen araç."}) for c in digerleri]
                yanit = konusma.arac_sonuclari(cevaplar, zorunlu=["write_tests"])
                continue
            return toplam, hizli
        if kaynaklar:
            kaynak_turu += 1
            toplam["kaynak_istegi"] += 1
            if kaynak_turu <= KAYNAK_ISTEK_SINIRI:
                cevaplar = [(c, _kaynak_ver(b, c.argumanlar)) for c in kaynaklar]
                zorunlu = [] if kaynak_turu < KAYNAK_ISTEK_SINIRI else ["write_tests"]
            else:
                cevaplar = [(c, {"error": "Kaynak isteme sınırına ulaşıldı. Şimdi testleri write_tests ile kaydet."}) for c in kaynaklar]
                zorunlu = ["write_tests"]
                if kaynak_turu > KAYNAK_ISTEK_SINIRI + 1:
                    return toplam, hizli
            cevaplar += [(c, {"error": "Bilinmeyen araç."}) for c in digerleri]
            yanit = konusma.arac_sonuclari(cevaplar, zorunlu=zorunlu)
            continue
        if digerleri and durtme == 0:
            durtme += 1
            yanit = konusma.arac_sonuclari([(c, {"error": "Bilinmeyen araç. Testleri write_tests ile kaydet."}) for c in digerleri],
                                           zorunlu=["write_tests"])
            continue
        if durtme == 0:
            durtme += 1
            ipucu = ("Yanıtın çıkış sınırına takıldı. Daha az ve daha kısa test yaz; bütün dosyaları tek write_tests çağrısıyla gönder."
                     if yanit.bitis_nedeni == "MAX_TOKENS" else "Testleri write_tests aracıyla kaydet.")
            yanit = konusma.gonder(ipucu, zorunlu=["write_tests"])
            continue
        return toplam, hizli


def _kaynak_birimleri(b: Baglam, durum: Durum) -> list[str]:
    """Test Yazıcı'ya kaynağı verilecek birimler: önce geri bildirimde eksiği olanlar, sonra plan, sonra bağımlılıkları."""
    sira: list[str] = []
    dogrulama = durum.get("dogrulama") or {}
    sira += dogrulama.get("eksik_birimler", [])
    plan_birimleri = [p["unit"] for p in (durum.get("plan") or {}).get("units", [])]
    sira += plan_birimleri
    birimler = b.birimler
    for bid in plan_birimleri:
        sira += birimler.get(bid, {}).get("bagimliliklar", [])
    # Kalan test edilebilir birimler de (kaynak sınırına kadar): Yazıcı'nın get_source için istek harcamaması için
    sira += [x["id"] for x in b.test_edilebilirler()]
    gorulen, sonuc = set(), []
    for bid in sira:
        if bid in birimler and bid not in gorulen:
            gorulen.add(bid)
            sonuc.append(bid)
    return sonuc


def _reddedilen_metni(reddedilenler: list[dict], dosya_retleri: list[dict], gecersiz_yol: list[str],
                      kilit_geri_alinan: list[str] = (), kalan_geri_alinan: list[str] = ()) -> str:
    satirlar = []
    if kalan_geri_alinan:
        satirlar.append("Kalan şu testleri gerekçe yazmadan değiştirdin ya da sildin; eski hâllerine döndürüldü: " + ", ".join(kalan_geri_alinan)
                        + ". Testin kendisi yanlışsa düzeltip fixed_tests'e nedenini yaz; kod belgeden sapıyorsa suspected_bugs ile işaretle.")
    if kilit_geri_alinan:
        satirlar.append("Olası Hata olarak işaretli şu testleri değiştirdin; eski (kalan) hâllerine döndürüldü: " + ", ".join(kilit_geri_alinan)
                        + ". İşaret yanlışsa (testin kendisi hatalıysa) retracted_bugs ile gerekçesini yazarak geri çek.")
    if reddedilenler:
        satirlar.append("Hile denetiminden geçmeyip çıkarılan testler (K6):")
        satirlar += [f"- {r['test']}: {r['neden']}" for r in reddedilenler]
    if dosya_retleri:
        satirlar.append("Kaydedilmeyen dosyalar:")
        satirlar += [f"- {r['path']}: {r['neden']}" for r in dosya_retleri]
    if gecersiz_yol:
        satirlar.append("Geçersiz yol (yalnızca tests/test_<ad>.py ve tests/conftest.py yazılabilir): " + ", ".join(gecersiz_yol))
    return "\n".join(satirlar)


# ── Düğümler ─────────────────────────────────────────────────────────────

def analiz(b: Baglam, durum: Durum) -> Durum:
    b.kontrol()
    o = b.harita["ozet"]
    b.olay(AJAN_PLANLAYICI, "Analiz", f"Kod Haritası çıkarıldı: {o['dosya']} dosya, {o['fonksiyon_ve_metot']} fonksiyon/metot, "
                                      f"{o['dal']} dal, {o['hata_yolu']} hata yolu.", 1)
    if o["test_edilemeyen"]:
        motorlar = sorted({m for x in b.harita["birimler"] if not x.get("test_edilebilir", True) for m in x.get("dis_moduller", [])})
        b.olay("Bağımlılık Analizi", "Analiz", f"{', '.join(motorlar)} kullanan {o['test_edilemeyen']} birim ayrıldı; "
                                               f"{len(b.test_edilebilirler())} birim test edilebilir.", 1)
    kurulum = b.dogrulayici.oturum.kur()
    if kurulum["durum"] == "hata":
        raise KurulumHatasi((kurulum.get("gunluk_sonu") or "")[-1500:])
    if kurulum["durum"] == "kuruldu":
        b.olay(AJAN_DOGRULAYICI, "Sandbox", f"Projenin bağımlılıkları kuruldu ({kurulum.get('sure_sn')} sn).", 1)
    baslangic: Durum = {"tur": 1, "hizli_duzeltme": 0, "ilerlemesiz": 0, "dosyalar": {}, "olasi_hatalar": {}, "reddedilenler": [],
                        "yazim_sorunlari": {}, "reddedilen_toplam": 0, "duzeltme_hatalari": [], "turlar": [], "karar": "devam"}
    if not b.test_edilebilirler():
        baslangic.update(karar="bitir", bitis_nedeni="Test edilebilir birim bulunamadı.")
    return baslangic


def planla(b: Baglam, durum: Durum) -> Durum:
    b.kontrol()
    konusma = b.istemci.konusma(AJAN_PLANLAYICI, istemler.PLANLAYICI_SISTEM, [PLAN_ARACI], tur=1)
    yanit = konusma.gonder(istemler.planlayici_mesaji(b.secim, b.harita, b.en_fazla_tur), zorunlu=["save_plan"])
    cagri = next((c for c in yanit.arac_cagrilari if c.ad == "save_plan"), None)
    edilebilir = {x["id"]: x for x in b.test_edilebilirler()}
    birimler, gorulen = [], set()
    for oge in ((cagri.argumanlar.get("units") if cagri else None) or []):
        if not isinstance(oge, dict):
            continue
        birim = _birim_bul(b, str(oge.get("unit", "")))
        if birim is None or birim["id"] not in edilebilir or birim["id"] in gorulen:
            continue
        gorulen.add(birim["id"])
        senaryolar = [str(s).strip()[:300] for s in (oge.get("scenarios") or []) if str(s).strip()][:EN_FAZLA_SENARYO]
        oncelik = oge.get("priority") if isinstance(oge.get("priority"), int) else 2
        birimler.append({"unit": birim["id"], "priority": min(max(oncelik, 1), 3), "scenarios": senaryolar})
    yedek = not birimler
    eklenen = []
    if birimler and len(edilebilir) <= PLAN_TAMAMLAMA_SINIRI:
        # Ajan projenin tamamını test eder: Planlayıcı'nın atladığı birimler belgelerine göre plana eklenir
        for x in edilebilir.values():
            if x["id"] not in gorulen:
                belge = " ".join((x.get("belge") or "").split())[:200]
                birimler.append({"unit": x["id"], "priority": 3, "eklendi": True,
                                 "scenarios": [f"Belge metnindeki her davranışı ayrı bir testle doğrula: {belge}" if belge
                                               else "olağan durum, her dal ve her hata yolu"]})
                eklenen.append(x["id"])
    if yedek:
        # Plan gelmediyse riske göre bütün test edilebilir birimler (ajan yine de test yazabilsin)
        for x in sorted(edilebilir.values(), key=lambda x: -x.get("risk_puani", 0)):
            birimler.append({"unit": x["id"], "priority": 1 if x.get("risk") == "yuksek" else 2,
                             "scenarios": ["olağan durum", "her dalın iki yolu", "her hata yolu"]})
    birimler.sort(key=lambda p: p["priority"])
    arg = cagri.argumanlar if cagri else {}
    plan = {"units": birimler, "order_note": str(arg.get("order_note") or "")[:400], "setup_note": str(arg.get("setup_note") or "")[:600],
            "yedek": yedek, "eklenen": eklenen}
    odak = istemler.ALAN_ODAK.get(b.secim.get("alan") or "genel", istemler.ALAN_ODAK["genel"])
    senaryo = sum(len(p["scenarios"]) for p in birimler)
    b.olay(AJAN_PLANLAYICI, "LLM", f"Test planı hazır: {len(birimler)} birim, {senaryo} senaryo. Odak: {', '.join(odak[:2])}."
           + (f" Planlayıcı'nın atladığı {len(eklenen)} birim belgelerine göre eklendi." if eklenen else "")
           + (" (Planlayıcı plan döndürmedi; riske göre varsayılan plan kullanıldı.)" if yedek else ""), 1)
    return {"plan": plan}


def yaz(b: Baglam, durum: Durum) -> Durum:
    b.kontrol()
    tur, hizli = durum["tur"], durum.get("hizli_duzeltme", 0)
    dosyalar = dict(durum.get("dosyalar") or {})
    olasi_hatalar = {k: dict(v) for k, v in (durum.get("olasi_hatalar") or {}).items()}
    duzeltme = durum.get("duzeltme_hatalari") or []
    ice_aktarma = istemler.ice_aktarma_ozeti(b.harita)
    onceki_test = sum(len(test_adlari(i)) for i in dosyalar.values())
    try:
        if duzeltme:
            konusma = b.istemci.konusma(AJAN_YAZICI, istemler.yazici_sistemi(b.harita, kaynak_araci=False), [YAZMA_ARACI], tur=tur)
            yanit = konusma.gonder(istemler.duzeltme_mesaji(duzeltme, dosyalar, ice_aktarma), zorunlu=["write_tests"])
        else:
            kaynaklar, _, eksik = istemler.kaynak_paketi(b.kaynak, b.harita, _kaynak_birimleri(b, durum))
            # Bütün kaynak istemde varsa get_source verilmez: ajan istek harcamadan doğrudan yazar
            araclar = [KAYNAK_ARACI, YAZMA_ARACI] if eksik else [YAZMA_ARACI]
            dogrulama = durum.get("dogrulama") or {}
            sorunlar = durum.get("yazim_sorunlari") or {}
            reddedilen_metni = _reddedilen_metni(durum.get("reddedilenler") or [], sorunlar.get("dosya_retleri", []),
                                                 sorunlar.get("gecersiz_yol", []), sorunlar.get("kilit_geri_alinan", []),
                                                 sorunlar.get("kalan_geri_alinan", []))
            geri_bildirim = "\n".join(x for x in (dogrulama.get("geri_bildirim"), reddedilen_metni) if x)
            mesaj = istemler.yazici_mesaji(
                tur=tur, en_fazla_tur=b.en_fazla_tur, profil=istemler.profil_metni(b.secim, b.harita),
                plan=istemler.plan_metni(durum.get("plan") or {}), ice_aktarma=ice_aktarma, kaynaklar=kaynaklar,
                dosyalar=dosyalar if tur > 1 else {}, geri_bildirim=geri_bildirim if tur > 1 else None,
            )
            konusma = b.istemci.konusma(AJAN_YAZICI, istemler.yazici_sistemi(b.harita, kaynak_araci=bool(eksik)), araclar, tur=tur)
            yanit = konusma.gonder(mesaj, zorunlu=[] if eksik else ["write_tests"])
        kalanlar = set((durum.get("dogrulama") or {}).get("cozulmemis", {}))
        sonuc, hizli = _yazici_konusmasi(b, konusma, yanit, dosyalar, olasi_hatalar, tur, hizli, kalanlar)
    except LLMHatasi as hata:
        # Kota, tavan ya da model hatası: o ana kadarki testlerle rapora geç
        log.info("Test Yazıcı durdu: %s", hata)
        b.olay(AJAN_YAZICI, f"LLM · Tur {tur}", f"Test yazımı durdu: {hata}", tur)
        return {"karar": "bitir", "bitis_nedeni": str(hata)}

    test_sayisi = sum(len(test_adlari(i)) for i in dosyalar.values())
    reddedilen = sonuc["reddedilenler"]
    ek = []
    if sonuc["yeni_olasi_hata"]:
        ek.append(f"{len(sonuc['yeni_olasi_hata'])} test Olası Hata olarak işaretlendi.")
    if reddedilen:
        ek.append(f"{len(reddedilen)} test hile denetiminden geçmedi ve çıkarıldı.")
    if sonuc["hizli_sozdizimi"]:
        ek.append(f"Sözdizimi hatası için {sonuc['hizli_sozdizimi']} hızlı düzeltme yapıldı.")
    if sonuc["kilit_geri_alinan"]:
        ek.append(f"Olası Hata işaretli {len(sonuc['kilit_geri_alinan'])} test değiştirildiği için eski hâline döndürüldü.")
    if sonuc["geri_cekilen"]:
        ek.append(f"{len(sonuc['geri_cekilen'])} Olası Hata işareti gerekçesiyle geri çekildi.")
    if sonuc["kalan_geri_alinan"]:
        ek.append(f"Gerekçesiz değiştirilen {len(sonuc['kalan_geri_alinan'])} kalan test eski hâline döndürüldü.")
    if sonuc["duzeltilen"]:
        ek.append(f"{len(sonuc['duzeltilen'])} kalan test gerekçesiyle düzeltildi.")
    if not sonuc["yazildi"]:
        ek.append("Ajan dosya kaydetmedi.")
    if duzeltme:
        mesaj = f"Hızlı düzeltme: {', '.join(sorted(set(sonuc['yazilan']))) or 'dosya değişmedi'}."
    elif tur == 1:
        mesaj = f"pytest ile {test_sayisi} test yazıldı ({len(dosyalar)} dosya)."
    else:
        fark = test_sayisi - onceki_test
        mesaj = f"{len(set(sonuc['yazilan']))} dosya güncellendi; toplam {test_sayisi} test ({'+' if fark >= 0 else ''}{fark})."
    b.olay(AJAN_YAZICI, f"LLM · Tur {tur}", " ".join([mesaj, *ek]), tur)
    return {
        "dosyalar": dosyalar,
        "olasi_hatalar": olasi_hatalar,
        # Bir sonraki turun istemine girer; hızlı düzeltmede aynı turun önceki retleri korunur
        "reddedilenler": ((durum.get("reddedilenler") or []) if duzeltme else []) + reddedilen,
        "yazim_sorunlari": {
            alan: (((durum.get("yazim_sorunlari") or {}).get(alan, []) if duzeltme else []) + sonuc[alan])
            for alan in ("dosya_retleri", "gecersiz_yol", "kilit_geri_alinan", "kalan_geri_alinan")
        },
        "geri_cekilenler": (durum.get("geri_cekilenler") or []) + sonuc["geri_cekilen"],
        "duzeltilenler": (durum.get("duzeltilenler") or []) + sonuc["duzeltilen"],
        "geri_alinan_toplam": durum.get("geri_alinan_toplam", 0) + len(sonuc["kalan_geri_alinan"]) + len(sonuc["kilit_geri_alinan"]),
        "reddedilen_toplam": durum.get("reddedilen_toplam", 0) + len(reddedilen),
        "duzeltme_hatalari": [],
        "hizli_duzeltme": hizli + (1 if duzeltme else 0),
        "karar": "dogrula",
    }


def dogrula(b: Baglam, durum: Durum) -> Durum:
    b.kontrol()
    tur, hizli = durum["tur"], durum.get("hizli_duzeltme", 0)
    dosyalar = durum.get("dosyalar") or {}
    olasi_hatalar = {k: dict(v) for k, v in (durum.get("olasi_hatalar") or {}).items()}
    d = b.dogrulayici.tur(tur, dosyalar, olasi_hatalar)
    if d["durum"] == "kurulum_hatasi":
        raise KurulumHatasi("Bağımlılıklar kurulamadı.")
    for k in d["olasi_hata_gecen"]:
        olasi_hatalar.pop(k, None)

    # Hızlı düzeltme: bazı dosyalar hiç yüklenemediyse ya da pytest başlayamadıysa (tur sayacından düşmez)
    if (d["toplama"] or d["baslatma_hatasi"]) and hizli < b.hizli_duzeltme_siniri:
        hatalar = d["toplama"] or [{"dosya": "tests/conftest.py" if "tests/conftest.py" in dosyalar else "(bütün dosyalar)",
                                     "mesaj": d["baslatma_hatasi"]}]
        b.olay(AJAN_DOGRULAYICI, f"Sandbox · Tur {tur}",
               f"{len(hatalar)} test dosyası yüklenemedi ({', '.join(h['dosya'] for h in hatalar)}); hızlı düzeltme isteniyor.", tur)
        return {"karar": "duzelt", "duzeltme_hatalari": hatalar, "olasi_hatalar": olasi_hatalar}

    kapsama = d["kapsama"] or {}
    yuzde = kapsama.get("testEdilebilir", 0.0)
    gecti = d["testler"]["gecti"]
    cozulmemis = len(d["cozulmemis"])
    turlar = list(durum.get("turlar") or [])
    onceki = turlar[-1] if turlar else None
    dal = kapsama.get("dal") or 0
    ilerleme = (onceki is None or yuzde > onceki["kapsama"] or dal > (onceki["dal"] or 0)
                or gecti > onceki["gecti"] or cozulmemis < onceki["cozulmemis"])
    ilerlemesiz = 0 if ilerleme else durum.get("ilerlemesiz", 0) + 1
    turlar.append({
        "tur": tur,
        "testler": d["testler"],
        "kapsama": yuzde,
        "kapsama_toplam": kapsama.get("toplam", 0.0),
        "dal": kapsama.get("dal"),
        "gecti": gecti,
        "olasi_hata": len(d["olasi_hata_kalan"]),
        "cozulmemis": cozulmemis,
        "reddedilen": len(durum.get("reddedilenler") or []),
        "hizli_duzeltme": hizli,
        "standardizasyon": d["standardizasyon"],
        "token_toplam": b.istemci.harcanan,
    })
    b.metrik.update(coverage=round(yuzde), passed=gecti, bugs=len(d["olasi_hata_kalan"]))

    # Karar (K6)
    karar, neden = "devam", None
    if b.istemci.harcanan >= b.istemci.token_tavani:
        karar, neden = "bitir", "Token tavanı doldu."
    elif yuzde >= 100 and (kapsama.get("dal") in (None, 100, 100.0)) and not cozulmemis:
        karar, neden = "bitir", "Test edilebilir kodun tamamı kapsandı."
    elif tur >= b.en_fazla_tur:
        karar, neden = "bitir", f"{b.en_fazla_tur} tur tamamlandı."
    elif ilerlemesiz >= 2:
        karar, neden = "bitir", "2 tur üst üste ilerleme olmadı (erken durma)."

    testler = d["testler"]
    mesaj = f"{testler['gecti']}/{testler['toplam']} test geçti, kapsama %{yuzde:g}."
    if d["olasi_hata_kalan"]:
        mesaj += f" {len(d['olasi_hata_kalan'])} olası hata."
    if cozulmemis:
        mesaj += f" {cozulmemis} test kaldı."
    if d["toplama"]:
        mesaj += f" {len(d['toplama'])} test dosyası yüklenemedi."
    if neden:
        mesaj += f" {neden}"
    b.olay(AJAN_DOGRULAYICI, f"Sandbox · Tur {tur}", mesaj, tur)

    gb = {"geri_bildirim": d["geri_bildirim"], "cozulmemis": d["cozulmemis"], "kapsama": kapsama,
          "eksik_birimler": d.get("eksik_birimler", [])}
    guncelleme: Durum = {"dogrulama": gb, "turlar": turlar, "olasi_hatalar": olasi_hatalar, "ilerlemesiz": ilerlemesiz, "karar": karar}
    if karar == "devam":
        guncelleme.update(tur=tur + 1, hizli_duzeltme=0)
    else:
        guncelleme["bitis_nedeni"] = neden
    return guncelleme


def son(b: Baglam, durum: Durum) -> Durum:
    b.kontrol()
    dosyalar = durum.get("dosyalar") or {}
    if not dosyalar:
        return {"son": None}
    olasi_hatalar = durum.get("olasi_hatalar") or {}
    cozulmemis = dict((durum.get("dogrulama") or {}).get("cozulmemis", {}))
    s = b.dogrulayici.son(dosyalar, olasi_hatalar, cozulmemis)
    kapsama = s["kapsama"] or {}
    vaka = s["vaka"]
    gecen = sum(vaka.get(k, 1) for k in s["gecen"])
    b.metrik.update(coverage=round(kapsama.get("testEdilebilir", 0)), passed=gecen, bugs=len(s["olasi_hata"]))
    parca = [f"Son test seti 3 kez çalıştırıldı: {gecen} test kararlı geçti"]
    if s["kararsiz"]:
        parca.append(f"{len(s['kararsiz'])} kararsız test çıkarıldı")
    if s["cozulmemis_cikarilan"]:
        parca.append(f"{len(s['cozulmemis_cikarilan'])} düzeltilemeyen test çıkarıldı")
    parca.append(f"{len(s['olasi_hata'])} olası hata")
    mesaj = ", ".join(parca) + (f". Son kapsama %{kapsama['testEdilebilir']:g}." if kapsama else ".")
    if not s["dogrulandi"]:
        mesaj = "Son doğrulama çalıştırılamadı (sandbox sonuç üretmedi); son turun sonuçları kullanılıyor."
    b.olay(AJAN_DOGRULAYICI, "Sandbox", mesaj, durum.get("tur", 1))
    return {"son": s}


# ── Graf ─────────────────────────────────────────────────────────────────

def graf_kur(b: Baglam):
    g = StateGraph(Durum)
    g.add_node("analiz", lambda d: analiz(b, d))
    g.add_node("planla", lambda d: planla(b, d))
    g.add_node("yaz", lambda d: yaz(b, d))
    g.add_node("dogrula", lambda d: dogrula(b, d))
    g.add_node("son", lambda d: son(b, d))
    g.add_edge(START, "analiz")
    g.add_conditional_edges("analiz", lambda d: "son" if d.get("karar") == "bitir" else "planla", {"planla": "planla", "son": "son"})
    g.add_edge("planla", "yaz")
    g.add_conditional_edges("yaz", lambda d: "son" if d.get("karar") == "bitir" else "dogrula", {"dogrula": "dogrula", "son": "son"})
    g.add_conditional_edges("dogrula", lambda d: "son" if d.get("karar") == "bitir" else "yaz", {"yaz": "yaz", "son": "son"})
    g.add_edge("son", END)
    return g.compile()
