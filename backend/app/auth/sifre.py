"""Şifre özetleme (Argon2id). Şifrenin kendisi hiçbir yerde saklanmaz."""
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

_hasher = PasswordHasher()

# Olmayan bir e-postayla girişte de aynı süre harcansın diye (hangi e-postaların kayıtlı olduğu sezdirilmez)
_SAHTE_OZET = _hasher.hash("codeguard-sahte-sifre")


def sifre_ozetle(sifre: str) -> str:
    return _hasher.hash(sifre)


def sifre_dogrula(sifre: str, ozet: str | None) -> bool:
    try:
        return _hasher.verify(ozet or _SAHTE_OZET, sifre) and ozet is not None
    except (VerificationError, InvalidHashError):
        return False
