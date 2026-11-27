"""Uygulama ayarları (ortam değişkenlerinden okunur)."""
import os

DEFAULT_PAGE_SIZE = 10


def get_page_size() -> int:
    """Sayfa boyutunu PAGE_SIZE ortam değişkeninden okur.

    Değişken yoksa, sayı değilse ya da 1'den küçükse varsayılan değer (10) kullanılır.
    """
    value = os.getenv("PAGE_SIZE")
    if value is None:
        return DEFAULT_PAGE_SIZE
    return int(value)


def is_debug() -> bool:
    """DEBUG=1 ise True döndürür."""
    return os.getenv("DEBUG", "0") == "1"
