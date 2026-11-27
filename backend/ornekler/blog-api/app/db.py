"""Bellekte tutulan basit veri deposu (gerçek veritabanı yerine)."""

_YAZILAR: list[dict] = []
_KULLANICILAR: list[dict] = []


def get_db() -> list[dict]:
    """Yazı listesini döndürür. Liste bellekte tutulur; uygulama kapanınca silinir."""
    return _YAZILAR


def get_users() -> list[dict]:
    """Kullanıcı listesini döndürür."""
    return _KULLANICILAR


def temizle() -> None:
    """Bütün kayıtları siler."""
    _YAZILAR.clear()
    _KULLANICILAR.clear()
