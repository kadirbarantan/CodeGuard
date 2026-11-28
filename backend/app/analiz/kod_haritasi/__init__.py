"""Kod Haritası (K4; belge 18 adım 8).

Kullanıcının kodunu tree-sitter ile okuyup her birim (fonksiyon, metot, sınıf) için bir kart çıkarır.
Kodu çalıştırmaz; tamamen deterministiktir, yapay zekâ kullanmaz.

Nerede kullanılır (K4, K9):
- Planla: Planlayıcı ajan bütün kodu değil bu haritayı görür ve test planı çıkarır (token tasarrufu).
- Uygula: ajan bir birimin koduna ihtiyaç duyunca `birim_kaynagi` ile yalnızca onu ister (get_source aracı).
- Doğrula: sandbox'ın bulduğu kapsanmayan satırlar haritadaki birim ve dallara bağlanır (geri_bildirim.py).
- Kod Yorumu sekmesi: birim, dal, hata yolu ve risk bilgisinin deterministik kısmı buradan gelir (K21).

Şimdilik yalnızca Python okunur. Diğer dillerin dosyaları "diger_dil" listesine yazılır (K5).
"""
from __future__ import annotations

from pathlib import Path, PurePosixPath

from app.calistirma.yukleme import HARIC

from .python import STANDART_KUTUPHANE, PythonDosyasi, _Cozucu

SURUM = 1

DIL_UZANTILARI = {
    ".py": "Python",
    ".js": "JavaScript", ".jsx": "JavaScript", ".mjs": "JavaScript", ".cjs": "JavaScript",
    ".ts": "TypeScript", ".tsx": "TypeScript",
    ".cs": "C#",
    ".php": "PHP",
    ".java": "Java", ".kt": "Kotlin", ".go": "Go", ".rb": "Ruby", ".swift": "Swift",
    ".c": "C", ".h": "C", ".cpp": "C++", ".hpp": "C++", ".rs": "Rust", ".dart": "Dart",
}
OKUNAN_DILLER = {"python": ("Python", (".py",))}
EN_BUYUK_DOSYA = 1024 * 1024  # bundan büyük dosyalar (çoğunlukla üretilmiş kod) okunmaz

# K1: bu modülleri kullanan birimler birim testine uygun sayılmaz (motor ya da grafik arayüz bağımlı)
MOTOR_MODULLERI = {
    "pygame": "Pygame (oyun motoru)",
    "pyglet": "pyglet (oyun ve grafik)",
    "arcade": "Arcade (oyun motoru)",
    "ursina": "Ursina (oyun motoru)",
    "panda3d": "Panda3D (oyun motoru)",
    "kivy": "Kivy (mobil ve masaüstü arayüz)",
    "tkinter": "Tkinter (masaüstü arayüz)",
}

# Risk (ilk sürüm, ölçümle ayarlanacak): puan = dal sayısı + hata yolu sayısı + kullandığı dış modül sayısı.
# Kod Yorumu mock'undaki tanımla aynı; yapay zekânın fark ettiği bir sorun (güvenlik, veri kaybı) riski ayrıca yükseltebilir.
RISK_ESIKLERI = (("yuksek", 5), ("orta", 3))
RISK_ADLARI = {"yuksek": "yüksek", "orta": "orta", "dusuk": "düşük"}


class HaritaHatasi(Exception):
    """Harita çıkarılamadı (ör. klasör yok, dil desteklenmiyor)."""


def _dosyalari_bul(kok: Path) -> list[str]:
    yollar = []
    for yol in sorted(kok.rglob("*")):
        goreli = yol.relative_to(kok)
        if not yol.is_file() or any(p in HARIC or p.startswith(".") for p in goreli.parts[:-1]):
            continue
        yollar.append(PurePosixPath(goreli).as_posix())
    return yollar


def _risk(birim: dict) -> tuple[str, int]:
    puan = len(birim.get("dallar", [])) + len(birim.get("hata_yollari", [])) + len(birim.get("dis_moduller", []))
    for seviye, esik in RISK_ESIKLERI:
        if puan >= esik:
            return seviye, puan
    return "dusuk", puan


