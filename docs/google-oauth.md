# Google ile Giriş (OpenID Connect)

GitHub ile girişin ([github-oauth.md](github-oauth.md)) aynı deseni izler: açılır pencere, state çerezi,
sağlayıcı token'ı saklanmaz, aynı CodeGuard JWT'si üretilir.
Kapsam: yalnızca **kimlik** (giriş/kayıt). Drive, Gmail vb. hiçbir Google verisine erişilmez.

## Kullanıcı açısından
1. Giriş Yap modalında **Google ile Giriş Yap**, Kayıt Ol modalında **Google ile Kaydol** butonu vardır.
   GitHub butonunun yanında (dar ekranda altında), "veya e-postayla" ayırıcısının ve e-posta formunun üstündedir.
2. Butona basınca küçük bir Google penceresi açılır; kullanıcı hesabını seçer (`prompt=select_account`), pencere kapanır.
3. Sonrası e-postayla girişle aynıdır: ilk girişte "Profilini tamamla", test bekliyorsa otomatik başlar;
   ana sayfa yerinde kaldığı için yüklenen dosya ve seçimler korunur (K12).

## Akış

```
Frontend (açılır pencere)        Backend (FastAPI)                                Google
/auth/google/login'i açar  ──►   state + PKCE verifier + nonce üret,       ──►   hesap seçimi / izin
                                 httpOnly çereze yaz, yönlendir
                           ◄──   /auth/google/callback?code&state          ◄──   kullanıcı onaylar
                                 1. state == çerez mi? (CSRF önlemi)
                                 2. code + code_verifier → id_token (client_secret sunucuda)
                                 3. id_token: imza (Google JWKS), iss, aud, exp, nonce kontrolü
                                 4. email_verified değilse reddet
                                 5. kullanıcıyı bul / bağla / oluştur → CodeGuard JWT
token'ı postMessage ile al ◄──   6. HTML sayfa token'ı yalnızca FRONTEND_URL'e iletir
GET /auth/me (Bearer token) ──►  kullanıcı bilgisi (+ google: { eposta })
```

