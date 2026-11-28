"""Doğrulayıcı (K9): düz Python, yapay zekâ yok. Testleri sandbox'ta çalıştırır ve sonucu ajan için süzer.

Her turda:
1. Test dosyaları çalışma klasörüne yazılır ve sandbox'ta çalıştırılır (ağ kapalı, K5).
2. Kalan ya da hata veren test varsa yalnızca geçen testlerle bir kez daha çalıştırılır. Kapsama bu ikinci
   çalıştırmadan alınır (K6-3: kapsamaya yalnızca geçen testler sayılır).
3. Sonuç Kod Haritası'yla eşlenip ajana Türkçe geri bildirime çevrilir (geri_bildirim.py). Ham çıktı ile geri
   bildirimin boyutu kaydedilir (K12).
Döngü bitince son test seti 3 kez çalıştırılır, kararsız (flaky) testler çıkarılır (K6-4).

Test anahtarı: "tests/test_posts.py::test_x" ya da "tests/test_posts.py::TestSinif::test_x". Parametreli testlerin
durumları fonksiyon başına birleştirilir (bir durum kalırsa fonksiyon kalmış sayılır).
"""
from __future__ import annotations

import re
from pathlib import Path

from app.analiz.geri_bildirim import geri_bildirim_metni, kapsama_geri_bildirimi
from app.motor.birim.denetim import testleri_cikar
from app.motor.sandbox import Oturum

ONCELIK = {"atlandi": 0, "gecti": 1, "kaldi": 2, "hata": 3}


def anahtar(dosya: str, ad: str) -> str:
    return f"{dosya}::{ad}"


def anahtar_coz(test_anahtari: str) -> tuple[str, str]:
    dosya, _, ad = test_anahtari.partition("::")
    return dosya, ad


def junit_sonuclari(testler: dict) -> tuple[dict[str, dict], list[dict]]:
    """JUnit özetinden (standart.junit_oku) fonksiyon başına sonuçlar ve toplama hataları."""
    sonuclar: dict[str, dict] = {}
    toplama: list[dict] = []
    for t in testler["testler"]:
        if t.get("toplama") or not t.get("sinif"):
            toplama.append({"dosya": f"tests/{t['isim']}.py" if t.get("isim") else "?", "mesaj": t["mesaj"]})
            continue
        parcalar = t["sinif"].split(".")
        dosya = f"tests/{parcalar[0]}.py"
        ad = "::".join(parcalar[1:] + [re.sub(r"\[.*\]$", "", t["isim"])])
        k = anahtar(dosya, ad)
        onceki = sonuclar.get(k)
        if onceki is None:
            sonuclar[k] = {"durum": t["durum"], "mesaj": t["mesaj"], "vaka": 1}
            continue
        onceki["vaka"] += 1
        if ONCELIK[t["durum"]] > ONCELIK[onceki["durum"]]:
            onceki["durum"], onceki["mesaj"] = t["durum"], t["mesaj"]
    return sonuclar, toplama


def kapsama_oranlari(harita: dict, kapsama: dict | None) -> dict | None:
    """Hedef dosyalardaki satır kapsaması: test edilebilir kodda ve toplamda (K1'deki iki oran)."""
    if not kapsama:
        return None
    hedefler = {d["yol"] for d in harita["dosyalar"] if d["hedef"]}
    edilemez: dict[str, set[int]] = {}
    for b in harita["birimler"]:
        if b["tur"] != "sinif" and not b.get("test_edilebilir", True):
            edilemez.setdefault(b["dosya"], set()).update(range(b["satirlar"][0], b["satirlar"][1] + 1))
    k_top = t_top = k_te = t_te = 0
    dosyalar = []
    for d in kapsama["dosyalar"]:
        if d["yol"] not in hedefler:
            continue
        kapsanan, kapsanmayan = set(d.get("kapsanan_satirlar", [])), set(d["kapsanmayan_satirlar"])
        motor = edilemez.get(d["yol"], set())
        k_top += len(kapsanan)
        t_top += len(kapsanan | kapsanmayan)
        k_te += len(kapsanan - motor)
        t_te += len((kapsanan | kapsanmayan) - motor)
        dosyalar.append({
            "yol": d["yol"],
            "kapsanan": sorted(kapsanan),
            "kapsanmayan": sorted(kapsanmayan),
            "motorBagimli": sorted((kapsanan | kapsanmayan) & motor),
        })

    def yuzde(a: int, b: int) -> float:
        return round(100 * a / b, 1) if b else 0.0

    return {
        "testEdilebilir": yuzde(k_te, t_te),
        "toplam": yuzde(k_top, t_top),
        "dal": kapsama.get("dal_yuzde"),
        "satir": {"kapsanan": k_top, "toplam": t_top},
        "dosyalar": dosyalar,
    }


