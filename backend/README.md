# Backend

FastAPI uygulaması. Şu an olanlar:

- E-posta + şifreyle kayıt ve giriş, profil kaydı; GitHub ve Google ile giriş (bkz. `../docs/github-oauth.md`, `../docs/google-oauth.md`).
- PostgreSQL veritabanı.
- Test çalıştırma: kod yükleme (klasör / .zip / tek dosya, örnek proje ya da URL), canlı akış (WebSocket), durdurma, rapor, Geçmiş Testlerim.
- **Sahte motor (geçici):** gerçek test ajanı yazılana kadar canlı akış adımlarını ve raporu sitenin mock verileriyle üretir. Gerçek motor (Faz 3–4) geldiğinde yalnızca `app/sahte_motor` değişir; uçlar aynı kalır.

Uçların ve verilerin biçimi: `../docs/api-sozlesmesi.md`. Sıradaki adım: sitenin bu uçlara bağlanması, sonra sandbox, Kod Haritası ve ajanlar (bkz. Claude projesi belge 18).

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
uvicorn app.main:app --reload --reload-dir app --port 8000
```

- API belgesi (uçları tarayıcıdan denemek için): http://localhost:8000/docs
- Kurulum kontrolü: http://localhost:8000/saglik → `{"api": "çalışıyor", "veritabani": "bağlı"}`

### Test çalıştırmayı denemek (`/docs`)

1. `POST /auth/giris` ile giriş yap, yanıttaki `token`'ı kopyala.
2. Sayfanın sağ üstündeki **Authorize** düğmesine bas, token'ı yapıştır (başına `Bearer` yazmadan) ve Authorize de. Artık bütün uçlar bu token'la çağrılır.
3. `POST /runs` → Try it out.
   - `secim`: `{"kaynak": "kod", "alan": "web", "dil": "python", "tur": ["birim"], "ornek": "blog-api"}` (örnek projeyle; dosya seçme)
   - ya da `"ornek"` olmadan `dosyalar`'a bir .zip seç.
4. Yanıttaki `runId` ile canlı akışı terminalde izle: `python araclar/canli_izle.py <runId> <token>`
5. Bitince `GET /runs/{run_id}/rapor` ve `GET /runs` (geçmiş).

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
araclar/
├── canli_izle.py      bir testin canlı akışını terminalde izler
└── ornek_veri_uret.mjs  sahte motorun örnek verisini frontend mock'larından üretir
app/
├── main.py            FastAPI uygulaması, CORS, /saglik; açılışta yarım kalan testleri kapatır
├── ayarlar.py         .env okuma
├── db.py              veritabanı bağlantısı (SQLAlchemy)
├── modeller.py        tablolar: kullanicilar, calistirmalar, olaylar, raporlar
├── calistirma/        test çalıştırma
│   ├── router.py      POST /runs, /runs/{id}/durdur, /rapor, /dosya, /kalite, GET /runs
│   ├── canli.py       WS /runs/{id}/olaylar (canlı akış)
│   ├── secim.py       test seçiminin kuralları
│   ├── yukleme.py     güvenli yükleme ve zip açma (5 MB / 200 dosya)
│   └── kayit.py       çalıştırma, olay ve rapor kayıtları
├── sahte_motor/       GEÇİCİ: adımları ve raporu mock verilerle üretir
│   ├── motor.py       çalıştırma döngüsü
│   ├── olaylar.py     canlı akış adımları (frontend runEvents.js ile aynı)
│   ├── rapor.py       rapor (frontend api.js getReport ile aynı)
│   └── ornek_veri.json  frontend mock'larından üretilir, elle düzenlenmez
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

- **Test "Ajanlar çalışıyor"da takılıyorsa ya da backend kendi kendine yeniden başlıyorsa:** uvicorn'u `--reload-dir app` ile başlattığından emin ol. Bu olmadan `--reload`, yüklenen kodlardaki `.py` dosyalarını (backend/yuklemeler) da izler; Python projesi yüklenince backend yeniden başlar ve test yarıda kalır.

- `/saglik` "bağlanamadı" diyorsa: Docker Desktop açık mı, `docker compose ps` ile `db` çalışıyor mu?
- 5432 portu doluysa (bilgisayarda ayrıca PostgreSQL kuruluysa): `docker-compose.yml`'de `127.0.0.1:5433:5432` yap, `.env`'deki adreste de portu `5433` yap.

## Notlar

- Yüklenen kodlar `backend/yuklemeler/<runId>/kaynak` altında durur (GitHub'a gönderilmez).
- Sunucu yeniden başlarsa (`--reload` dahil) yarıda kalan testler "hata" olarak kapatılır; testi yeniden başlatmak gerekir.
- Frontend mock'ları (`frontend/src/mock`) değişirse sahte motorun verisini yenile (repo kökünde, frontend'de `npm install` yapılmışken): `node backend/araclar/ornek_veri_uret.mjs`
