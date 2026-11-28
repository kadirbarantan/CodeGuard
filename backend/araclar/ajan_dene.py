"""Birim test ajanını (Faz 4) siteden ve veritabanından bağımsız denemek için.

backend klasöründe, .venv açıkken ve Docker Desktop çalışırken:

    python araclar/ajan_dene.py ornekler/blog-api --sahte     # API anahtarı olmadan, önceden yazılmış yanıtlarla
    python araclar/ajan_dene.py ornekler/blog-api             # Gemini ile (.env: GEMINI_API_KEY, GEMINI_MODEL)
    python araclar/ajan_dene.py ornekler/blog-api --model gemini-3.8-flash --tur 3

Ajan projeyi yalnızca okur; testler ayrı klasöre yazılır ve sandbox'ta (ağ kapalı) çalışır.
Çıktılar ajan-ciktilari/<tarih-saat>-<proje>/ klasörüne yazılır (GitHub'a gönderilmez):

    tests/              son test seti
    sonuc.json          özet: kapsama, testler, Olası Hatalar, turlar, token
    llm-gunlugu.jsonl   her model çağrısı (ajan, tur, token, süre)
    istemler/           gönderilen istemler ve modelin yanıtları (incelemek için)
    calisma/            her sandbox çalıştırmasının testleri ve ham çıktıları
"""
import argparse
import json
import sys
import time
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))  # backend/ klasörü

from app import ayarlar  # noqa: E402
from app.motor.birim import birim_testi  # noqa: E402
from app.motor.birim.sahte_senaryo import senaryo_yukle  # noqa: E402
from app.motor.llm import GeminiSaglayici, LLMHatasi, LLMIstemcisi, SahteSaglayici  # noqa: E402

BACKEND = Path(__file__).resolve().parents[1]
DURUM_METNI = {
    "tamamlandi": "tamamlandı",
    "kurulumHatasi": "KURULUM HATASI",
    "durduruldu": "durduruldu",
    "hata": "HATA",
}


def sayi(n) -> str:
    return f"{n:,}".replace(",", ".") if isinstance(n, int) else str(n)


def sure_metni(sn: float) -> str:
    dk, sn = divmod(int(round(sn)), 60)
    return f"{dk} dk {sn} sn" if dk else f"{sn} sn"


def karsilastir(olasi_hatalar: list[dict], bilinen: list[dict]) -> dict:
    """Olası Hataları bilinen hatalarla eşleştirir (K7; ön sayım, son karar insan incelemesinde).

    Aday: aynı birim ya da aynı dosyada en fazla 3 satır uzaklık.
    - Tek aday varsa o hatadır. Birden fazla Olası Hata aynı hataya düşebilir (aynı hatanın başka belirtisi);
      yakalanan hata bir kez sayılır.
    - Birden fazla aday varsa (ör. aynı birimde iki bilinen hata) en fazla 3 satır uzaktaki en yakın aday seçilir.
      Böyle tek bir aday yoksa eşleşme belirsizdir ve sayılmaz; aynı hatanın ikinci belirtisini başka bir hata
      gibi sayıp yakalama oranını şişirmemek için.
    """
    eslesen: dict[int, list[int]] = {}
    belirsiz, listede_olmayan = [], []
    for i, oh in enumerate(olasi_hatalar):
        satir = oh.get("satir") if isinstance(oh.get("satir"), int) else None
        adaylar = []
        for j, h in enumerate(bilinen):
            uzaklik = abs(satir - h["satir"]) if satir is not None and oh.get("dosya") == h["dosya"] else None
            if oh.get("birim") == h["birim"] or (uzaklik is not None and uzaklik <= 3):
                adaylar.append((uzaklik, j))
        secilen = None
        if len(adaylar) == 1:
            secilen = adaylar[0][1]
        elif adaylar:
            yakinlar = sorted((u, j) for u, j in adaylar if u is not None and u <= 3)
            if yakinlar and (len(yakinlar) == 1 or yakinlar[0][0] < yakinlar[1][0]):
                secilen = yakinlar[0][1]
        if secilen is not None:
            eslesen.setdefault(secilen, []).append(i)
        elif adaylar:
            belirsiz.append({**oh, "adaylar": [bilinen[j]["no"] for _, j in adaylar]})
        else:
            listede_olmayan.append(oh)
    return {
        "yakalanan": [h for j, h in enumerate(bilinen) if j in eslesen],
        "kacirilan": [h for j, h in enumerate(bilinen) if j not in eslesen],
        "listede_olmayan": listede_olmayan,
        "belirsiz": belirsiz,
        # Bilinen hata no → ona düşen Olası Hata testleri (birden fazlaysa aynı hatanın başka belirtileri)
        "belirtiler": {str(bilinen[j]["no"]): [olasi_hatalar[i]["test"] for i in sira] for j, sira in sorted(eslesen.items())},
    }


