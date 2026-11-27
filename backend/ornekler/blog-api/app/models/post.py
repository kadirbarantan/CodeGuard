"""Yazı modeli."""
from dataclasses import dataclass


@dataclass
class Post:
    id: int
    baslik: str
    icerik: str

    def ozet(self, uzunluk: int = 100) -> str:
        """İçerik kısaysa olduğu gibi, uzunsa ilk `uzunluk` karakteri ve sonuna "..." döndürür."""
        if len(self.icerik) <= uzunluk:
            return self.icerik
        return self.icerik[:uzunluk] + "..."
