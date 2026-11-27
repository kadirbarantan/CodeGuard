"""Listeleri sayfalara bölen yardımcılar."""


def paginate(items, page, per_page=10):
    """items listesinin istenen sayfasını döndürür.

    - page 1'den küçükse 1. sayfa döner.
    - per_page 0 ya da negatifse ValueError fırlatır.
    - page, toplam sayfa sayısından büyükse ValueError fırlatır.
      Boş liste için yalnızca 1. sayfa geçerlidir.
    """
    if page < 1:
        page = 1
    if per_page <= 0:
        raise ValueError("per_page pozitif olmalı")
    total_pages = -(-len(items) // per_page)
    start = (page - 1) * per_page
    return {
        "items": items[start:start + per_page],
        "page": page,
        "total_pages": total_pages,
    }


def has_next(page, total_pages):
    """Sonraki sayfa varsa True döndürür."""
    if total_pages == 0:
        return False
    return page < total_pages


def has_prev(page):
    """Önceki sayfa varsa True döndürür."""
    return page > 1
