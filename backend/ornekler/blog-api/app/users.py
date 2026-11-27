"""Kullanıcı kayıtları."""
from .core.security import hash_password
from .db import get_users


def create_user(eposta: str, sifre: str) -> dict:
    """Yeni kullanıcı ekler ve şifreyi özetleyerek saklar.

    E-posta küçük harfe çevrilir. Aynı e-postayla ikinci kayıt ValueError fırlatır.
    """
    eposta = eposta.strip().lower()
    if find_user_by_email(eposta) is not None:
        raise ValueError("Bu e-posta zaten kayıtlı")
    kullanici = {"id": len(get_users()) + 1, "eposta": eposta, "sifre": hash_password(sifre)}
    get_users().append(kullanici)
    return kullanici


def find_user(user_id: int):
    """Kimliği verilen kullanıcıyı döndürür; yoksa None."""
    for kullanici in get_users():
        if kullanici["id"] == user_id:
            return kullanici
    return None


def find_user_by_email(eposta: str):
    """E-postası verilen kullanıcıyı döndürür; yoksa None."""
    eposta = eposta.strip().lower()
    for kullanici in get_users():
        if kullanici["eposta"] == eposta:
            return kullanici
    return None


def user_count() -> int:
    """Kayıtlı kullanıcı sayısı."""
    return len(get_users())
