"""Birim test ajanı (Faz 4; K9'daki birim alt grafı).

    istemci = LLMIstemcisi(GeminiSaglayici(model, anahtar), dakika_istek=10, token_tavani=200_000)
    sonuc = birim_testi("ornekler/blog-api", llm=istemci, calisma="ajan-ciktilari/x/calisma", bildir=print)

Deneme betiği: araclar/ajan_dene.py. Motora (sitenin "Testi Başlat"ı) bağlanması belge 18'deki adım 11'dir:
`bildir` canlı akışa (kayit.olay_ekle), dönen sonuç da rapora çevrilecek.

Dönen sözlükte raporun birim kısmı için gerekenler var:
- kapsama, testler ve Olası Hatalar;
- test dosyaları;
- tur geçmişi;
- token kullanımı ve Standardizasyon Katmanı'nın tasarrufu (K12; kullanıcıya gösterilmez).
"""
from __future__ import annotations

import logging
import time
from pathlib import Path
from typing import Callable

from app.analiz.geri_bildirim import kapsama_geri_bildirimi
from app.analiz.kod_haritasi import HaritaHatasi, harita_cikar
from app.motor.birim.denetim import test_adlari
from app.motor.birim.dogrulayici import Dogrulayici, anahtar
from app.motor.birim.graf import Baglam, KurulumHatasi, graf_kur
from app.motor.llm import Durduruldu, LLMHatasi, LLMIstemcisi
from app.motor.sandbox import Oturum, SandboxHatasi, Sinirlar

log = logging.getLogger("codeguard.motor.birim")

__all__ = ["birim_testi"]


def birim_testi(
    kaynak: Path | str,
    *,
    llm: LLMIstemcisi,
    calisma: Path | str,
    secim: dict | None = None,
    hedefler: list[str] | None = None,
    bildir: Callable[[dict], None] | None = None,
    durdu_mu: Callable[[], bool] | None = None,
    en_fazla_tur: int = 4,
    sinirlar: Sinirlar | None = None,
    kurulum_agi: str = "bridge",
) -> dict:
    """Projenin birim testlerini ajanla üretir, sandbox'ta doğrular ve sonucu döndürür.

    kaynak    test edilecek proje klasörü (yalnızca okunur; testler ayrı klasöre yazılır)
    calisma   sandbox çalıştırmalarının klasörü (her çalıştırmanın testleri ve ham çıktıları)
    secim     sitenin seçimi: alan, digerMetin (dil şimdilik yalnızca Python)
    hedefler  yalnızca bu dosyalar test edilir (GitHub'dan seçilenler); verilmezse hepsi

    "durum": tamamlandi | kurulumHatasi | durduruldu | hata
    """
    baslangic = time.monotonic()
    olaylar: list[dict] = []

    def _bildir(olay: dict) -> None:
        olaylar.append(olay)
        if bildir:
            bildir(olay)

    secim = {"alan": "web", "dil": "python", **(secim or {})}
    try:
        harita = harita_cikar(kaynak, "python", hedefler)
        with Oturum(kaynak, sinirlar=sinirlar, kurulum_agi=kurulum_agi) as oturum:
            baglam = Baglam(
                kaynak=Path(kaynak), secim=secim, harita=harita, istemci=llm,
                dogrulayici=Dogrulayici(oturum, harita, calisma), bildir=_bildir,
                durdu_mu=durdu_mu or (lambda: False), en_fazla_tur=en_fazla_tur,
            )
            durum = graf_kur(baglam).invoke({}, config={"recursion_limit": 80})
            sonuc = _ozet(baglam, durum)
    except KurulumHatasi as hata:
        sonuc = {"durum": "kurulumHatasi", "hata": "Projenin bağımlılıkları kurulamadı.", "ayrinti": str(hata)[-1500:]}
    except Durduruldu:
        sonuc = {"durum": "durduruldu", "hata": None}
    except (LLMHatasi, SandboxHatasi, HaritaHatasi) as hata:
        sonuc = {"durum": "hata", "hata": str(hata)}
    except Exception as hata:  # noqa: BLE001 (motor hiçbir durumda çalıştırmayı askıda bırakmamalı)
        log.exception("Birim ajanında beklenmeyen hata")
        sonuc = {"durum": "hata", "hata": f"Beklenmeyen hata: {type(hata).__name__}: {hata}"}
    sonuc["token"] = llm.ozet()
    sonuc["llm_cagrilari"] = list(llm.kayitlar)
    sonuc["sure_sn"] = round(time.monotonic() - baslangic, 1)
    sonuc["olaylar"] = olaylar
    return sonuc


