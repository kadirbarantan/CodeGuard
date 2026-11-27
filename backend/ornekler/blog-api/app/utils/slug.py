"""Başlıktan adres metni (slug) üretir."""
import re


def slugify(metin: str) -> str:
    """Metni küçük harfli, tireli bir adres metnine çevirir.

    Türkçe harfler Latin karşılıklarına dönüştürülür: "Çay Saati" → "cay-saati".
    """
    metin = metin.lower().strip()
    metin = re.sub(r"[^a-z0-9]+", "-", metin)
    return metin.strip("-")
