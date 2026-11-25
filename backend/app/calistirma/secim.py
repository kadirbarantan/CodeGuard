"""Test başlatırken gelen seçim (`secim` alanı) ve kuralları.

Kurallar frontend'deki config/testStratejileri.js ile aynıdır; site zaten bunlara uyar,
backend yine de denetler (istek siteden gelmek zorunda değil).
"""
from typing import Literal
from urllib.parse import urlsplit

from pydantic import BaseModel, Field, ValidationError, field_validator

TUR_SIRASI = ["birim", "arayuz", "kullanilabilirlik", "erisilebilirlik"]
Tur = Literal["birim", "arayuz", "kullanilabilirlik", "erisilebilirlik"]
# Şimdilik yalnızca Web aktif; diğer alanlar sitede "Yakında" olarak görünür (belge 06)
AKTIF_ALANLAR = {"web"}
# Sunucuda hazır duran örnek projeler ("Örnek projeyle dene")
ORNEK_PROJELER = {"blog-api": "python"}


class SecimHatasi(ValueError):
    """Kullanıcıya gösterilecek Türkçe mesajla 400 döner."""


class Secim(BaseModel):
    kaynak: Literal["kod", "url", "github"] = "kod"
    alan: Literal["oyun", "web", "mobil", "genel", "diger"]
    dil: Literal["csharp", "python", "js", "php"] | None = None
    tur: list[Tur] = Field(min_length=1, max_length=4)
    digerMetin: str = Field(default="", max_length=100)
    url: str = Field(default="", max_length=2000)
    baslatmaKomutu: str = Field(default="", max_length=300)
    # Dosya yüklemek yerine sunucudaki örnek projeyi kullan: "blog-api"
    ornek: str | None = None

    @field_validator("tur")
    @classmethod
    def _sirala(cls, tur: list[str]) -> list[str]:
        return [t for t in TUR_SIRASI if t in tur]


def secimi_coz(metin: str) -> Secim:
    """multipart'taki `secim` JSON metnini doğrular ve kurallara göre denetler."""
    try:
        s = Secim.model_validate_json(metin)
    except ValidationError as h:
        alanlar = ", ".join(str(e["loc"][0]) for e in h.errors() if e.get("loc"))
        raise SecimHatasi(f"Seçim geçersiz ({alanlar or 'biçim'}).") from h

    if s.alan not in AKTIF_ALANLAR:
        raise SecimHatasi("Şimdilik yalnızca Web alanı test edilebiliyor.")
    if s.kaynak == "github":
        raise SecimHatasi("GitHub repo erişimi henüz hazır değil. Şimdilik kodu yükleyerek dene.")
    if s.alan in ("oyun", "mobil") and s.tur != ["birim"]:
        raise SecimHatasi("Oyun ve Mobil alanlarında yalnızca birim testi yapılır.")
    if s.alan == "mobil" and s.dil == "python":
        raise SecimHatasi("Mobil alanında Python desteklenmiyor.")
    if s.alan == "diger" and not s.digerMetin.strip():
        raise SecimHatasi("Diğer alanı için alanını kısaca yaz.")

    if s.kaynak == "url":
        if "birim" in s.tur:
            raise SecimHatasi("URL ile testte birim testi yapılamaz; kaynak kod gerekir.")
        parca = urlsplit(s.url.strip())
        if parca.scheme not in ("http", "https") or not parca.hostname or not ("." in parca.hostname or parca.hostname == "localhost"):
            raise SecimHatasi("Geçerli bir site adresi gir (http:// ya da https:// ile).")
        s.url, s.dil, s.ornek = s.url.strip(), None, None
    else:
        if not s.dil:
            raise SecimHatasi("Test edilecek dili seç.")
        if s.ornek is not None:
            if s.ornek not in ORNEK_PROJELER:
                raise SecimHatasi("Böyle bir örnek proje yok.")
            s.dil = ORNEK_PROJELER[s.ornek]
        s.url = ""
    s.digerMetin = s.digerMetin.strip() if s.alan == "diger" else ""
    return s
