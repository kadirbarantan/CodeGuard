"""Standardizasyon Katmanı, kod kolu: ilk parça (Faz 3, belge 18 adım 9'un başlangıcı).

Test araçlarının ham çıktılarını kısa ve dilden bağımsız bir özete çevirir. Ajan ham günlüğü değil
bu özeti görür; böylece token harcanmaz ve ajan önemli bilgiyi kaçırmaz (K1, K9).

Okunan biçimler bilinçli olarak ortak biçimlerdir:
- JUnit XML: pytest, jest, xunit / dotnet test, phpunit üretebilir.
- Cobertura XML: coverage.py, istanbul, coverlet, phpunit üretebilir.
Yani her dil için ayrı okuyucu gerekmez.

Sonraki adım: kapsanmayan satırları Kod Haritası'ndaki birimlerle ve dallarla eşleştirmek (K4),
ham ve özet boyutunu karşılaştırıp token tasarrufunu loglamak (K12).
"""
from __future__ import annotations

import xml.etree.ElementTree as ET
from pathlib import Path

# Kullanıcı kodu bu dosyaların yazıldığı kapsayıcıda çalıştığı için dosyalar güvenilir sayılmaz:
# aşırı büyük dosya okunmaz, metinler kısaltılır.
EN_FAZLA_DOSYA_BAYT = 20 * 1024 * 1024
EN_FAZLA_MESAJ = 400


def _xml_oku(yol: Path):
    if not yol.is_file():
        return None
    if yol.stat().st_size > EN_FAZLA_DOSYA_BAYT:
        raise ValueError(f"{yol.name} çok büyük, okunmadı")
    return ET.parse(yol).getroot()


def _kisalt(metin: str | None) -> str:
    metin = (metin or "").strip()
    return metin if len(metin) <= EN_FAZLA_MESAJ else metin[:EN_FAZLA_MESAJ] + "…"


def _hata_satiri(metin: str | None) -> str:
    """pytest çıktısında asıl hata "E   " ile başlayan son satırdadır; yoksa son dolu satır."""
    satirlar = [s.strip() for s in (metin or "").splitlines() if s.strip()]
    e_satirlari = [s[1:].strip() for s in satirlar if s.startswith("E ")]
    if e_satirlari:
        return e_satirlari[-1]
    return satirlar[-1] if satirlar else ""


def junit_oku(yol: Path) -> dict | None:
    """JUnit XML'den test sonuçları.

    Durumlar: gecti, kaldi (beklenen davranış görülmedi), hata (test kodu ya da hazırlığı bozuk),
    atlandi. Dosya yoksa None (testler hiç çalışamadı).
    """
    kok = _xml_oku(Path(yol))
    if kok is None:
        return None
    testler = []
    for vaka in kok.iter("testcase"):
        durum, mesaj = "gecti", ""
        for etiket, karsilik in (("failure", "kaldi"), ("error", "hata"), ("skipped", "atlandi")):
            alt = vaka.find(etiket)
            if alt is not None:
                durum = karsilik
                mesaj = alt.get("message") or ""
                # "collection failure" gibi genel mesajlarda asıl nedeni ayrıntıdan al
                if durum == "hata" or not mesaj:
                    mesaj = _hata_satiri(alt.text) or mesaj
                break
        sinif = vaka.get("classname", "")
        testler.append({
            "ad": f"{sinif}::{vaka.get('name', '')}" if sinif else vaka.get("name", ""),
            "durum": durum,
            "mesaj": _kisalt(mesaj),
            "sure_sn": round(float(vaka.get("time") or 0), 3),
        })
    sayilar = {d: sum(1 for t in testler if t["durum"] == d) for d in ("gecti", "kaldi", "hata", "atlandi")}
    return {
        "toplam": len(testler),
        **sayilar,
        "basarisizlar": [t for t in testler if t["durum"] in ("kaldi", "hata")],
        "testler": testler,
    }


def cobertura_oku(yol: Path) -> dict | None:
    """Cobertura XML'den satır ve dal kapsaması; dosya başına kapsanmayan satırlar ve eksik dallar."""
    kok = _xml_oku(Path(yol))
    if kok is None:
        return None

    def yuzde(oran):
        return round(float(oran or 0) * 100, 1)

    dosyalar = []
    for sinif in kok.iter("class"):
        kapsanmayan, eksik_dallar = [], []
        for satir in sinif.iter("line"):
            no = int(satir.get("number"))
            if int(satir.get("hits") or 0) == 0:
                kapsanmayan.append(no)
            elif satir.get("branch") == "true" and not (satir.get("condition-coverage") or "").startswith("100%"):
                eksik_dallar.append({
                    "satir": no,
                    "kapsama": satir.get("condition-coverage", ""),
                    "gidilmeyen": satir.get("missing-branches", ""),
                })
        dosyalar.append({
            "yol": sinif.get("filename"),
            "satir_yuzde": yuzde(sinif.get("line-rate")),
            "dal_yuzde": yuzde(sinif.get("branch-rate")),
            "kapsanmayan_satirlar": sorted(kapsanmayan),
            "eksik_dallar": eksik_dallar,
        })
    return {
        "satir_yuzde": yuzde(kok.get("line-rate")),
        "dal_yuzde": yuzde(kok.get("branch-rate")),
        "satir": {"kapsanan": int(kok.get("lines-covered") or 0), "toplam": int(kok.get("lines-valid") or 0)},
        "dal": {"kapsanan": int(kok.get("branches-covered") or 0), "toplam": int(kok.get("branches-valid") or 0)},
        "dosyalar": sorted(dosyalar, key=lambda d: d["yol"] or ""),
    }


def ozetle(cikti_klasoru: Path) -> dict:
    """Bir sandbox çalıştırmasının çıktı klasöründen ortak özet: {"testler": ..., "kapsama": ...}."""
    klasor = Path(cikti_klasoru)
    return {
        "testler": junit_oku(klasor / "junit.xml"),
        "kapsama": cobertura_oku(klasor / "kapsama.xml"),
    }
