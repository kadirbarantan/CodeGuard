"""Rapor: frontend/src/services/api.js'teki getReport'un Python karşılığı (mock raporlar, seçime göre süzülür).

Tek test grubu seçildiyse o grubun raporu döner; birden fazlaysa birleşik rapor:
    { ...seçim, runId, tur: [...], turSayisi, parcalar: [{ id: "kod" | "ux" | "erisim", ad, rapor }] }
"""
import copy

from app.sahte_motor import ORNEK, STRATEJI

TURLER = STRATEJI["TURLER"]
# Rapora seçimden kopyalanan alanlar (api.js ile aynı)
SECIM_ALANLARI = ("proje", "alan", "dil", "tur", "digerMetin", "kaynak", "url")


def _kod_raporu(secim: dict, run_id: str) -> dict:
    r = copy.deepcopy(ORNEK["rapor"])
    dosyalar = r.pop("dosyalar")
    if secim["kaynak"] == "url":
        # URL ile test: kaynak kod yok; birim sonuçları ve Kod sekmesi rapora girmez
        return {
            **r,
            **secim,
            "coverage": None,
            "testSayisi": {**r["testSayisi"], "birim": 0},
            "olasiHatalar": [h for h in r["olasiHatalar"] if h.get("tur") != "birim"],
            "testDosyalari": [t for t in r["testDosyalari"] if t.get("tur") != "birim"],
            "runId": run_id,
            "kaliteSkoru": None,
            "dosyalar": [],
        }
    sonuc = {**r, **secim, "runId": run_id, "kaliteSkoru": None}
    if "arayuz" not in secim["tur"]:
        sonuc["testSayisi"] = {**r["testSayisi"], "arayuz": 0}
        sonuc["olasiHatalar"] = [h for h in r["olasiHatalar"] if h.get("tur") != "arayuz"]
        sonuc["testDosyalari"] = [t for t in r["testDosyalari"] if t.get("tur") != "arayuz"]
    # Dosya içerikleri raporla gönderilmez (GET /runs/{id}/dosya ile istenir)
    sonuc["dosyalar"] = [{k: v for k, v in d.items() if k != "kod"} for d in dosyalar]
    sonuc["kodYorumu"] = copy.deepcopy(ORNEK["kodYorumu"])
    return sonuc


def _erisim_raporu(secim: dict, run_id: str) -> dict:
    r = copy.deepcopy(ORNEK["erisimRapor"])
    # URL ile testte kaynak kod olmadığı için ihlaller koda bağlanmaz
    kaynaklar = ORNEK["erisimKaynaklari"].get(secim.get("dil") or "python") if secim["kaynak"] != "url" else None
    if kaynaklar:
        for ihlal, kaynak in zip(r["ihlaller"], kaynaklar):
            if kaynak:
                ihlal["kaynak"] = kaynak
    return {**r, **secim, "runId": run_id}


def rapor_olustur(secim: dict, run_id: str, proje: str, tarih: str) -> dict:
    # api.js gibi boş (null) alanlar kopyalanmaz
    s = {k: secim[k] for k in SECIM_ALANLARI if secim.get(k) is not None and k != "proje"}
    s["proje"] = proje
    turler = secim["tur"]
    parcalar = []
    kod_turleri = [t for t in turler if t in ("birim", "arayuz")]
    if kod_turleri:
        ad = " + ".join(TURLER[t] for t in kod_turleri)
        parcalar.append({"id": "kod", "ad": ad, "rapor": _kod_raporu({**s, "tur": kod_turleri}, run_id)})
    if "kullanilabilirlik" in turler:
        parcalar.append({"id": "ux", "ad": "Kullanılabilirlik", "rapor": {**copy.deepcopy(ORNEK["uxRapor"]), **s, "tur": ["kullanilabilirlik"], "runId": run_id}})
    if "erisilebilirlik" in turler:
        parcalar.append({"id": "erisim", "ad": "Erişilebilirlik", "rapor": _erisim_raporu({**s, "tur": ["erisilebilirlik"]}, run_id)})
    for p in parcalar:
        p["rapor"]["tarih"] = tarih

    if len(parcalar) == 1:
        return parcalar[0]["rapor"]
    kod = next((p for p in parcalar if p["id"] == "kod"), None)
    return {**s, "runId": run_id, "tur": turler, "tarih": tarih, "turSayisi": kod["rapor"].get("turSayisi") if kod else None, "parcalar": parcalar}


def gecmis_ozeti(rapor: dict) -> dict:
    """Geçmiş Testlerim listesindeki skorlar: { coverage, uxSkor, erisimSkor }."""
    parcalar = rapor.get("parcalar") or [{"id": _parca_id(rapor), "rapor": rapor}]
    ozet = {"coverage": None, "uxSkor": None, "erisimSkor": None}
    for p in parcalar:
        r = p["rapor"]
        if p["id"] == "kod" and r.get("coverage"):
            ozet["coverage"] = r["coverage"]["testEdilebilir"]
        elif p["id"] == "ux":
            ozet["uxSkor"] = r["ux"]["skor"]
        elif p["id"] == "erisim":
            ozet["erisimSkor"] = r["ozet"]["uyum"]
    return ozet


def _parca_id(rapor: dict) -> str:
    tur = rapor.get("tur") or []
    return "ux" if tur == ["kullanilabilirlik"] else "erisim" if tur == ["erisilebilirlik"] else "kod"


def dosya_kaynagi(yol: str) -> str | None:
    """Kod sekmesindeki dosyanın içeriği (mock rapordaki örnek dosyalar)."""
    return next((d.get("kod", "") for d in ORNEK["rapor"]["dosyalar"] if d["yol"] == yol), None)