def _gunluk_hatasi(sonuc: dict) -> str:
    """pytest hiç başlayamadıysa (ör. bozuk conftest.py) kapsayıcı günlüğündeki asıl hata satırları."""
    gunluk = (sonuc.get("test") or {}).get("gunluk_sonu") or ""
    satirlar = [s.rstrip() for s in gunluk.splitlines() if s.strip()]
    e_satirlari = [s.strip() for s in satirlar if s.lstrip().startswith("E ")]
    secilen = e_satirlari[-3:] or [s.strip() for s in satirlar[-5:]]
    return " | ".join(secilen)[:800] or "pytest başlayamadı (ayrıntı yok)."


def _ham_boyut(junit_kosusu: dict, kapsama_kosusu: dict) -> int:
    """Katman olmasaydı ajanın göreceği ham çıktıların boyutu: test sonuçları (JUnit) + kapsama (Cobertura), K12."""
    toplam = 0
    for sonuc, ad in ((junit_kosusu, "junit.xml"), (kapsama_kosusu, "kapsama.xml")):
        dosya = Path(sonuc.get("cikti_klasoru") or "") / ad
        if sonuc.get("cikti_klasoru") and dosya.is_file():
            toplam += len(dosya.read_text(encoding="utf-8", errors="replace"))
    return toplam


