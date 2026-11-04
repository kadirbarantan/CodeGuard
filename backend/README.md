# Backend

FastAPI uygulaması. Şu an yalnızca **GitHub ve Google ile giriş** iskeleti var (bkz. `../docs/github-oauth.md`, `../docs/google-oauth.md`).
Faz 2'de kullanıcı/oturum (e-posta + şifre), dosya yükleme ve test çalıştırma API'si eklenecek;
sonraki fazlarda ajanlar (LangGraph), sandbox ve Standardizasyon Katmanı da bu klasöre gelecek.

## Çalıştırma

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env          # macOS/Linux: cp .env.example .env  → değerleri doldur
uvicorn app.main:app --reload --port 8000
```

API belgesi: http://localhost:8000/docs

## Klasörler

```
app/
├── main.py            FastAPI uygulaması, CORS
├── ayarlar.py         .env okuma
└── auth/
    ├── github.py      /auth/github/login, /auth/github/callback
    ├── google.py      /auth/google/login, /auth/google/callback (OpenID Connect + PKCE)
    ├── pencere.py     açılır pencerenin son sayfası (sonucu FRONTEND_URL'e iletir)
    ├── oturum.py      /auth/me
    ├── token.py       CodeGuard JWT üretme/çözme
    └── kullanicilar.py  GEÇİCİ bellek içi kullanıcı deposu (Faz 2'de PostgreSQL)
```
