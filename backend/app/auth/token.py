"""CodeGuard oturum token'ı (JWT). GitHub'ın kendi token'ı burada saklanmaz."""
from datetime import datetime, timedelta, timezone

import jwt

from app import ayarlar

ALGORITMA = "HS256"


def token_uret(kullanici_id: str) -> str:
    if not ayarlar.JWT_SECRET:
        raise RuntimeError("JWT_SECRET tanımlı değil (.env).")
    simdi = datetime.now(timezone.utc)
    yuk = {"sub": kullanici_id, "iat": simdi, "exp": simdi + timedelta(days=ayarlar.JWT_SURE_GUN)}
    return jwt.encode(yuk, ayarlar.JWT_SECRET, algorithm=ALGORITMA)


def token_coz(token: str) -> str | None:
    """Geçerliyse kullanıcı id'sini, değilse None döner."""
    try:
        return jwt.decode(token, ayarlar.JWT_SECRET, algorithms=[ALGORITMA])["sub"]
    except jwt.PyJWTError:
        return None
