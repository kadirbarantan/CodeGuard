"""Yazı uçları: oluşturma, listeleme, okuma ve silme."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from .core.config import get_page_size
from .db import get_db
from .pagination import paginate

router = APIRouter()

EN_FAZLA_ICERIK = 5000


class YaziGirdisi(BaseModel):
    baslik: str
    icerik: str


@router.post("/posts", status_code=201)
def create_post(girdi: YaziGirdisi):
    """Yeni bir yazı oluşturur ve döndürür.

    - Başlık boşsa ya da yalnızca boşluktan oluşuyorsa 400 döner.
    - İçerik 5000 karakterden uzunsa 413 döner.
    - Her yazıya benzersiz bir kimlik (id) verilir.
    """
    if not girdi.baslik:
        raise HTTPException(400, "Başlık boş olamaz")
    if len(girdi.icerik) > EN_FAZLA_ICERIK:
        raise HTTPException(413, "İçerik çok uzun")
    db = get_db()
    yazi = {"id": len(db) + 1, "baslik": girdi.baslik, "icerik": girdi.icerik}
    db.append(yazi)
    return yazi


@router.get("/posts")
def list_posts(page: int = 1):
    """Yazıları sayfa sayfa listeler. Geçersiz sayfa için 400 döner."""
    try:
        return paginate(get_db(), page, get_page_size())
    except ValueError as hata:
        raise HTTPException(400, str(hata)) from hata


@router.get("/posts/{post_id}")
def get_post(post_id: int):
    """Kimliği verilen yazıyı döndürür; yoksa 404."""
    yazi = next((p for p in get_db() if p["id"] == post_id), None)
    if yazi is None:
        raise HTTPException(404, "Yazı bulunamadı")
    return yazi


@router.delete("/posts/{post_id}", status_code=204)
def delete_post(post_id: int):
    """Kimliği verilen yazıyı siler; yoksa 404."""
    db = get_db()
    for sira, yazi in enumerate(db):
        if yazi["id"] == post_id:
            del db[sira]
            return None
    raise HTTPException(404, "Yazı bulunamadı")