def harita_cikar(kok: Path | str, dil: str = "python", hedefler: list[str] | None = None) -> dict:
    """Projenin Kod Haritası.

    kok       projenin klasörü (ör. YUKLEME_KLASORU/<run_id>/kaynak)
    dil       seçilen dil; şimdilik yalnızca "python"
    hedefler  yalnızca bu dosyalar test hedefidir (GitHub'dan seçilenler, belge 22). Verilmezse hepsi hedeftir.
              Hedef olmayan dosyalar da okunur (bağımlılıklar için) ama "hedef": false işaretlenir.
    """
    kok = Path(kok)
    if not kok.is_dir():
        raise HaritaHatasi(f"Klasör bulunamadı: {kok}")
    if dil not in OKUNAN_DILLER:
        raise HaritaHatasi(f"Kod Haritası şimdilik yalnızca Python okuyor (istenen: {dil}).")
    dil_adi, uzantilar = OKUNAN_DILLER[dil]

    tum = _dosyalari_bul(kok)
    okunacak = [y for y in tum if PurePosixPath(y).suffix in uzantilar]
    hedef_kumesi = set(hedefler) if hedefler is not None else None
    diger_dil, atlanan = [], []
    for yol in tum:
        uzanti = PurePosixPath(yol).suffix
        if uzanti in DIL_UZANTILARI and uzanti not in uzantilar:
            diger_dil.append({
                "yol": yol,
                "neden": f"{DIL_UZANTILARI[uzanti]}; seçilen dil {dil_adi} olduğu için birim analizine girmedi.",
            })

    cozucu = _Cozucu(set(okunacak))
    okunanlar: list[PythonDosyasi] = []
    for yol in okunacak:
        dosya_yolu = kok / yol
        if dosya_yolu.stat().st_size > EN_BUYUK_DOSYA:
            atlanan.append({"yol": yol, "neden": "1 MB'tan büyük; muhtemelen üretilmiş kod, okunmadı."})
            continue
        okunanlar.append(PythonDosyasi(yol, dosya_yolu.read_bytes(), cozucu))

    # Bütün dosyalar okununca bağımlılıkları çöz
    tanimlar = {d.yol: {b["tam_ad"] for b in d.birimler} for d in okunanlar}
    dosyalar, birimler = [], []
    for d in okunanlar:
        for birim in d.birimler:
            if birim["tur"] != "sinif":
                bagimliliklar, dis = [], []
                for cagri in birim["cagrilar"]:
                    if (hedef := d.yerel_hedef(cagri, birim, tanimlar)) and hedef != birim["id"] and hedef not in bagimliliklar:
                        bagimliliklar.append(hedef)
                    elif (modul := d.dis_modul(cagri)) and modul not in dis:
                        dis.append(modul)
                birim["bagimliliklar"] = bagimliliklar
                birim["dis_moduller"] = dis
                motor = next((m for m in dis if m in MOTOR_MODULLERI), None)
                birim["test_edilebilir"] = motor is None
                birim["neden"] = (
                    f"{MOTOR_MODULLERI[motor]} kullanıyor; birim testi yerine Humble Object ile ayrılması önerilir (K1)."
                    if motor else None
                )
                birim["risk"], birim["risk_puani"] = _risk(birim)
            birim["hedef"] = hedef_kumesi is None or d.yol in hedef_kumesi
            birim.pop("_ust", None)
            birimler.append(birim)
        dosyalar.append({
            "yol": d.yol,
            "hedef": hedef_kumesi is None or d.yol in hedef_kumesi,
            "satir_sayisi": d.satir_sayisi,
            "belge": d.belge,
            "sozdizimi_hatasi": d.kok.has_error,
            "importlar": d.importlar,
            "birimler": [b["id"] for b in d.birimler],
        })

    islevler = [b for b in birimler if b["tur"] != "sinif"]
    return {
        "surum": SURUM,
        "dil": dil,
        "ozet": {
            "dosya": len(dosyalar),
            "birim": len(birimler),
            "fonksiyon_ve_metot": len(islevler),
            "dal": sum(len(b["dallar"]) for b in islevler),
            "hata_yolu": sum(len(b["hata_yollari"]) for b in islevler),
            "test_edilemeyen": sum(1 for b in islevler if not b["test_edilebilir"]),
            "risk": {s: sum(1 for b in islevler if b["risk"] == s) for s in ("yuksek", "orta", "dusuk")},
            "dis_moduller": sorted({m for b in islevler for m in b["dis_moduller"]}),
            "standart_disi_moduller": sorted({m for b in islevler for m in b["dis_moduller"] if m not in STANDART_KUTUPHANE}),
        },
        "dosyalar": dosyalar,
        "birimler": birimler,
        "diger_dil": diger_dil,
        "atlanan": atlanan,
    }


