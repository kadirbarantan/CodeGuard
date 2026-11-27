"""CodeGuard oturum token'ı (JWT). GitHub'ın kendi token'ı burada saklanmaz.

Kısa ömürlü imzalı bilgiler (ör. GitHub hesabı bağlanırken "hangi kullanıcı" bilgisi) de aynı anahtarla
imzalanır ama bir `amac` alanı taşır. Bu yüzden oturum token'ı yerine kullanılamazlar.
"""
from datetime import datetime, timedelta, timezone

import jwt

from app import ayarlar

ALGORITMA = "HS256"


def _anahtar() -> str:
    if not ayarlar.JWT_SECRET:
        raise RuntimeError("JWT_SECRET tanımlı değil (.env).")
    return ayarlar.JWT_SECRET


def token_uret(kullanici_id: str) -> str:
    simdi = datetime.now(timezone.utc)
    yuk = {"sub": kullanici_id, "iat": simdi, "exp": simdi + timedelta(days=ayarlar.JWT_SURE_GUN)}
    return jwt.encode(yuk, _anahtar(), algorithm=ALGORITMA)


def token_coz(token: str) -> str | None:
    """Geçerli bir oturum token'ıysa kullanıcı id'sini, değilse None döner."""
    try:
        yuk = jwt.decode(token, ayarlar.JWT_SECRET, algorithms=[ALGORITMA])
    except jwt.PyJWTError:
        return None
    return None if "amac" in yuk else yuk.get("sub")


def kisa_imzala(amac: str, dakika: int, **veri) -> str:
    """Birkaç dakikalık, yalnızca `amac` için geçerli imzalı bilgi."""
    simdi = datetime.now(timezone.utc)
    yuk = {**veri, "amac": amac, "iat": simdi, "exp": simdi + timedelta(minutes=dakika)}
    return jwt.encode(yuk, _anahtar(), algorithm=ALGORITMA)


def kisa_coz(metin: str | None, amac: str) -> dict | None:
    if not metin:
        return None
    try:
        yuk = jwt.decode(metin, ayarlar.JWT_SECRET, algorithms=[ALGORITMA])
    except jwt.PyJWTError:
        return None
    return yuk if yuk.get("amac") == amac else None
