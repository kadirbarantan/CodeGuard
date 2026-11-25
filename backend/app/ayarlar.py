"""Ortam değişkenleri (.env) tek yerden okunur."""
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", "")
GITHUB_REDIRECT_URI = os.getenv("GITHUB_REDIRECT_URI", "http://localhost:8000/auth/github/callback")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/google/callback")

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")

# Veritabanı (PostgreSQL). Yerelde docker-compose.yml ile başlatılır; değerler oradakiyle aynı.
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg://codeguard:codeguard@localhost:5432/codeguard")

# Yüklenen kodların saklandığı klasör (her çalıştırma kendi alt klasöründe). GitHub'a gönderilmez (.gitignore).
YUKLEME_KLASORU = Path(os.getenv("YUKLEME_KLASORU") or Path(__file__).resolve().parent.parent / "yuklemeler")

# Sahte motor (geçici): canlı akışta iki adım arası bekleme, saniye. Testlerde 0 yapılabilir.
SAHTE_MOTOR_ADIM_SN = float(os.getenv("SAHTE_MOTOR_ADIM_SN") or "1.3")

JWT_SECRET = os.getenv("JWT_SECRET", "")
JWT_SURE_GUN = int(os.getenv("JWT_SURE_GUN", "7"))

# Yerelde http, canlıda https: çerezin Secure bayrağı buna göre
CANLI = GITHUB_REDIRECT_URI.startswith("https://") or GOOGLE_REDIRECT_URI.startswith("https://")
