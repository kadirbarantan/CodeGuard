"""CodeGuard backend giriş noktası.

Çalıştırma (backend klasöründe):  uvicorn app.main:app --reload --port 8000
"""
from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from sqlalchemy import text
from fastapi.middleware.cors import CORSMiddleware

from app import ayarlar
from app.db import motor
from app.auth.eposta import router as eposta_router
from app.auth.github import router as github_router
from app.auth.google import router as google_router
from app.auth.oturum import router as oturum_router

app = FastAPI(title="CodeGuard API")

# Yalnızca kendi frontend'imiz API'yi tarayıcıdan çağırabilir
app.add_middleware(
    CORSMiddleware,
    allow_origins=[ayarlar.FRONTEND_URL],
    allow_methods=["*"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(eposta_router)
app.include_router(github_router)
app.include_router(google_router)
app.include_router(oturum_router)


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
