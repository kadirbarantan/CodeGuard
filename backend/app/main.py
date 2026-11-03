"""CodeGuard backend giriş noktası.

Çalıştırma (backend klasöründe):  uvicorn app.main:app --reload --port 8000
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import ayarlar
from app.auth.github import router as github_router
from app.auth.oturum import router as oturum_router

app = FastAPI(title="CodeGuard API")

# Yalnızca kendi frontend'imiz API'yi tarayıcıdan çağırabilir
app.add_middleware(
    CORSMiddleware,
    allow_origins=[ayarlar.FRONTEND_URL],
    allow_methods=["*"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(github_router)
app.include_router(oturum_router)
