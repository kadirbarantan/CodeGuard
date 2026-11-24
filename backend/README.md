# Backend

FastAPI uygulaması. Şu an olanlar:

- E-posta + şifreyle kayıt ve giriş, profil kaydı.
- GitHub ve Google ile giriş (bkz. `../docs/github-oauth.md`, `../docs/google-oauth.md`).
- PostgreSQL veritabanı (kullanıcılar; çalıştırma, olay ve rapor tabloları hazır).

Uçların ve verilerin biçimi: `../docs/api-sozlesmesi.md`. Sıradaki adımlar: dosya yükleme, test çalıştırma ve canlı akış (önce "sahte motor"), sonra sandbox, Kod Haritası ve ajanlar (bkz. Claude projesi belge 18).

## Gerekenler

- Python 3.11 ya da üstü
- Docker Desktop (veritabanı için; açık olmalı)

## İlk kurulum (bir kez)

Komutlar `backend` klasöründe çalıştırılır.

```bash
python -m venv .venv
.venv\Scripts\activate          # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env          # macOS/Linux: cp .env.example .env  → JWT_SECRET'ı doldur
docker compose up -d            # veritabanını başlat
alembic upgrade head            # tabloları kur
```

`JWT_SECRET` üretmek için: `python -c "import secrets; print(secrets.token_urlsafe(48))"`

## Her çalışmada

```bash
.venv\Scripts\activate
docker compose up -d            # Docker Desktop açıksa veritabanı birkaç saniyede kalkar
uvicorn app.main:app --reload --port 8000
```

- API belgesi (uçları tarayıcıdan denemek için): http://localhost:8000/docs
- Kurulum kontrolü: http://localhost:8000/saglik → `{"api": "çalışıyor", "veritabani": "bağlı"}`

Frontend'i gerçek backend'le çalıştırmak için `frontend/.env` dosyasına `VITE_API_URL=http://localhost:8000` yaz. Yazmazsan frontend mock veriyle çalışır.

## Tabloyu değiştirince

`app/modeller.py`'yi değiştirdikten sonra:

```bash
alembic revision --autogenerate -m "ne değişti"   # alembic/versions altına yeni göç dosyası
alembic upgrade head
```

Üretilen göç dosyası commit'e eklenir. Diğer kişi `git pull` sonrası yalnızca `alembic upgrade head` çalıştırır.

## Klasörler

```
docker-compose.yml     geliştirme veritabanı (PostgreSQL 17)
alembic.ini, alembic/  veritabanı göçleri
app/
├── main.py            FastAPI uygulaması, CORS, /saglik
├── ayarlar.py         .env okuma
├── db.py              veritabanı bağlantısı (SQLAlchemy)
├── modeller.py        tablolar: kullanicilar, calistirmalar, olaylar, raporlar
└── auth/
    ├── eposta.py      /auth/kayit, /auth/giris
    ├── sifre.py       şifre özetleme (Argon2id)
    ├── github.py      /auth/github/login, /auth/github/callback
    ├── google.py      /auth/google/login, /auth/google/callback (OpenID Connect + PKCE)
    ├── pencere.py     açılır pencerenin son sayfası (sonucu FRONTEND_URL'e iletir)
    ├── oturum.py      /auth/me, /auth/me/profil
    ├── token.py       CodeGuard JWT üretme/çözme
    └── kullanicilar.py  kullanıcı deposu (veritabanı)
```

## Sorun çıkarsa

- `/saglik` "bağlanamadı" diyorsa: Docker Desktop açık mı, `docker compose ps` ile `db` çalışıyor mu?
- 5432 portu doluysa (bilgisayarda ayrıca PostgreSQL kuruluysa): `docker-compose.yml`'de `127.0.0.1:5433:5432` yap, `.env`'deki adreste de portu `5433` yap.
