# GitHub ile Giriş (OAuth)

Danışman isteği (03.11.2026): giriş/kayıt ekranına "GitHub ile Devam Et" seçeneği.
Kapsam: yalnızca **kimlik** (giriş/kayıt). GitHub reposu okunmaz; ileride "repodan test et" istenirse ayrı izin (`repo`) ve ayrı karar gerekir.

## Kullanıcı açısından
1. Giriş Yap ya da Kayıt Ol modalında en üstte **GitHub ile Devam Et** butonu vardır, altında "veya e-postayla" ayırıcı.
2. Butona basınca küçük bir GitHub penceresi açılır; kullanıcı izin verir, pencere kendiliğinden kapanır.
3. Sonrası e-postayla girişle aynıdır: ilk girişte "Profilini tamamla", test bekliyorsa otomatik başlar.
   Ana sayfa yerinden ayrılmadığı için **yüklenen dosya ve seçimler korunur** (K12).

## Akış

```
Frontend (açılır pencere)        Backend (FastAPI)                         GitHub
/auth/github/login'i açar  ──►   state üret, çereze yaz, yönlendir  ──►   izin ekranı
                           ◄──   /auth/github/callback?code&state   ◄──   kullanıcı onaylar
                                 1. state == çerez mi? (CSRF önlemi)
                                 2. code → GitHub access token (client_secret sunucuda)
                                 3. GET /user ve /user/emails
                                 4. kullanıcıyı bul / bağla / oluştur → CodeGuard JWT
token'ı postMessage ile al ◄──   5. HTML sayfa token'ı yalnızca FRONTEND_URL'e iletir
GET /auth/me (Bearer token) ──►  kullanıcı bilgisi
```

## Hesap eşleştirme kuralı
1. Bu GitHub hesabı (github_id) daha önce bağlandıysa → o kullanıcı.
2. Değilse GitHub'ın **doğrulanmış birincil** e-postası mevcut bir CodeGuard hesabıyla aynıysa → o hesaba bağlanır.
3. Hiçbiri yoksa yeni hesap açılır (şifresiz; yalnızca GitHub ile girer).

## Güvenlik notları
- `client_secret` yalnızca backend'de, `.env` içinde. Frontend'e asla girmez.
- `state` parametresi + httpOnly çerez ile CSRF önlenir.
- İstenen izin en az düzeyde: `read:user user:email`.
- GitHub'ın access token'ı saklanmaz; yalnızca kimlik okumak için bir kez kullanılır.
- `postMessage` hedefi sabit `FRONTEND_URL`; frontend de mesajın backend origin'inden geldiğini kontrol eder.

## Kurulum (her geliştirici bir kez)
1. GitHub → Settings → Developer settings → **OAuth Apps** → New OAuth App
   - Application name: `CodeGuard (yerel)`
   - Homepage URL: `http://localhost:5173`
   - Authorization callback URL: `http://localhost:8000/auth/github/callback`
2. Client ID'yi ve oluşturulan Client Secret'ı `backend/.env` dosyasına yaz (`backend/.env.example`'dan kopyala). `JWT_SECRET` de üret.
3. Backend: `uvicorn app.main:app --reload --port 8000` (ayrıntı: `backend/README.md`)
4. Frontend: `frontend/.env.local` içine `VITE_API_URL=http://localhost:8000`, sonra `npm run dev`.

> Bir OAuth App tek callback adresi kabul eder. Canlı ortam (VPS + Vercel) için ayrı bir OAuth App açılır;
> callback `https://<backend-alan-adı>/auth/github/callback`, `FRONTEND_URL=https://code-guard-rose.vercel.app`.

## Mock modu
`VITE_API_URL` tanımlı değilse (şu anki Vercel yayını dahil) buton GitHub'a gitmez: ~1 sn sonra
`GitHub Kullanıcısı` (`codeguard-demo`) adlı örnek hesapla giriş yapılmış sayılır. Böylece arayüz backend olmadan da denenebilir.

## Dosyalar
| Dosya | Görev |
|---|---|
| `frontend/src/components/GitHubButonu.jsx` | Buton ve "veya e-postayla" ayırıcı |
| `frontend/src/components/AuthModal.jsx` | Butonun giriş/kayıt görünümüne eklenmesi, hata mesajı |
| `frontend/src/services/api.js` | `githubIleGiris()` — mock ya da gerçek akış |
| `frontend/src/services/githubOAuth.js` | Açılır pencere + postMessage + `/auth/me` |
| `backend/app/auth/github.py` | `/auth/github/login`, `/auth/github/callback` |
| `backend/app/auth/oturum.py` | `/auth/me` |
| `backend/app/auth/token.py` | JWT |
| `backend/app/auth/kullanicilar.py` | Geçici kullanıcı deposu (Faz 2'de PostgreSQL) |

## Faz 2'ye kalanlar
- `kullanicilar.py` → PostgreSQL tablosu (`github_id`, `github_kullanici_adi` sütunları; `sifre_hash` NULL olabilir).
- E-posta + şifre girişi de aynı JWT'yi üretmeli; böylece `/auth/me` iki yol için ortak kalır.
- Açılır pencere engellenirse kullanıcıya mesaj gösteriliyor; gerekirse tam sayfa yönlendirme yedeği eklenebilir
  (bu durumda seçimler `sessionStorage`'a yazılmalı, yüklenen dosya yeniden seçilmeli).
- Buton şu an genel bir dal ikonu kullanıyor. İstenirse GitHub'ın resmî logo dosyası (github.com/logos) marka kurallarına uygun şekilde `src/assets/` altına eklenebilir.
