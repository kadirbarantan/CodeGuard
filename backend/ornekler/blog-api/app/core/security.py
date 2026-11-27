"""Şifre özetleme ve doğrulama."""
import hashlib

EN_AZ_UZUNLUK = 8


def hash_password(password: str) -> str:
    """Şifrenin SHA-256 özetini döndürür. Şifre 8 karakterden kısaysa ValueError fırlatır."""
    if len(password) < EN_AZ_UZUNLUK:
        raise ValueError("Şifre en az 8 karakter olmalı")
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(password: str, hashed: str) -> bool:
    """Şifre özetle eşleşiyorsa True, eşleşmiyorsa False döndürür. Hata fırlatmaz."""
    return hash_password(password) == hashed
