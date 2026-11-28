"""Ortam değişkenleri (.env) tek yerden okunur."""
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", "")
GITHUB_REDIRECT_URI = os.getenv("GITHUB_REDIRECT_URI", "http://localhost:8000/auth/github/callback")
# GitHub App (repo erişimi; belge: docs/github-app.md). OAuth App'ten (yukarısı, yalnızca giriş) ayrıdır.
GITHUB_APP_ID = os.getenv("GITHUB_APP_ID", "")
GITHUB_APP_SLUG = os.getenv("GITHUB_APP_SLUG", "")
GITHUB_APP_CLIENT_ID = os.getenv("GITHUB_APP_CLIENT_ID", "")
GITHUB_APP_CLIENT_SECRET = os.getenv("GITHUB_APP_CLIENT_SECRET", "")
# Özel anahtar (.pem) repo klasörünün DIŞINDA durur; burada yalnızca yolu var
GITHUB_APP_PRIVATE_KEY_PATH = os.getenv("GITHUB_APP_PRIVATE_KEY_PATH", "")
GITHUB_APP_REDIRECT_URI = os.getenv("GITHUB_APP_REDIRECT_URI", "http://localhost:8000/auth/github-app/callback")
# Gerçek GitHub dışında bir sunucuyla denemek için (testlerde sahte GitHub). Normalde boş bırakılır.
GITHUB_API_URL = (os.getenv("GITHUB_API_URL") or "https://api.github.com").rstrip("/")
GITHUB_WEB_URL = (os.getenv("GITHUB_WEB_URL") or "https://github.com").rstrip("/")

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

# Test motoru, birim ajanı (Faz 4; belge 25). Anahtar gizlidir: yalnızca .env'de durur, loglara ve yanıtlara yazılmaz.
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
# Ücretsiz katmanda günlük istek kotası geniş olan Flash-Lite geliştirme için; ölçüm için gemini-3.8-flash denenebilir
GEMINI_MODEL = (os.getenv("GEMINI_MODEL") or "gemini-3.5-flash-lite").strip()
# Dakikadaki en fazla model isteği (ücretsiz katman sınırının altında kalmak için)
GEMINI_DAKIKA_ISTEK = int(os.getenv("GEMINI_DAKIKA_ISTEK") or "10")
# Düşünme düzeyi: boş bırakılırsa modelin varsayılanı; low / medium / high
GEMINI_DUSUNME = (os.getenv("GEMINI_DUSUNME") or "").strip().lower()
# Çalıştırma başına token tavanı ve en fazla tur (K6)
AJAN_TOKEN_TAVANI = int(os.getenv("AJAN_TOKEN_TAVANI") or "200000")
AJAN_EN_FAZLA_TUR = int(os.getenv("AJAN_EN_FAZLA_TUR") or "4")

# Yerelde http, canlıda https: çerezin Secure bayrağı buna göre
CANLI = any(u.startswith("https://") for u in (GITHUB_REDIRECT_URI, GOOGLE_REDIRECT_URI, GITHUB_APP_REDIRECT_URI))
