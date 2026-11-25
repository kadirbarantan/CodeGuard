"""Oturumdaki kullanıcı (Authorization: Bearer <token>).

- GET /auth/me          → kullanıcı nesnesi
- PUT /auth/me/profil   → ilk girişte ya da "Profilim"den profil kaydı

Başka uçlar giriş isterken `kullanici: dict = Depends(aktif_kullanici)` kullanır.
"""
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

from app.auth.kullanicilar import disari_ver, id_ile_bul, profil_guncelle
from app.auth.token import token_coz

router = APIRouter(prefix="/auth", tags=["oturum"])


# Swagger'da (/docs) sağ üstte "Authorize" düğmesi çıkar: token bir kez girilir, bütün uçlarda kullanılır
_bearer = HTTPBearer(auto_error=False, description="Giriş ya da kayıt yanıtındaki token (başına Bearer yazmadan)")


def aktif_kullanici(kimlik: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> dict:
    if not kimlik:
        raise HTTPException(401, "Giriş gerekli.")
    kullanici_id = token_coz(kimlik.credentials)
    kullanici = id_ile_bul(kullanici_id) if kullanici_id else None
    if not kullanici:
        raise HTTPException(401, "Oturum geçersiz ya da süresi doldu.")
    return kullanici


@router.get("/me")
def ben(kullanici: dict = Depends(aktif_kullanici)):
    return disari_ver(kullanici)


class ProfilIstegi(BaseModel):
    """Frontend'deki profil formuyla aynı alanlar (ProfileForm.jsx)."""

    ad: str = Field(min_length=1, max_length=100)
    meslek: Literal["oyun", "web", "mobil", "genel", "diger"]
    # Yalnızca meslek "diger" ise dolu; sistem promptuna VERİ olarak girer (K2)
    digerMeslek: str = Field(default="", max_length=100)
    diller: list[Literal["csharp", "python", "js", "php"]] = Field(min_length=1, max_length=4)


@router.put("/me/profil")
def profil_kaydet(istek: ProfilIstegi, kullanici: dict = Depends(aktif_kullanici)):
    profil = istek.model_dump()
    profil["ad"] = profil["ad"].strip()
    profil["digerMeslek"] = profil["digerMeslek"].strip() if istek.meslek == "diger" else ""
    profil["diller"] = list(dict.fromkeys(istek.diller))  # tekrarları at, sırayı koru
    return disari_ver(profil_guncelle(kullanici["id"], profil))