def ozet_yazdir(sonuc: dict, cikti: Path, bilinen_dosyasi: Path | None) -> None:
    print("\n── Sonuç ──")
    print(f"Durum: {DURUM_METNI.get(sonuc['durum'], sonuc['durum'])}" + (f" ({sonuc['bitis_nedeni']})" if sonuc.get("bitis_nedeni") else ""))
    if sonuc.get("hata"):
        print(f"Hata: {sonuc['hata']}")
        if sonuc.get("ayrinti"):
            print(f"Ayrıntı:\n{sonuc['ayrinti'][-800:]}")
    if sonuc["durum"] == "tamamlandi":
        k = sonuc.get("kapsama") or {}
        print(f"Tur: {sonuc['tur_sayisi']} · Model: {sonuc['model']}")
        if k:
            ilk = f" (ilk tur %{sonuc['ilk_kapsama']:g})" if sonuc.get("ilk_kapsama") is not None else ""
            dal = f", dal %{k['dal']:g}" if isinstance(k.get("dal"), (int, float)) else ""
            print(f"Kapsama: test edilebilir kodda satır %{k['testEdilebilir']:g}{ilk}{dal}")
        t = sonuc["testler"]
        parca = [f"{t['toplam']} test", f"{t['gecti']} geçti", f"{t['olasi_hata']} olası hata"]
        if t["kararsiz_cikarilan"]:
            parca.append(f"{t['kararsiz_cikarilan']} kararsız test çıkarıldı")
        if t["duzeltilemeyen_cikarilan"]:
            parca.append(f"{t['duzeltilemeyen_cikarilan']} düzeltilemeyen test çıkarıldı")
        if t["hile_denetimi_reddedilen"]:
            parca.append(f"{t['hile_denetimi_reddedilen']} test hile denetiminden geçmedi")
        print("Testler: " + " · ".join(parca))
        if sonuc["olasi_hatalar"]:
            print("Olası hatalar:")
            for no, oh in enumerate(sonuc["olasi_hatalar"], 1):
                konum = f"{oh['dosya']}:{oh['satir']}" if oh.get("dosya") else oh.get("birim", "?")
                print(f"  {no}. {konum}  {oh['baslik']}")
                print(f"     test: {oh['test']}")
                if oh.get("gerekce"):
                    print(f"     gerekçe: {oh['gerekce']}")
        if sonuc.get("cikarilan_kalan_testler"):
            print("Son turda hâlâ kalan, Olası Hata olarak işaretlenmediği için çıkarılan testler "
                  "(gizli bir hatayı gösteriyor olabilir, incele):")
            for t in sonuc["cikarilan_kalan_testler"]:
                print(f"  - {t['test']}: {t['mesaj'].splitlines()[0] if t['mesaj'] else ''}")
        if sonuc.get("geri_alinan_degisiklik"):
            print(f"Kalan ya da Olası Hata testlerinde gerekçesiz yapılıp geri alınan değişiklik: {sonuc['geri_alinan_degisiklik']}")
        if sonuc.get("duzeltilen_testler"):
            print(f"Ajanın gerekçesiyle düzelttiği kalan testler: {len(sonuc['duzeltilen_testler'])}")
            for t in sonuc["duzeltilen_testler"]:
                tur = f" (tur {t['tur']})" if t.get("tur") else ""
                print(f"  - {t['test']}{tur}: {t['gerekce']}")
        if sonuc.get("olasi_hata_geri_cekilen"):
            print(f"Geri çekilen Olası Hata işareti: {len(sonuc['olasi_hata_geri_cekilen'])}")
            for t in sonuc["olasi_hata_geri_cekilen"]:
                print(f"  - {t['test']}: {t['gerekce']}")
        if bilinen_dosyasi and bilinen_dosyasi.is_file():
            bilinen = json.loads(bilinen_dosyasi.read_text(encoding="utf-8"))["hatalar"]
            sonuc["karsilastirma"] = k2 = karsilastir(sonuc["olasi_hatalar"], bilinen)
            print(f"Bilinen hatalar ({bilinen_dosyasi.name}): {len(bilinen)} hatadan {len(k2['yakalanan'])} tanesi yakalandı"
                  + (f" (#{', #'.join(str(h['no']) for h in k2['yakalanan'])})" if k2["yakalanan"] else ""))
            for no, testler in k2["belirtiler"].items():
                if len(testler) > 1:
                    print(f"  #{no} için {len(testler)} olası hata: aynı hatanın birden fazla belirtisi (hata bir kez sayıldı)")
            for h in k2["kacirilan"]:
                print(f"  yakalanmadı #{h['no']}: {h['dosya']}:{h['satir']} {h['ozet']}")
            for oh in k2["belirsiz"]:
                print(f"  belirsiz (sayılmadı, elle incele): {oh['test']} birden fazla bilinen hataya uyuyor "
                      f"(#{', #'.join(str(n) for n in oh['adaylar'])})")
            for oh in k2["listede_olmayan"]:
                konum = f"{oh['dosya']}:{oh['satir']}" if oh.get("dosya") else oh.get("birim", "?")
                print(f"  bilinen listede yok (incele: yanlış alarm mı, yeni hata mı?): {konum} {oh.get('baslik', '')}")
        st = sonuc.get("standardizasyon") or {}
        if st.get("ham_karakter"):
            print(f"Standardizasyon (K12): ham test çıktısı {sayi(st['ham_karakter'])} karakter → geri bildirim "
                  f"{sayi(st['geri_bildirim_karakter'])} karakter (%{st['tasarruf_yuzde']:g} daha küçük)")
    tk = sonuc.get("token") or {}
    if tk.get("istek"):
        ajanlar = ", ".join(f"{ad} {a['istek']} istek / {sayi(a['toplam'])} token" for ad, a in tk["ajanlar"].items())
        print(f"Token: {sayi(tk['toplam'])} (giriş {sayi(tk['giris'])}, çıkış {sayi(tk['cikis'])}, düşünme {sayi(tk['dusunme'])}) · "
              f"{tk['istek']} istek · {ajanlar}")
    print(f"Süre: {sure_metni(sonuc.get('sure_sn', 0))}" + (f" · Sandbox çalıştırması: {sonuc['sandbox_calistirma']}" if sonuc.get("sandbox_calistirma") else ""))
    print(f"Çıktılar: {cikti}")


