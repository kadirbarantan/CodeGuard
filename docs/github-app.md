# GitHub App: repo erişimi (GitHub sekmesi)

CodeGuard GitHub'la ilgili her şey için **tek bir GitHub App** kullanır:
- **Giriş penceresindeki "GitHub ile Devam Et":** yalnızca kimlik. App kurulumu istenmez.
- **Sitedeki GitHub sekmesi:** kimliğe ek olarak kullanıcının seçtiği repolara **salt okunur** erişim. Kullanıcı hangi repoları vereceğini GitHub'da kendisi seçer ve istediği an geri alabilir.

Eski OAuth App girişi (`docs/github-oauth.md`, `backend/app/auth/github.py`) 27.11.2026'dan beri siteden çağrılmıyor. `.env`'deki `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` boş kalabilir.

Her geliştirici kendi App'ini oluşturur, çünkü dönüş adresi `localhost`'tur. Canlı ortam için ayrı bir App açılır.

## 1. App'i oluştur
GitHub → Settings → Developer settings → GitHub Apps → **New GitHub App**

| Alan | Değer |
|---|---|
| GitHub App name | dünyada tek olmalı, ör. `codeguard-<ad>-dev` |
| Homepage URL | `http://localhost:5173` |
| Callback URL (Redirect URI) | `http://localhost:8000/auth/github-app/callback` |
| Request user authorization (OAuth) during installation | ✔ |
| Redirect on update | ✔ |
| Expire user authorization tokens | varsayılan kalabilir |
| Enable Device Flow | ✘ |
| Setup URL | boş (gri olması normal) |
| Webhook → Active | ✘ |
| Repository permissions → Contents | **Read-only** (Metadata kendiliğinden read-only) |
| Account permissions → Email addresses | **Read-only** |
| Where can this GitHub App be installed? | Any account |

Oluşturduktan sonra App sayfasında:
- **App ID** ve **Client ID**'yi not et. Bunlar gizli değildir.
- **Generate a new client secret** → çıkan değer gizlidir. Yalnızca `backend/.env`'e yazılır.
- **Generate a private key** → bir `.pem` dosyası iner. Gizlidir.
  - Repo klasörünün **dışına** taşı (ör. `D:\codeguard-gizli\`). Repo OneDrive'daki Masaüstü'ndeyse bu daha da önemli.
  - Sohbete yapıştırılmaz, GitHub'a gönderilmez.

## 2. `backend/.env`
```
GITHUB_APP_ID=<App ID>
GITHUB_APP_SLUG=<App adresindeki kısa ad: github.com/apps/BU-KISIM>
GITHUB_APP_CLIENT_ID=<Client ID>
GITHUB_APP_CLIENT_SECRET=<client secret>
GITHUB_APP_PRIVATE_KEY_PATH=D:/codeguard-gizli/<dosya>.pem
GITHUB_APP_REDIRECT_URI=http://localhost:8000/auth/github-app/callback
```
- Windows'ta da yolda `/` kullan (`D:/...`). `\` bazı durumlarda kaçış karakteri gibi okunur.
- Sonra `backend` klasöründe `alembic upgrade head` çalıştır (göç `0002`: `github_kurulum_id` sütunu).
- uvicorn'u yeniden başlat; `.env` yalnızca açılışta okunur.

## 3. Dene
1. `frontend/.env.local`: `VITE_API_URL=http://localhost:8000`. Adres **localhost** olmalı, Callback URL ile aynı. `127.0.0.1` yazılırsa pencere mesajı ve çerez eşleşmez, "Güvenlik doğrulaması başarısız" görülür.
2. Siteyi `http://localhost:5173` adresinden aç.
   - **Giriş Yap → "GitHub ile Devam Et":** yalnızca yetki ekranı gelir, pencere kapanınca giriş yapılmış olur. GitHub sekmesinde ilk kez "Repolarına erişim ver" görünür (App kurulu değilse).
   - **GitHub** sekmesi:
     - **Giriş yokken:** "GitHub ile Bağlan". Pencerede önce yetki, App kurulu değilse kurulum ekranı gelir (repoları sen seçersin). Pencere kapanınca giriş yapılmış olur.
     - **E-postayla girişliyken:** "GitHub Hesabını Bağla". GitHub hesabı mevcut hesaba bağlanır.
     - **GitHub ile girmiş ama erişim vermemişken:** "Repolarına erişim ver".
3. Repo → dal → dosya seç. "Otomatik eklenen" listesi Bağlam Çözümleyici'nin sonucudur.
4. Testi Başlat. Backend o commit'i indirir ve seçilen dosyaları açar.

Repo listesini değiştirmek için: sitedeki "Repo listesini düzenle" ya da GitHub → Settings → Applications → Installed GitHub Apps → Configure.

## Nasıl çalışır (backend)
- `app/auth/github_app.py`: giriş (`kur?giris=1`) ve bağlanma akışı. Her girişte kurulum bilgisi GitHub'dan yenilenir (App kaldırıldıysa `repoErisimi` false olur). Kullanıcının GitHub token'ı yalnızca kimliği ve kurulumu öğrenmek için bir kez kullanılır, saklanmaz.
  - Kurulum kimliği URL'den değil, kullanıcının kendi token'ıyla `/user/installations`'tan doğrulanır.
  - CSRF önlemi: imzalı çerez + state. Kurulum dönüşünde GitHub state göndermez; çerezdeki GitHub kimliği yeni dönüşün sahibiyle karşılaştırılır.
- `app/github/uygulama.py`: App JWT'si (`.pem`, RS256) → kurulum token'ı (1 saat, bellekte).
- `app/github/repo.py`: repolar, dallar, ağaç (Trees API), dosya içeriği (blob, bellek önbelleği), zip arşivi indirip açma.
- `app/github/baglam.py`: Bağlam Çözümleyici (manifestler + import grafiği; C#'ta proje bütünü; arayüz ve denetim testlerinde tüm repo).
- `app/github/router.py`: `/github/*` uçları. Biçimler: `docs/api-sozlesmesi.md` bölüm 3.

## Sorun çıkarsa
| Görülen | Neden / çözüm |
|---|---|
| "GitHub App ayarları eksik" | `.env`'de `GITHUB_APP_*` satırlarından biri boş, ya da uvicorn `.env`'den önce başlatıldı |
| "GitHub App özel anahtarı okunamadı" | `GITHUB_APP_PRIVATE_KEY_PATH` yanlış; dosya yolunu ve `/` kullanımını kontrol et |
| "GitHub App kimliği doğrulanamadı" | App ID ile `.pem` aynı App'e ait değil; ya da bilgisayar saati çok kaymış |
| GitHub sayfasında "redirect_uri is not associated" | App'teki Callback URL ile `.env`'deki `GITHUB_APP_REDIRECT_URI` birebir aynı değil |
| "Güvenlik doğrulaması başarısız" | site `127.0.0.1` ile açılmış ya da `VITE_API_URL` `127.0.0.1`; ikisi de `localhost` olmalı |
| Repo listesi boş | Kurulumda hiç repo seçilmemiş; "Repo listesini düzenle" |
