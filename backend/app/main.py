"""CodeGuard backend giriş noktası.

Çalıştırma (backend klasöründe):  uvicorn app.main:app --reload --reload-dir app --port 8000
(--reload-dir app: yüklenen kodlar backend/yuklemeler altında; izlenirse her yüklemede sunucu yeniden başlar)
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from sqlalchemy import text

from app import ayarlar
from app.auth.eposta import router as eposta_router
from app.auth.github import router as github_router
from app.auth.github_app import router as github_app_router
from app.auth.google import router as google_router
from app.auth.oturum import router as oturum_router
from app.calistirma import kayit
from app.calistirma.canli import router as canli_router
from app.calistirma.router import router as calistirma_router
from app.db import motor
from app.github.router import router as github_repo_router


@asynccontextmanager
async def yasam_dongusu(_app: FastAPI):
    # Sunucu (ya da --reload) yeniden başlayınca yarıda kalan testler "hata" olarak kapatılır
    try:
        kayit.yarim_kalanlari_kapat()
    except Exception:  # noqa: BLE001 — veritabanı kapalıysa API yine açılır, /saglik bunu gösterir
        pass
    yield


app = FastAPI(title="CodeGuard API", lifespan=yasam_dongusu)

# Yalnızca kendi frontend'imiz API'yi tarayıcıdan çağırabilir
app.add_middleware(
    CORSMiddleware,
    allow_origins=[ayarlar.FRONTEND_URL],
    allow_methods=["*"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(eposta_router)
app.include_router(github_router)
app.include_router(github_app_router)
app.include_router(github_repo_router)
app.include_router(google_router)
app.include_router(oturum_router)
app.include_router(calistirma_router)
app.include_router(canli_router)


@app.get("/", include_in_schema=False)
def ana_sayfa():
    """Backend'in kendi sayfası yok; adresi açan kişi API belgesine yönlendirilir."""
    return RedirectResponse("/docs")


@app.get("/saglik", tags=["sağlık"])
def saglik():
    """Kurulum kontrolü: API ayakta mı, veritabanına bağlanabiliyor mu?"""
    try:
        with motor.connect() as baglanti:
            baglanti.execute(text("select 1"))
        return {"api": "çalışıyor", "veritabani": "bağlı"}
    except Exception:  # noqa: BLE001 — ayrıntı kullanıcıya gösterilmez
        return {"api": "çalışıyor", "veritabani": "bağlanamadı (docker compose up -d çalıştı mı?)"}