def _ozet(b: Baglam, durum: dict) -> dict:
    turlar = durum.get("turlar") or []
    s = durum.get("son") or {}
    olasi = durum.get("olasi_hatalar") or {}
    gecen, teyitli = set(s.get("gecen", [])), set(s.get("olasi_hata", []))
    vaka = s.get("vaka", {})

    test_dosyalari = []
    for yol, icerik in sorted((s.get("dosyalar") or {}).items()):
        adlar = [anahtar(yol, t) for t in test_adlari(icerik)]
        test_dosyalari.append({
            "yol": yol,
            "tur": "birim",
            "sayi": sum(vaka.get(a, 1) for a in adlar),
            "sonuclar": {
                "gecti": sum(vaka.get(a, 1) for a in adlar if a in gecen),
                "kaldi": sum(vaka.get(a, 1) for a in adlar if a in teyitli),
                "calistirilamadi": 0,
            },
            "kod": icerik,
        })

    kapsama = s.get("kapsama") or (durum.get("dogrulama") or {}).get("kapsama")
    kapsama_ozeti = s.get("kapsama_ozeti")
    eksikler = kapsama_geri_bildirimi(b.harita, {"testler": None, "kapsama": kapsama_ozeti})["eksikler"] if kapsama_ozeti else []
    olcumler = [t["standardizasyon"] for t in turlar if t.get("standardizasyon")]
    ham = sum(x["ham_karakter"] for x in olcumler)
    ozet = sum(x["geri_bildirim_karakter"] for x in olcumler)
    return {
        "durum": "tamamlandi",
        "hata": None,
        "bitis_nedeni": durum.get("bitis_nedeni"),
        "model": b.istemci.model,
        "tur_sayisi": len(turlar),
        "ilk_kapsama": turlar[0]["kapsama"] if turlar else None,
        "kapsama": {k: kapsama.get(k) for k in ("testEdilebilir", "toplam", "dal", "satir")} if kapsama else None,
        "dosya_kapsamalari": (kapsama or {}).get("dosyalar", []),
        "testler": {
            "toplam": sum(f["sayi"] for f in test_dosyalari),
            "gecti": sum(f["sonuclar"]["gecti"] for f in test_dosyalari),
            "olasi_hata": sum(f["sonuclar"]["kaldi"] for f in test_dosyalari),
            "kararsiz_cikarilan": len(s.get("kararsiz", [])),
            "duzeltilemeyen_cikarilan": len(s.get("cozulmemis_cikarilan", [])),
            "hile_denetimi_reddedilen": durum.get("reddedilen_toplam", 0),
        },
        "olasi_hatalar": [{a: v for a, v in olasi[k].items() if a != "kod"} for k in sorted(teyitli) if k in olasi],
        # Karar verilmeden kalıp çıkarılan testler: gizli bir hatayı gösteriyor olabilir, raporda incelenmeli
        "cikarilan_kalan_testler": s.get("cozulmemis_cikarilan", []),
        "olasi_hata_geri_cekilen": durum.get("geri_cekilenler") or [],
        # Kalan testlerden ajanın gerekçesiyle düzelttikleri ve gerekçesiz olduğu için geri alınan değişiklikler (K6)
        "duzeltilen_testler": durum.get("duzeltilenler") or [],
        "geri_alinan_degisiklik": durum.get("geri_alinan_toplam", 0),
        "test_dosyalari": test_dosyalari,
        "kapsanmayanlar": eksikler,
        "turlar": turlar,
        "standardizasyon": {
            "ham_karakter": ham,
            "geri_bildirim_karakter": ozet,
            "tasarruf_yuzde": round(100 * (1 - ozet / ham), 1) if ham else None,
        },
        "plan": durum.get("plan"),
        "harita_ozeti": b.harita["ozet"],
        "sandbox_calistirma": b.dogrulayici.calistirma_sayisi,
        "son_dogrulama": bool(s.get("dogrulandi")),
    }
