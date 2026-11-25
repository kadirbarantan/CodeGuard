"""Yüklenen kodu çalıştırmanın klasörüne güvenli biçimde kaydeder (K5).

- Klasör seçildiyse her dosya ayrı gelir, dosya adı göreli yoldur (blog-api/app/posts.py).
- .zip ya da tek dosya tek parça gelir; zip burada açılır.
- Sınırlar: toplam 5 MB, 200 dosya (açılmış hâliyle). node_modules, .git, venv … atlanır.
- Güvenlik: mutlak yol, sürücü harfi, ".." ve sembolik bağlantı kabul edilmez; dosyalar yalnızca
  çalıştırmanın klasörüne yazılır. Boyut, dosya okunurken sayılır (zip'in söylediğine güvenilmez).
"""
import re
import shutil
import zipfile
from pathlib import Path, PurePosixPath
from typing import BinaryIO

MAX_BOYUT = 5 * 1024 * 1024
MAX_DOSYA = 200
# frontend/src/components/home/dosyaOlcum.js'teki listeyle aynı (+ Python önbellekleri)
HARIC = {"node_modules", "bin", "obj", "venv", ".venv", ".git", "__pycache__"}
_PARCA = 64 * 1024


class YuklemeHatasi(Exception):
    def __init__(self, mesaj: str, kod: int = 400):
        super().__init__(mesaj)
        self.mesaj, self.kod = mesaj, kod


SINIR_MESAJI = "Yükleme sınırı aşıldı: en fazla 5 MB ve 200 dosya."


def guvenli_yol(ad: str) -> tuple[str, ...] | None:
    """Göreli, güvenli bir yolsa parçalarını döner; değilse None."""
    ad = (ad or "").replace("\\", "/")
    if not ad or "\x00" in ad or ad.startswith("/") or re.match(r"^[A-Za-z]:", ad):
        return None
    parcalar = tuple(p for p in PurePosixPath(ad).parts if p not in ("", "."))
    if not parcalar or ".." in parcalar:
        return None
    return parcalar


def _haric_mi(parcalar: tuple[str, ...]) -> bool:
    return any(p in HARIC for p in parcalar[:-1])


class _Sayac:
    def __init__(self):
        self.boyut = 0
        self.sayi = 0

    def kopyala(self, kaynak: BinaryIO, hedef: Path) -> None:
        self.sayi += 1
        if self.sayi > MAX_DOSYA:
            raise YuklemeHatasi(SINIR_MESAJI, 413)
        hedef.parent.mkdir(parents=True, exist_ok=True)
        with open(hedef, "wb") as cikti:
            while parca := kaynak.read(_PARCA):
                self.boyut += len(parca)
                if self.boyut > MAX_BOYUT:
                    raise YuklemeHatasi(SINIR_MESAJI, 413)
                cikti.write(parca)


def _ortak_kok(yollar: list[tuple[str, ...]]) -> str | None:
    """Bütün dosyalar tek bir üst klasördeyse (blog-api/...) o klasörün adı."""
    ilkler = {y[0] for y in yollar}
    return next(iter(ilkler)) if len(ilkler) == 1 and all(len(y) > 1 for y in yollar) else None


def kaydet(dosyalar: list[tuple[str, BinaryIO]], hedef: Path) -> str:
    """dosyalar: [(dosya adı ya da göreli yol, okunabilir dosya)]. Proje adını döner.
    Hata olursa hedef klasör silinir ve YuklemeHatasi fırlatılır."""
    try:
        if len(dosyalar) == 1 and dosyalar[0][0].lower().endswith(".zip"):
            return _zip_ac(*dosyalar[0], hedef)
        return _dosyalari_yaz(dosyalar, hedef)
    except BaseException:
        shutil.rmtree(hedef, ignore_errors=True)
        raise


def _dosyalari_yaz(dosyalar, hedef: Path) -> str:
    gecerli = []
    for ad, kaynak in dosyalar:
        yol = guvenli_yol(ad)
        if yol is None:
            raise YuklemeHatasi(f"Geçersiz dosya yolu: {ad[:100]}")
        if not _haric_mi(yol):
            gecerli.append((yol, kaynak))
    if not gecerli:
        raise YuklemeHatasi("Yüklenecek dosya bulunamadı.")
    kok = _ortak_kok([y for y, _ in gecerli])
    sayac = _Sayac()
    for yol, kaynak in gecerli:
        sayac.kopyala(kaynak, hedef.joinpath(*(yol[1:] if kok else yol)))
    return kok or (gecerli[0][0][0] if len(gecerli) == 1 else "proje")


def _zip_ac(ad: str, kaynak: BinaryIO, hedef: Path) -> str:
    kaynak.seek(0, 2)
    if kaynak.tell() > 2 * MAX_BOYUT:  # sıkıştırılmış hâli bile sınırın çok üstünde
        raise YuklemeHatasi(SINIR_MESAJI, 413)
    kaynak.seek(0)
    try:
        zf = zipfile.ZipFile(kaynak)
    except zipfile.BadZipFile as h:
        raise YuklemeHatasi("Zip dosyası açılamadı; bozuk olabilir.") from h
    with zf:
        uyeler = []
        for bilgi in zf.infolist():
            if bilgi.is_dir():
                continue
            if (bilgi.external_attr >> 16) & 0o170000 == 0o120000:  # sembolik bağlantı
                continue
            if bilgi.flag_bits & 0x1:
                raise YuklemeHatasi("Şifreli zip dosyaları desteklenmiyor.")
            yol = guvenli_yol(bilgi.filename)
            if yol is None:
                raise YuklemeHatasi("Zip içinde geçersiz dosya yolu var.")
            if not _haric_mi(yol) and yol[0] != "__MACOSX":
                uyeler.append((yol, bilgi))
        if not uyeler:
            raise YuklemeHatasi("Zip içinde yüklenecek dosya bulunamadı.")
        if len(uyeler) > MAX_DOSYA:
            raise YuklemeHatasi(SINIR_MESAJI, 413)
        kok = _ortak_kok([y for y, _ in uyeler])
        sayac = _Sayac()
        for yol, bilgi in uyeler:
            with zf.open(bilgi) as icerik:
                sayac.kopyala(icerik, hedef.joinpath(*(yol[1:] if kok else yol)))
    return kok or PurePosixPath(guvenli_yol(ad)[-1]).stem
