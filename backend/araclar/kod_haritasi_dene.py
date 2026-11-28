"""Kod Haritası'nı siteden ve Docker'dan bağımsız denemek için (backend klasöründe, .venv açıkken):

    python araclar/kod_haritasi_dene.py ornekler/blog-api
    python araclar/kod_haritasi_dene.py ornekler/blog-api --ajan
    python araclar/kod_haritasi_dene.py ornekler/blog-api --birim app/posts.py::create_post
    python araclar/kod_haritasi_dene.py ornekler/blog-api --json

Seçeneksiz: özet ve birim listesi (risk, dal, hata yolu).
--ajan:  Planlayıcı ajanın göreceği kısa metin ve kaynak koda göre boyut karşılaştırması.
--birim: bir birimin kaynağı (ajanın get_source aracı).
--json:  haritanın tamamı.
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))  # backend/ klasörü

from app.analiz.kod_haritasi import HaritaHatasi, birim_kaynagi, harita_cikar, harita_metni  # noqa: E402

RISK = {"yuksek": "yüksek", "orta": "orta", "dusuk": "düşük"}


def _token(karakter: int) -> int:
    return round(karakter / 4)  # kaba tahmin: ~4 karakter ≈ 1 token


def yazdir(harita: dict) -> None:
    o = harita["ozet"]
    print(
        f"{o['dosya']} dosya, {o['birim']} birim ({o['fonksiyon_ve_metot']} fonksiyon/metot), "
        f"{o['dal']} dal, {o['hata_yolu']} hata yolu"
    )
    print(f"Risk: {o['risk']['yuksek']} yüksek, {o['risk']['orta']} orta, {o['risk']['dusuk']} düşük")
    if o["test_edilemeyen"]:
        print(f"Test edilemeyen (motor bağımlı, K1): {o['test_edilemeyen']}")
    if o["dis_moduller"]:
        print(f"Kullanılan dış modüller: {', '.join(o['dis_moduller'])}")
    birimler = {b["id"]: b for b in harita["birimler"]}
    for dosya in harita["dosyalar"]:
        islevler = [birimler[i] for i in dosya["birimler"] if birimler[i]["tur"] != "sinif"]
        if not islevler:
            continue
        print(f"\n{dosya['yol']}" + ("  (SÖZDİZİMİ HATASI VAR)" if dosya["sozdizimi_hatasi"] else ""))
        for b in islevler:
            print(
                f"  {b['tam_ad']:30} satır {b['satirlar'][0]:>3}-{b['satirlar'][1]:<3} "
                f"risk {RISK[b['risk']]:7} {len(b['dallar'])} dal, {len(b['hata_yollari'])} hata yolu"
                + ("" if b["test_edilebilir"] else "  TEST EDİLEMEZ")
            )
    if harita["diger_dil"]:
        print(f"\nBirim analizine girmeyen {len(harita['diger_dil'])} dosya (başka dil): "
              + ", ".join(d["yol"] for d in harita["diger_dil"][:8]) + (" …" if len(harita["diger_dil"]) > 8 else ""))


def main() -> int:
    ayristirici = argparse.ArgumentParser(description="Bir projenin Kod Haritası'nı çıkarır.")
    ayristirici.add_argument("kaynak", help="projenin klasörü")
    ayristirici.add_argument("--json", action="store_true", help="haritanın tamamını JSON olarak yaz")
    ayristirici.add_argument("--ajan", action="store_true", help="Planlayıcı ajanın göreceği metni yaz")
    ayristirici.add_argument("--birim", help="bu birimin kaynağını yaz (ör. app/posts.py::create_post)")
    secenek = ayristirici.parse_args()

    try:
        harita = harita_cikar(secenek.kaynak)
        if secenek.birim:
            print(birim_kaynagi(secenek.kaynak, harita, secenek.birim))
            return 0
    except HaritaHatasi as hata:
        print(f"Kod Haritası çıkarılamadı: {hata}", file=sys.stderr)
        return 2

    if secenek.json:
        print(json.dumps(harita, ensure_ascii=False, indent=2))
    elif secenek.ajan:
        metin = harita_metni(harita)
        kok = Path(secenek.kaynak)
        kaynak = sum(len((kok / d["yol"]).read_text(encoding="utf-8", errors="replace")) for d in harita["dosyalar"] if d["hedef"])
        print(metin)
        print(
            f"\nBoyut: kaynak kod {kaynak} karakter (~{_token(kaynak)} token), "
            f"harita metni {len(metin)} karakter (~{_token(len(metin))} token)"
        )
    else:
        yazdir(harita)
    return 0


if __name__ == "__main__":
    sys.exit(main())
