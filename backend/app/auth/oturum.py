"""Oturumdaki kullanıcıyı döndüren uç: GET /auth/me (Authorization: Bearer <token>)."""
from fastapi import APIRouter, Header, HTTPException

from app.auth.kullanicilar import disari_ver, id_ile_bul
from app.auth.token import token_coz

router = APIRouter(prefix="/auth", tags=["oturum"])


def aktif_kullanici(authorization: str | None) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Giriş gerekli.")
    kullanici_id = token_coz(authorization.removeprefix("Bearer "))
    kullanici = id_ile_bul(kullanici_id) if kullanici_id else None
    if not kullanici:
        raise HTTPException(401, "Oturum geçersiz ya da süresi doldu.")
    return kullanici


@router.get("/me")
def ben(authorization: str | None = Header(default=None)):
    return disari_ver(aktif_kullanici(authorization))