class Dogrulayici:
    def __init__(self, oturum: Oturum, harita: dict, calisma: Path | str):
        self.oturum, self.harita = oturum, harita
        self.calisma = Path(calisma)
        self.calisma.mkdir(parents=True, exist_ok=True)
        self._sayac = 0
        self.calistirma_sayisi = 0

    def calistir(self, dosyalar: dict[str, str], etiket: str) -> dict:
        """Test dosyalarını yeni bir klasöre yazar ve sandbox'ta bir kez çalıştırır."""
        self._sayac += 1
        kok = self.calisma / f"{self._sayac:02d}-{etiket}"
        testler = kok / "tests"
        testler.mkdir(parents=True, exist_ok=True)
        for yol, icerik in dosyalar.items():
            (testler / Path(yol).name).write_text(icerik, encoding="utf-8", newline="\n")
        self.calistirma_sayisi += 1
        return self.oturum.test(testler, kok / "cikti")

    @staticmethod
    def ayikla(dosyalar: dict[str, str], cikarilacak: set[str], bozuk_dosyalar: set[str] = frozenset()) -> dict[str, str]:
        """Verilen testleri dosyalardan çıkarır (anahtar listesi); bozuk dosyaları bütünüyle bırakır."""
        sonuc = {}
        for yol, icerik in dosyalar.items():
            if yol in bozuk_dosyalar:
                continue
            adlar = {anahtar_coz(k)[1] for k in cikarilacak if anahtar_coz(k)[0] == yol}
            yeni = testleri_cikar(icerik, adlar) if adlar else icerik
            if yeni is not None:
                sonuc[yol] = yeni
        return sonuc

    def tur(self, tur_no: int, dosyalar: dict[str, str], olasi_hatalar: dict[str, dict]) -> dict:
        """Bir turun doğrulaması. Dönen sözlük graf durumunda saklanır ve rapora girer."""
        ilk = self.calistir(dosyalar, f"tur{tur_no}")
        sonuc: dict = {"tur": tur_no, "durum": ilk["durum"], "toplama": [], "baslatma_hatasi": None, "sonuclar": {},
                       "testler": {"toplam": 0, "gecti": 0, "kaldi": 0, "hata": 0}, "olasi_hata_kalan": [],
                       "olasi_hata_gecen": [], "cozulmemis": {}, "kapsama": None, "geri_bildirim": "",
                       "standardizasyon": None, "eksik_birimler": []}
        if ilk["durum"] == "kurulum_hatasi":
            return sonuc
        testler = (ilk.get("ozet") or {}).get("testler")
        if testler is None:
            if ilk["durum"] == "zaman_asimi":
                sonuc["geri_bildirim"] = (f"Testler {self.oturum.sinirlar.test_sure_sn} sn içinde bitmedi (zaman aşımı); sonuç alınamadı. "
                                          "Sonsuz döngüye giren ya da bekleyen bir test olabilir. Her test en fazla 10 sn sürebilir.")
            elif ilk["durum"] == "bellek_asimi":
                sonuc["geri_bildirim"] = "Testler bellek sınırını (512 MB) aştı; sonuç alınamadı. Çok büyük veri üreten testleri küçült."
            else:
                sonuc["baslatma_hatasi"] = _gunluk_hatasi(ilk)
                sonuc["geri_bildirim"] = f"pytest başlayamadı: {sonuc['baslatma_hatasi']}"
            return sonuc

        sonuclar, toplama = junit_sonuclari(testler)
        kalanlar = {k for k, v in sonuclar.items() if v["durum"] in ("kaldi", "hata")}
        sonuc.update(
            sonuclar=sonuclar,
            toplama=toplama,
            testler={"toplam": testler["toplam"], "gecti": testler["gecti"], "kaldi": testler["kaldi"], "hata": testler["hata"]},
            olasi_hata_kalan=sorted(k for k in kalanlar if k in olasi_hatalar),
            olasi_hata_gecen=sorted(k for k in olasi_hatalar if sonuclar.get(k, {}).get("durum") == "gecti"),
            cozulmemis={k: sonuclar[k]["mesaj"] for k in sorted(kalanlar) if k not in olasi_hatalar},
        )

        # Kapsamaya yalnızca geçen testler sayılır (K6-3)
        ikinci = None
        if kalanlar or toplama:
            gecenler = self.ayikla(dosyalar, kalanlar, {t["dosya"] for t in toplama})
            ikinci = self.calistir(gecenler, f"tur{tur_no}-gecenler")
            kapsama = (ikinci.get("ozet") or {}).get("kapsama")
        else:
            kapsama = ilk["ozet"].get("kapsama")
        sonuc["kapsama"] = kapsama_oranlari(self.harita, kapsama)

        # Ajanın göreceği geri bildirim: Olası Hata işaretli testler kalan listesinden ayrılır
        basarisizlar = []
        for t in testler["basarisizlar"]:
            if t.get("toplama") or not t.get("sinif"):
                continue
            k = anahtar(f"tests/{t['sinif'].split('.')[0]}.py", "::".join(t["sinif"].split(".")[1:] + [t["isim"]]))
            if re.sub(r"\[.*\]$", "", k) in olasi_hatalar:
                continue
            basarisizlar.append({**t, "ad": k})
        gb = kapsama_geri_bildirimi(self.harita, {"testler": {**testler, "basarisizlar": basarisizlar}, "kapsama": kapsama})
        sonuc["eksik_birimler"] = [e["birim"] for e in gb["eksikler"]]
        satirlar = [geri_bildirim_metni(gb)]
        # Yalnızca Olası Hata testlerinin çalıştırdığı birimler: bu testler kapsamaya sayılmaz (K6-3)
        oh_birimleri = {v.get("birim") for v in olasi_hatalar.values()}
        yalniz_oh = [e["birim"] for e in gb["eksikler"] if e.get("hic_calismadi") and e["birim"] in oh_birimleri]
        if yalniz_oh:
            satirlar.append("Not: " + ", ".join(yalniz_oh) + " yalnızca Olası Hata işaretli testlerde çalışıyor; bu testler "
                            "kapsamaya sayılmaz. Belgedeki diğer davranışlarını ayrı, geçen testlerle doğrula.")
        if toplama:
            satirlar.append("Yüklenemeyen test dosyaları (içlerindeki testler çalışmadı):")
            satirlar += [f"- {t['dosya']}: {t['mesaj']}" for t in toplama]
        if sonuc["olasi_hata_kalan"]:
            satirlar.append("Olası Hata olarak işaretlediğin testler yine kaldı (beklenen; bunları değiştirme): "
                            + ", ".join(sonuc["olasi_hata_kalan"]))
        if sonuc["olasi_hata_gecen"]:
            satirlar.append("Şu testler artık geçtiği için Olası Hata işareti kaldırıldı: " + ", ".join(sonuc["olasi_hata_gecen"]))
        sonuc["geri_bildirim"] = "\n".join(s for s in satirlar if s)
        sonuc["standardizasyon"] = {"ham_karakter": _ham_boyut(ilk, ikinci or ilk), "geri_bildirim_karakter": len(sonuc["geri_bildirim"])}
        return sonuc

    def son(self, dosyalar: dict[str, str], olasi_hatalar: dict[str, dict], cozulmemis: dict[str, str], tekrar: int = 3) -> dict:
        """Son test seti: çözülmemiş testler çıkarılır, kalan set 3 kez çalıştırılır, kararsızlar ayıklanır (K6-4).

        cozulmemis: son turda kalan ama ne düzeltilen ne de Olası Hata olarak işaretlenen testler → {anahtar: mesaj}.
        """
        temiz = self.ayikla(dosyalar, set(cozulmemis))
        kosular = [self.calistir(temiz, f"son-{i + 1}") for i in range(tekrar)]
        gecerli = [k for k in kosular if (k.get("ozet") or {}).get("testler")]
        listeler = [junit_sonuclari(k["ozet"]["testler"])[0] for k in gecerli]
        anahtarlar = set().union(*(s.keys() for s in listeler)) if listeler else set()
        gecen, oh_teyit, kararsiz = set(), set(), set()
        for k in anahtarlar:
            durumlar = {s.get(k, {}).get("durum", "yok") for s in listeler}
            if durumlar == {"gecti"}:
                gecen.add(k)
            elif k in olasi_hatalar and durumlar <= {"kaldi", "hata"}:
                oh_teyit.add(k)
            else:
                kararsiz.add(k)
        son_dosyalar = self.ayikla(temiz, kararsiz)  # geçenler + teyitli Olası Hatalar (rapordaki test dosyaları)
        kapsama_dosyalari = self.ayikla(son_dosyalar, oh_teyit)  # yalnızca geçenler
        if not gecerli:
            kapsama = None
        elif not kararsiz and not oh_teyit:
            kapsama = gecerli[-1]["ozet"].get("kapsama")
        else:
            k = self.calistir(kapsama_dosyalari, "son-kapsama")
            kapsama = (k.get("ozet") or {}).get("kapsama")
        vaka = {k: v["vaka"] for k, v in listeler[-1].items()} if listeler else {}
        return {
            "dogrulandi": bool(gecerli),
            "dosyalar": son_dosyalar,
            "gecen": sorted(gecen),
            "olasi_hata": sorted(oh_teyit),
            "kararsiz": sorted(kararsiz),
            "cozulmemis_cikarilan": [{"test": k, "mesaj": m} for k, m in sorted(cozulmemis.items())],
            "vaka": vaka,
            "kapsama": kapsama_oranlari(self.harita, kapsama),
            "kapsama_ozeti": kapsama,
        }
