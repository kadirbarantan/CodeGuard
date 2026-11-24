"""E-posta + şifreyle kayıt ve giriş.

- POST /auth/kayit  { ad, eposta, sifre } → 201 { ...kullanıcı, token }
- POST /auth/giris  { eposta, sifre }     → 200 { ...kullanıcı, token }

Dönen biçim GitHub/Google girişiyle aynı: kullanıcı nesnesi + CodeGuard oturum token'ı.
Şifre en az 8 karakter (AuthModal.jsx'teki kuralla aynı); Argon2id ile özetlenip saklanır.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, Field

from app.auth.kullanicilar import disari_ver, eposta_ile_bul, eposta_ile_olustur
from app.auth.sifre import sifre_dogrula, sifre_ozetle
from app.auth.token import token_uret

router = APIRouter(prefix="/auth", tags=["e-posta"])


class KayitIstegi(BaseModel):
    ad: str = Field(min_length=1, max_length=100)
    eposta: EmailStr
    sifre: str = Field(min_length=8, max_length=128)


class GirisIstegi(BaseModel):
    eposta: EmailStr
    sifre: str = Field(min_length=1, max_length=128)


@router.post("/kayit", status_code=201)
def kayit(istek: KayitIstegi):
    if not istek.ad.strip():
        raise HTTPException(422, "Ad boş bırakılamaz.")
    kullanici = eposta_ile_olustur(istek.ad, istek.eposta, sifre_ozetle(istek.sifre))
    if not kullanici:
        raise HTTPException(409, "Bu e-postayla bir hesap zaten var. Giriş yap ya da GitHub / Google ile devam et.")
    return {**disari_ver(kullanici), "token": token_uret(kullanici["id"])}


@router.post("/giris")
def giris(istek: GirisIstegi):
    kullanici = eposta_ile_bul(istek.eposta)
    # Kullanıcı yoksa da şifre doğrulaması çalışır; hata mesajı hangisinin yanlış olduğunu söylemez
    if not sifre_dogrula(istek.sifre, kullanici["sifre_hash"] if kullanici else None):
        raise HTTPException(401, "E-posta ya da şifre hatalı.")
    return {**disari_ver(kullanici), "token": token_uret(kullanici["id"])}
