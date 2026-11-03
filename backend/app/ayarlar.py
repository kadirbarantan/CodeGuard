"""Ortam değişkenleri (.env) tek yerden okunur."""
import os

from dotenv import load_dotenv

load_dotenv()

GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", "")
GITHUB_REDIRECT_URI = os.getenv("GITHUB_REDIRECT_URI", "http://localhost:8000/auth/github/callback")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")

JWT_SECRET = os.getenv("JWT_SECRET", "")
JWT_SURE_GUN = int(os.getenv("JWT_SURE_GUN", "7"))

# Yerelde http, canlıda https: çerezin Secure bayrağı buna göre
CANLI = GITHUB_REDIRECT_URI.startswith("https://")
