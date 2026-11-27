"""GitHub sekmesinin uçları (giriş gerekli; biçimler frontend/src/services/api.js'teki mock'la aynı).

- GET  /github/repolar               → [{ ad, gizli, dil }]
- GET  /github/dallar?repo=          → [{ ad, commit }]
- GET  /github/agac?repo=&dal=       → [{ yol, boyut }]   (içerik indirilmez)
- POST /github/baglam                → { baglam: [{ yol, neden }], tumRepo }   (Bağlam Çözümleyici)

Kullanıcı repolara erişim vermemişse ya da App'i GitHub'da kaldırdıysa 410 döner; site
"Repolarına erişim ver" adımına geri döner.
"""
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.auth.kullanicilar import github_kurulumu_sil
from app.auth.oturum import aktif_kullanici
from app.github import repo as gh
from app.github.uygulama import GithubHatasi, KurulumYok

router = APIRouter(prefix="/github", tags=["github"])


def kurulum_al(kullanici: dict) -> int:
    if not kullanici.get("github_kurulum_id"):
        raise HTTPException(410, KurulumYok().mesaj)
    return kullanici["github_kurulum_id"]


async def calistir(kullanici: dict, islem):
    """GitHub hatalarını Türkçe mesajlı HTTP hatasına çevirir; kaldırılmış kurulumu siler."""
    try:
        return await islem(kurulum_al(kullanici))
    except KurulumYok as h:
        github_kurulumu_sil(kullanici["id"])
        raise HTTPException(h.kod, h.mesaj) from h
    except GithubHatasi as h:
        raise HTTPException(h.kod, h.mesaj) from h


@router.get("/repolar")
async def repolar(kullanici: dict = Depends(aktif_kullanici)):
    return await calistir(kullanici, gh.repolar)


@router.get("/dallar")
async def dallar(repo: str, kullanici: dict = Depends(aktif_kullanici)):
    return await calistir(kullanici, lambda k: gh.dallar(k, repo))


@router.get("/agac")
async def agac(repo: str, dal: str, kullanici: dict = Depends(aktif_kullanici)):
    async def islem(k):
        _commit, dosyalar = await gh.agac(k, repo, dal)
        return [{"yol": d["yol"], "boyut": d["boyut"]} for d in dosyalar]

    return await calistir(kullanici, islem)


class BaglamIstegi(BaseModel):
    repo: str
    dal: str
    secilenler: list[str] = Field(max_length=2000)
    tur: list[Literal["birim", "arayuz", "kullanilabilirlik", "erisilebilirlik"]] = Field(default=[], max_length=4)


@router.post("/baglam")
async def baglam(istek: BaglamIstegi, kullanici: dict = Depends(aktif_kullanici)):
    if not istek.secilenler:
        return {"baglam": [], "tumRepo": False}
    return await calistir(kullanici, lambda k: gh.baglam_hesapla(k, istek.repo, istek.dal, istek.secilenler, istek.tur))