def birim_bul(harita: dict, birim_id: str) -> dict | None:
    return next((b for b in harita["birimler"] if b["id"] == birim_id), None)


def birim_kaynagi(kok: Path | str, harita: dict, birim_id: str, satir_no: bool = True) -> str:
    """Bir birimin kaynak kodu (ajanın get_source aracı, K4). Satır numaralı döner ki ajan satırlara başvurabilsin."""
    birim = birim_bul(harita, birim_id)
    if birim is None:
        raise HaritaHatasi(f"Haritada böyle bir birim yok: {birim_id}")
    satirlar = (Path(kok) / birim["dosya"]).read_text(encoding="utf-8", errors="replace").splitlines()
    bas, son = birim["satirlar"]
    secilen = satirlar[bas - 1 : son]
    if not satir_no:
        return "\n".join(secilen)
    genislik = len(str(son))
    return "\n".join(f"{bas + i:>{genislik}} | {satir}" for i, satir in enumerate(secilen))


def harita_metni(harita: dict, sadece_hedef: bool = True) -> str:
    """Planlayıcı ajanın göreceği kısa metin (K4 "Planla"): her birim için imza, belge, dallar, hata yolları, bağımlılıklar."""
    satirlar = []
    birimler = {b["id"]: b for b in harita["birimler"]}
    for dosya in harita["dosyalar"]:
        if sadece_hedef and not dosya["hedef"]:
            continue
        islevler = [birimler[i] for i in dosya["birimler"] if birimler[i]["tur"] != "sinif"]
        if not islevler:
            continue
        baslik = dosya["yol"] + (f"  ({' '.join(dosya['belge'].split())[:120]})" if dosya.get("belge") else "")
        satirlar.append(baslik)
        for b in islevler:
            ek = [f"satır {b['satirlar'][0]}-{b['satirlar'][1]}", f"risk {RISK_ADLARI[b['risk']]}"]
            if b["dekoratorler"]:
                ek.append("@" + ", @".join(b["dekoratorler"]))
            if not b["test_edilebilir"]:
                ek.append("TEST EDİLEMEZ: " + b["neden"])
            satirlar.append(f"  {b['tam_ad'].rsplit('.', 1)[0] + '.' if b['tur'] == 'metot' else ''}{b['imza']}  " + "  ".join(ek))
            if b.get("belge"):
                satirlar.append(f"    belge: {' '.join(b['belge'].split())}")
            if b["dallar"]:
                satirlar.append("    dallar: " + " | ".join(f"{d['satir']} {d['tur']} {d['kosul']}" for d in b["dallar"]))
            if b["hata_yollari"]:
                satirlar.append("    hata yolları: " + " | ".join(f"{h['satir']} → {h['ozet']}" for h in b["hata_yollari"]))
            if b["bagimliliklar"] or b["dis_moduller"]:
                parca = []
                if b["bagimliliklar"]:
                    parca.append("çağırdığı: " + ", ".join(b["bagimliliklar"]))
                if b["dis_moduller"]:
                    parca.append("dış: " + ", ".join(b["dis_moduller"]))
                satirlar.append("    " + "   ".join(parca))
    return "\n".join(satirlar)