## Hesap eşleştirme kuralı
1. Bu Google hesabı (`google_id` = id_token'daki `sub`) daha önce bağlandıysa → o kullanıcı.
2. Değilse Google'ın **doğruladığı** e-posta (`email_verified: true`) mevcut bir CodeGuard hesabıyla aynıysa
   → o hesaba bağlanır. **GitHub ile açılmış hesap da dahil**; böylece aynı kişi iki yoldan da aynı hesaba girer.
3. Hiçbiri yoksa yeni hesap açılır (şifresiz; yalnızca Google ile girer).

Karar (04.11.2026): e-postası doğrulanmamış Google hesabıyla giriş **reddedilir**. Doğrulanmamış e-postayla
hesap bağlamak başkasının hesabını ele geçirmeye açık olur; yeni hesap açmak da aynı e-postayla ikinci hesap
yaratır. Gmail adresleri her zaman doğrulanmış gelir, bu durum yalnızca nadir kurumsal hesaplarda görülür.

## Güvenlik notları
- `client_secret` yalnızca backend'de, `.env` içinde. Frontend'e asla girmez.
- **state** + httpOnly çerez → CSRF önlenir.
- **PKCE (S256)**: kod yolda ele geçirilse bile `code_verifier` olmadan token'a çevrilemez.
- **nonce**: id_token'ın bu girişe ait olduğu, başka bir girişten tekrar kullanılmadığı doğrulanır.
- state, verifier ve nonce tek çerezde (`cg_google_state`, 10 dk, yalnızca `/auth/google` yolunda); sonuç sayfası çerezi siler.
- id_token'ın imzası Google'ın yayımladığı anahtarlarla (JWKS) doğrulanır; `iss`, `aud` (= bizim Client ID), `exp` kontrol edilir.
  Bunun için `PyJWT[crypto]` gerekir (`cryptography` paketi).
- Google'ın access token'ı ve id_token'ı **saklanmaz**; yalnızca kimliği okumak için bir kez kullanılır.
- `postMessage` hedefi sabit `FRONTEND_URL`; frontend mesajın backend origin'inden geldiğini kontrol eder (ortak kod: `oauthPencere.js`).

## Buton (Google marka kuralları)
- Resmî dört renkli "G" logosu, solda; renkleri ve oranları değiştirilmez (logo SVG'si `GoogleButonu.jsx` içinde).
- Açık tema: beyaz zemin, `#747775` kenarlık, `#1F1F1F` yazı. Koyu tema (gece modu): `#131314` zemin, `#8E918F` kenarlık, `#E3E3E3` yazı.
  Bu renkler `theme.css`'te `--google-*` değişkenleri olarak tanımlı; gece modunda otomatik değişir.
- Yazı tipi Roboto Medium (index.html'de Google Fonts'tan yüklenir), köşe 4 px.
- Metinler Google'ın önerdiği kalıpların Türkçesi: "Google ile Giriş Yap" / "Google ile Kaydol".
- Yükseklik 44 px: GitHub butonuyla aynı hizada ve dokunmatik ekranda rahat basılır.

## Kurulum: Google Cloud Console (her geliştirici bir kez)
1. https://console.cloud.google.com → üstteki proje seçicisinden **Yeni Proje**: `CodeGuard (yerel)`.
2. **APIs & Services → OAuth consent screen** (yeni arayüzde *Google Auth Platform → Branding*):
   - User type: **External**
   - App name: `CodeGuard`, User support email ve Developer contact: kendi e-postan
   - Scopes: `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile` (hassas olmayan kapsamlar; Google incelemesi gerekmez)
   - Publishing status **Testing** iken yalnızca **Test users** listesine eklenen hesaplar giriş yapabilir:
     ekipteki ve danışmandaki Google hesaplarını ekle (en fazla 100).
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**, Name: `CodeGuard (yerel)`
   - Authorized JavaScript origins: boş bırakılabilir (akış backend'de yürür)
   - Authorized redirect URIs: `http://localhost:8000/auth/google/callback`
4. Açılan pencereden **Client ID** ve **Client secret**'ı `backend/.env` dosyasına yaz:
   ```
   GOOGLE_CLIENT_ID=...apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=...
   GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback
   ```
   (`JWT_SECRET` ve `FRONTEND_URL` GitHub ile ortaktır, bkz. `backend/.env.example`.)
5. Bağımlılıkları güncelle: `pip install -r requirements.txt` (yeni: `PyJWT[crypto]`).
6. Backend: `uvicorn app.main:app --reload --port 8000`; frontend: `frontend/.env.local` içinde
   `VITE_API_URL=http://localhost:8000`, sonra `npm run dev`.

> Redirect URI birebir eşleşmeli (http/https, port, sondaki `/` dahil); yoksa Google `redirect_uri_mismatch` hatası verir.
> GitHub'dan farklı olarak bir Google istemcisine **birden fazla** redirect URI eklenebilir; canlı ortam için
> aynı istemciye `https://<backend-alan-adı>/auth/google/callback` eklenip `.env`'de `GOOGLE_REDIRECT_URI` değiştirilir.
> Canlıda herkesin girebilmesi için izin ekranı **In production**'a alınmalı (yalnızca temel kapsamlar olduğu için inceleme gerekmez).

## Mock modu
`VITE_API_URL` tanımlı değilse (Vercel'deki demo dahil) buton Google'a gitmez: ~1 sn sonra
`Google Kullanıcısı` (`google-demo@codeguard.dev`) adlı örnek hesapla giriş yapılmış sayılır.

## Dosyalar
| Dosya | Görev |
|---|---|
| `frontend/src/components/GoogleButonu.jsx` | Google marka kurallarına uygun buton |
| `frontend/src/components/AuthModal.jsx` | GitHub + Google butonları, giriş/kayıt metni, hata mesajı |
| `frontend/src/services/api.js` | `googleIleGiris()` — mock ya da gerçek akış |
| `frontend/src/services/googleOAuth.js` | Google için ince sarmalayıcı |
| `frontend/src/services/oauthPencere.js` | GitHub ve Google için ortak açılır pencere + postMessage + `/auth/me` |
| `frontend/src/theme.css` | `--google-*` renkleri ve `font-google` |
| `backend/app/auth/google.py` | `/auth/google/login`, `/auth/google/callback` |
| `backend/app/auth/pencere.py` | Açılır pencerenin son sayfası (GitHub ile ortak) |
| `backend/app/auth/kullanicilar.py` | `google_ile_bul_veya_olustur()` |

## Faz 2'ye kalanlar
- `users` tablosuna `google_id` (unique, NULL olabilir) ve `google_eposta` sütunları.
- Profil sayfasında bağlı hesapları (GitHub / Google) gösterme ve bağlantıyı kaldırma.