def main() -> int:
    ayristirici = argparse.ArgumentParser(description="Birim test ajanını bir proje klasöründe dener.")
    ayristirici.add_argument("kaynak", help="test edilecek projenin klasörü (ör. ornekler/blog-api)")
    ayristirici.add_argument("--sahte", nargs="?", const="", metavar="KLASOR",
                             help="API anahtarı olmadan önceden yazılmış yanıtlarla çalış (varsayılan: ornekler/sahte-ajan/<proje>)")
    ayristirici.add_argument("--model", help=f"Gemini modeli (varsayılan .env: {ayarlar.GEMINI_MODEL})")
    ayristirici.add_argument("--tur", type=int, default=ayarlar.AJAN_EN_FAZLA_TUR, help="en fazla tur (varsayılan 4: ilk tur + 3 tekrar)")
    ayristirici.add_argument("--alan", default="web", choices=["web", "genel", "oyun", "mobil", "diger"], help="yazılım alanı (K2)")
    ayristirici.add_argument("--karsilastir", help="bilinen hatalar dosyası (varsayılan: ornekler/<proje>-bilinen-hatalar.json)")
    ayristirici.add_argument("--cikti", help="çıktı klasörü (varsayılan: ajan-ciktilari/<tarih-saat>-<proje>)")
    # Yalnızca bulut testinde gerekti (kapsayıcılar köprü ağından dışarı çıkamıyordu)
    ayristirici.add_argument("--kurulum-agi", default="bridge", help=argparse.SUPPRESS)
    secenek = ayristirici.parse_args()

    kaynak = Path(secenek.kaynak).resolve()
    if not kaynak.is_dir():
        print(f"Proje klasörü bulunamadı: {kaynak}", file=sys.stderr)
        return 2
    proje = kaynak.name
    cikti = Path(secenek.cikti) if secenek.cikti else BACKEND / "ajan-ciktilari" / f"{datetime.now():%Y%m%d-%H%M%S}-{proje}"
    cikti.mkdir(parents=True, exist_ok=True)
    gunluk = (cikti / "llm-gunlugu.jsonl").open("a", encoding="utf-8")

    def kayit_ekle(kayit: dict) -> None:
        gunluk.write(json.dumps(kayit, ensure_ascii=False) + "\n")
        gunluk.flush()
        if kayit["hata"]:
            print(f"    · model: {kayit['hata']}; yeniden denenecek", flush=True)
        else:
            print(f"    · model: {kayit['ajan']}, {sayi(kayit['giris'])} giriş + {sayi(kayit['cikis'])} çıkış token, {kayit['sure_sn']} sn", flush=True)

    try:
        if secenek.sahte is not None:
            klasor = Path(secenek.sahte) if secenek.sahte else BACKEND / "ornekler" / "sahte-ajan" / proje
            saglayici = SahteSaglayici(senaryo_yukle(klasor))
            print(f"Sahte senaryo: {klasor} (gerçek bir dil modeli değil; anahtar ve kota harcanmaz)")
            istemci = LLMIstemcisi(saglayici, dakika_istek=0, token_tavani=ayarlar.AJAN_TOKEN_TAVANI,
                                   ayrintili_klasor=cikti / "istemler", kayit_ekle=kayit_ekle)
        else:
            model = secenek.model or ayarlar.GEMINI_MODEL
            saglayici = GeminiSaglayici(model, ayarlar.GEMINI_API_KEY, dusunme=ayarlar.GEMINI_DUSUNME)
            print(f"Model: {model} · dakikada en fazla {ayarlar.GEMINI_DAKIKA_ISTEK} istek · token tavanı {sayi(ayarlar.AJAN_TOKEN_TAVANI)}")
            print("Not: Ücretsiz katmanda gönderilen kod Google ürünlerini geliştirmek için kullanılabilir; örnek ya da açık kaynak kodla dene.")
            istemci = LLMIstemcisi(saglayici, dakika_istek=ayarlar.GEMINI_DAKIKA_ISTEK, token_tavani=ayarlar.AJAN_TOKEN_TAVANI,
                                   ayrintili_klasor=cikti / "istemler", kayit_ekle=kayit_ekle)
    except (LLMHatasi, FileNotFoundError) as hata:
        print(f"Başlatılamadı: {hata}", file=sys.stderr)
        return 2

    def olay_yaz(o: dict) -> None:
        grup = f"[Tur {o['round']}/{o['maxRounds']}]"
        print(f"{grup} {o['agent']} · {o['kind']}: {o['message']}", flush=True)

    print(f"Proje: {kaynak}\n")
    baslangic = time.monotonic()
    try:
        sonuc = birim_testi(kaynak, llm=istemci, calisma=cikti / "calisma", secim={"alan": secenek.alan},
                            bildir=olay_yaz, en_fazla_tur=secenek.tur, kurulum_agi=secenek.kurulum_agi)
    except KeyboardInterrupt:
        print("\nDurduruldu (Ctrl+C).")
        return 130
    finally:
        gunluk.close()
    sonuc.setdefault("sure_sn", round(time.monotonic() - baslangic, 1))

    testler = cikti / "tests"
    testler.mkdir(exist_ok=True)
    for f in sonuc.get("test_dosyalari", []):
        (testler / Path(f["yol"]).name).write_text(f["kod"], encoding="utf-8", newline="\n")
    bilinen = Path(secenek.karsilastir) if secenek.karsilastir else BACKEND / "ornekler" / f"{proje}-bilinen-hatalar.json"
    ozet_yazdir(sonuc, cikti, bilinen)
    (cikti / "sonuc.json").write_text(json.dumps(sonuc, ensure_ascii=False, indent=2), encoding="utf-8")
    return 0 if sonuc["durum"] == "tamamlandi" else 1


if __name__ == "__main__":
    sys.exit(main())
