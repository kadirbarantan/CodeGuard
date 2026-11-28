"""Sandbox'ı siteden ve veritabanından bağımsız denemek için.

backend klasöründe, .venv açıkken ve Docker Desktop çalışırken:

    python araclar/sandbox_dene.py ornekler/blog-api ornekler/blog-api-referans-testler
    python araclar/sandbox_dene.py ornekler/blog-api sandbox/python/guvenlik-testleri
    python araclar/sandbox_dene.py ornekler/blog-api ornekler/blog-api-referans-testler --geri-bildirim

İlk argüman test edilecek proje, ikincisi testlerin klasörü. Betik projenin bağımlılıklarını kurar,
testleri ağı kapalı bir kapsayıcıda çalıştırır ve sonucu yazar: kaç test geçti / kaldı, kapsama,
kapsanmayan satırlar. --json ile özetin tamamını JSON olarak verir.
--geri-bildirim: sonucu Kod Haritası'yla birleştirip ajanın bir sonraki turda göreceği metni yazar
(K4 "Doğrula") ve ham çıktıyla boyutunu karşılaştırır (token tasarrufu, K12).
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))  # backend/ klasörü

from app.analiz.geri_bildirim import geri_bildirim_metni, kapsama_geri_bildirimi  # noqa: E402
from app.analiz.kod_haritasi import harita_cikar  # noqa: E402
from app.motor.sandbox import SandboxHatasi, Sinirlar, calistir  # noqa: E402

DURUM_METNI = {
    "tamam": "testler çalıştı",
    "kurulum_hatasi": "KURULUM HATASI (bağımlılıklar kurulamadı)",
    "zaman_asimi": "ZAMAN AŞIMI (süre doldu, kapsayıcı durduruldu)",
    "bellek_asimi": "BELLEK AŞIMI (kapsayıcı bellek sınırını aştı)",
    "calisma_hatasi": "ÇALIŞMA HATASI (test aracı sonuç üretemedi)",
}


def yazdir(sonuc: dict) -> None:
    kurulum = sonuc["kurulum"] or {}
    if kurulum.get("durum") == "gerek_yok":
        print("Kurulum: gerek yok (requirements.txt / pyproject.toml yok)")
    elif kurulum:
        print(f"Kurulum: {kurulum['durum']} ({kurulum.get('sure_sn')} sn)")
    print(f"Durum: {DURUM_METNI.get(sonuc['durum'], sonuc['durum'])}", end="")
    print(f" ({sonuc['test']['sure_sn']} sn)" if sonuc.get("test") else "")

    ozet = sonuc.get("ozet") or {}
    testler, kapsama = ozet.get("testler"), ozet.get("kapsama")
    if testler:
        print(
            f"\nTestler: {testler['toplam']} test, {testler['gecti']} geçti, {testler['kaldi']} kaldı"
            + (f", {testler['hata']} hata" if testler["hata"] else "")
            + (f", {testler['atlandi']} atlandı" if testler["atlandi"] else "")
        )
        for test in testler["basarisizlar"]:
            print(f"  {test['durum'].upper():6} {test['ad']}")
            if test["mesaj"]:
                print(f"         {test['mesaj'].splitlines()[0]}")
    if kapsama and kapsama["satir"]["kapsanan"] == 0:
        print("\nKapsama: %0 (testler projenin kodunu hiç çalıştırmadı)")
    elif kapsama:
        print(f"\nKapsama: satır %{kapsama['satir_yuzde']}, dal %{kapsama['dal_yuzde']}")
        for dosya in kapsama["dosyalar"]:
            eksik = []
            if dosya["kapsanmayan_satirlar"]:
                eksik.append("kapsanmayan satırlar " + ", ".join(map(str, dosya["kapsanmayan_satirlar"])))
            if dosya["eksik_dallar"]:
                eksik.append("eksik dallar " + ", ".join(str(d["satir"]) for d in dosya["eksik_dallar"]))
            if eksik:
                print(f"  {dosya['yol']}: {'; '.join(eksik)}")

    if sonuc["durum"] != "tamam":
        gunluk = (sonuc.get("test") or sonuc.get("kurulum") or {}).get("gunluk_sonu")
        if gunluk:
            print("\nKapsayıcı günlüğünün sonu:\n" + gunluk[-1500:])
    print(f"\nHam çıktılar: {sonuc['cikti_klasoru']}")


def geri_bildirim_yazdir(kaynak: str, sonuc: dict) -> None:
    gb = kapsama_geri_bildirimi(harita_cikar(kaynak), sonuc["ozet"])
    metin = geri_bildirim_metni(gb)
    cikti = Path(sonuc["cikti_klasoru"])
    ham = sum(len(p.read_text(encoding="utf-8", errors="replace")) for p in (cikti / "junit.xml", cikti / "kapsama.xml") if p.is_file())
    print("\n── Ajan için geri bildirim (Kod Haritası + kapsama) ──")
    print(metin)
    print(
        f"\nBoyut: ham test çıktısı {ham} karakter (~{round(ham / 4)} token), "
        f"geri bildirim {len(metin)} karakter (~{round(len(metin) / 4)} token)"
    )


def main() -> int:
    ayristirici = argparse.ArgumentParser(description="Sandbox'ı bir proje ve test klasörüyle dener.")
    ayristirici.add_argument("kaynak", help="test edilecek projenin klasörü")
    ayristirici.add_argument("testler", help="çalıştırılacak testlerin klasörü")
    ayristirici.add_argument("--cikti", help="ham sonuç dosyalarının klasörü (verilmezse geçici klasör)")
    ayristirici.add_argument("--sure", type=int, default=60, help="test aşamasının en fazla süresi, sn (varsayılan 60)")
    ayristirici.add_argument("--json", action="store_true", help="özetin tamamını JSON olarak yaz")
    ayristirici.add_argument("--geri-bildirim", action="store_true", help="ajanın göreceği geri bildirimi de yaz")
    # Yalnızca bulut testinde gerekti (kapsayıcılar köprü ağından dışarı çıkamıyordu)
    ayristirici.add_argument("--kurulum-agi", default="bridge", help=argparse.SUPPRESS)
    secenek = ayristirici.parse_args()

    try:
        sonuc = calistir(
            secenek.kaynak,
            secenek.testler,
            secenek.cikti,
            sinirlar=Sinirlar(test_sure_sn=secenek.sure),
            kurulum_agi=secenek.kurulum_agi,
        )
    except SandboxHatasi as hata:
        print(f"Sandbox başlatılamadı: {hata}", file=sys.stderr)
        return 2

    if secenek.json:
        print(json.dumps(sonuc, ensure_ascii=False, indent=2))
    else:
        yazdir(sonuc)
    if secenek.geri_bildirim and sonuc.get("ozet"):
        geri_bildirim_yazdir(secenek.kaynak, sonuc)
    return 0 if sonuc["durum"] == "tamam" else 1


if __name__ == "__main__":
    sys.exit(main())
