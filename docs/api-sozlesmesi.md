# API sözleşmesi (frontend ↔ backend)

Frontend'in `frontend/src/services/api.js` dosyasındaki her fonksiyonun backend'de hangi uca karşılık geldiğini ve verilerin biçimini tanımlar. Mock veriler bu biçimin örnekleridir. Backend aynı alanları aynı adlarla döndürür, böylece arayüz değişmez.

- **Durum:** ✅ backend'de hazır · ⏳ sıradaki adımlarda yazılacak (son güncelleme: 25.11.2026)
- **Adres:** yerelde `http://localhost:8000`. Frontend bu adresi `VITE_API_URL`'den okur; tanımlı değilse mock çalışır.
- **Biçim:** istek ve yanıtlar JSON. Alan adları frontend'deki gibi (`runId`, `profilTamam`, `maxRounds` …).
- **Giriş gereken uçlar:** `Authorization: Bearer <token>` başlığı. Token, kayıt ya da girişte döner (CodeGuard JWT, 7 gün).
- **Hata:** `{ "detail": "Kullanıcıya gösterilebilecek Türkçe mesaj" }`.
  - Durum kodları: 400 geçersiz istek, 401 giriş gerekli / hatalı, 404 bulunamadı (başkasının çalıştırması da 404), 409 çakışma, 413 yükleme çok büyük.
  - 422 alan doğrulama hatasıdır; `detail` bir liste olur. Frontend formları aynı kuralları zaten kendisi denetlediği için normalde görülmez.
- Her kullanıcı yalnızca kendi çalıştırmalarını görür.

## 1. Kimlik ve profil

| api.js | Uç | Durum |
|---|---|---|
| `register(ad, eposta, sifre)` | `POST /auth/kayit` `{ ad, eposta, sifre }` → 201 kullanıcı + `token` · 409 e-posta kayıtlı | ✅ |
| `login(eposta, sifre)` | `POST /auth/giris` `{ eposta, sifre }` → 200 kullanıcı + `token` · 401 | ✅ |
| (sayfa yenilenince) | `GET /auth/me` → kullanıcı | ✅ |
| `updateProfile(eposta, profil)` | `PUT /auth/me/profil` `{ ad, meslek, digerMeslek, diller }` → kullanıcı | ✅ |
| `githubIleGiris()` | `GET /auth/github/login` (açılır pencere) → token → `/auth/me` | ✅ |
| `googleIleGiris()` | `GET /auth/google/login` (açılır pencere) → token → `/auth/me` | ✅ |
| `forgotPassword(eposta)` | `POST /auth/sifre-sifirla` `{ eposta }` → her durumda `{ ok: true }` (kayıtlı olup olmadığı sezdirilmez) | ⏳ (e-posta servisi gerekir) |

**Kurallar:** şifre en az 8 karakter. E-posta küçük harfe çevrilerek saklanır. Aynı e-postayla ikinci kayıt 409 döner. GitHub/Google'ın doğruladığı e-posta var olan bir hesapla eşleşirse o hesaba bağlanır. GitHub/Google ile açılmış (şifresiz) hesapla şifre girişi 401 döner.

**Kullanıcı nesnesi:**
```json
{
  "ad": "Hümeyra",
  "eposta": "humeyra@ornek.com",
  "meslek": "web", "digerMeslek": "", "diller": ["python", "js"],
  "profilTamam": true,
  "github": { "kullaniciAdi": "humeyra-gh" },
  "google": null,
  "token": "…"
}
```
- `token` yalnızca kayıt/giriş yanıtında var.
- `meslek`, `digerMeslek` ve `diller` profil doldurulunca gelir. `meslek`: `oyun | web | mobil | genel | diger`. `diller`: `csharp | python | js | php`. `digerMeslek` yalnızca meslek `diger` ise dolu (en fazla 100 karakter).

## 2. Test çalıştırma

| api.js | Uç | Durum |
|---|---|---|
| `startRun(config)` | `POST /runs` (multipart) → 201 `{ runId }` | ✅ |
| `subscribeRun(runId, onEvent)` | `WS /runs/{runId}/olaylar` | ✅ |
| `stopRun(runId)` | `POST /runs/{runId}/durdur` → `{ ok: true }` | ✅ |
| `getReport(runId)` | `GET /runs/{runId}/rapor` → rapor · 409 henüz bitmedi ya da hata | ✅ |
| `getFileSource(runId, yol)` | `GET /runs/{runId}/dosya?yol=app/posts.py` → `{ yol, kod }` | ✅ |
| `getQualityScore(runId)` | `GET /runs/{runId}/kalite` → `{ kaliteSkoru }` (hesaplanıyorsa `null`, frontend birkaç saniyede bir tekrar sorar) | ✅ |
| `getHistory()` | `GET /runs` → geçmiş listesi (en yeni ilk, en fazla 50) | ✅ |

> **Şimdilik sahte motor (25.11.2026):** uçlar gerçek; yükleme, kayıt, canlı akış, durdurma ve geçmiş gerçekten çalışır. Ama adımlar ve rapor, gerçek test ajanı yazılana kadar sitenin mock verileriyle üretilir (`backend/app/sahte_motor`). Gerçek motor geldiğinde bu bölümdeki biçimler değişmez.

### 2.1 `POST /runs`: başlat
`multipart/form-data`, iki alan:
- `secim`: JSON metni
  ```json
  {
    "kaynak": "kod",
    "alan": "web", "dil": "python",
    "tur": ["birim", "arayuz"],
    "digerMetin": "", "url": "", "baslatmaKomutu": "",
    "ornek": null
  }
  ```
  - `ornek: "blog-api"`: dosya yüklemeden sunucudaki örnek projeyle test ("Örnek projeyle dene"). O zaman `dosyalar` gönderilmez, dil örnek projenin dili olur (blog-api: python).
  - `kaynak`: `kod | url | github`.
  - `tur`: en az bir öğe, `birim | arayuz | kullanilabilirlik | erisilebilirlik` (K22).
  - Kurallar arayüzdekiyle aynı (`config/testStratejileri.js`): şimdilik yalnızca `web` alanı; `url` kaynağında `birim` olmaz, `dil` boştur ve adres http(s) olmalı; `kod` kaynağında `dil` zorunlu; `diger` alanında `digerMetin` zorunlu. Kurala uymayan seçim 400 döner, `detail` kullanıcıya gösterilebilir Türkçe mesajdır.
- `dosyalar`: yalnızca `kaynak = kod` iken. Bir ya da birden fazla dosya:
  - **Klasör seçildiyse:** her dosya ayrı parça, dosya adı **göreli yol** (`blog-api/app/posts.py`). Tarayıcıda `formData.append('dosyalar', dosya, dosya.webkitRelativePath)`.
  - **.zip ya da tek dosya:** tek parça.
  - **Sınırlar (K5):** toplam 5 MB, 200 dosya (zip açılmış hâliyle). `node_modules`, `bin`, `obj`, `venv`, `.venv`, `.git`, `__pycache__` atlanır. Aşılırsa 413.
  - Bütün dosyalar tek bir üst klasördeyse (`blog-api/...`) proje adı o klasörün adı olur; zipte üst klasör yoksa zip'in adı.
  - **Güvenlik:** `../`, mutlak yol ve sürücü harfi içeren yollar 400 ile reddedilir; zipteki sembolik bağlantılar atlanır; şifreli zip kabul edilmez. Dosyalar yalnızca çalıştırmanın kendi klasörüne (`backend/yuklemeler/<runId>/kaynak`) yazılır.
- `kaynak = github` için `secim` içinde ek alan: `github: { repo, dal, secilenler: [yol…] }`. ⏳ GitHub App kurulduktan sonra (belge 08); şimdilik 400 "henüz hazır değil".

### 2.2 `WS /runs/{runId}/olaylar`: canlı akış
- Tarayıcı WebSocket'e başlık ekleyemediği için bağlandıktan sonraki **ilk mesaj** `{ "token": "…" }` olur (10 sn içinde).
- Kapatma kodları: 4400 ilk mesaj gelmedi ya da bozuk · 4401 token geçersiz · 4404 test yok ya da başkasının.
- Sunucu önce o ana kadarki olayları sırayla, sonra yenilerini gönderir. Sayfa yenilenince akış baştan oynar. Kaldığı yerden devam için ilk mesaja `"sonSira": 7` eklenebilir.
- **Adım olayı**, `mock/runEvents.js` ile aynı:
  ```json
  {
    "type": "agent_step", "sira": 3,
    "agent": "Test Yazıcı Ajan", "kind": "LLM · Tur 1",
    "message": "pytest ile 46 birim testi yazıldı.",
    "round": 1, "maxRounds": 4,
    "grup": "Birim + Arayüz",
    "metrics": { "coverage": 34, "uiCovered": 0, "uiTotal": 24, "passed": 41, "bugs": 0 }
  }
  ```
  - `grup` yalnızca birden fazla test grubu seçiliyse gelir: `Birim + Arayüz | Kullanılabilirlik | Erişilebilirlik | Ortak`.
  - `metrics` birikimlidir (son olaydaki değer geçerlidir). Kullanılabilirlikte `{ ux, desen, renk, bulgu }`, erişilebilirlikte `{ uyum, lighthouse, ihlal, kritik }`.
  - Yalnızca denetim seçildiyse `round` ve `maxRounds` 1 olur.
- **Bitiş:** `{ "type": "done", "runId": "…" }`. Ardından frontend raporu ister.
- **Durduruldu:** `{ "type": "durduruldu" }` (Durdur'a basıldıktan sonra bağlantı açıksa).
- **Kurulum / başlatma hatası (K5):** `{ "type": "hata", "durum": "kurulumHatasi", "mesaj": "requirements.txt kurulamadı: …" }`.

### 2.3 Rapor
Biçim mock dosyalarıyla birebir aynı. Alanların tam listesi oradadır:
- **Kod testleri** (birim ve/veya arayüz): `mock/report.js`.
  - Ana alanlar: `proje`, `alan`, `dil`, `tur`, `tarih`, `turSayisi`, `ilkCoverage`, `ilkEtkilesim`, `coverage { testEdilebilir, toplam }`, `etkilesim { kapsanan, toplam }`, `testSayisi { birim, arayuz }`, `kaliteSkoru`, `dosyalar`, `icgoruler`, `akislar`, `sayfalar`, `olasiHatalar`, `testDosyalari`, `kodYorumu`.
  - Test sonucu durumu (K24): `durum: gecti | kaldi | calistirilamadi`, `calistirilamadi` ise `neden`.
  - `dosyalar[]` içinde kaynak kod gelmez; `GET /runs/{id}/dosya` ile istenir.
- **Kullanılabilirlik:** `mock/uxReport.js`. **Erişilebilirlik:** `mock/erisimReport.js`.
- **Birden fazla grup seçildiyse** (K22): `{ ...seçim, runId, tur: [...], turSayisi, parcalar: [{ id: "kod" | "ux" | "erisim", ad, rapor }] }`. Tek grup seçildiyse doğrudan o grubun raporu döner.
- **URL ile testte** kaynak kod yoktur: `coverage: null`, `dosyalar: []`, birim sonuçları yok.

### 2.4 Geçmiş: `GET /runs`
`mock/history.js` ile aynı biçimde bir liste:
```json
[{ "runId": "…", "proje": "blog-api", "kaynak": "kod", "url": "", "durum": "tamamlandi",
   "alan": "web", "dil": "python", "tur": ["birim", "arayuz"],
   "coverage": 94, "uxSkor": null, "erisimSkor": null, "tarih": "26.10.2026" }]
```
`durum`: `bekliyor | calisiyor | tamamlandi | durduruldu | kurulumHatasi | hata`. Frontend şimdilik `tamamlandi` ve `kurulumHatasi`'nı gösteriyor. `hata` ve `kurulumHatasi`'nda ek alan `hata` (açıklama) gelir. Sunucu yeniden başlarsa yarıda kalan testler `hata` olur.

## 3. GitHub repo erişimi (⏳, belge 08)
`githubHesabiBagla`, `githubRepoErisimiVer`, `getGithubRepolari`, `getGithubDallari`, `getGithubAgaci` ve `getGithubBaglami` GitHub App kurulumundan sonra yazılacak. Biçimleri api.js'teki yorumlarda tanımlı. O zamana kadar gerçek backend modunda bu adımlar "henüz hazır değil" hatası verir.

## 4. Veritabanı karşılıkları (`backend/app/modeller.py`)
| Tablo | Ne tutar |
|---|---|
| `kullanicilar` | hesap, şifre özeti (Argon2id), GitHub/Google bağlantısı, `profil` (JSON) |
| `calistirmalar` | `runId`, sahibi, `proje`, `secim` (JSON), `durum`, `ozet` (geçmiş listesindeki skorlar), `hata` |
| `olaylar` | canlı akış olayları, `sira` ile (sayfa yenilenince tekrar oynatmak için) |
| `raporlar` | getReport'un döndürdüğü nesnenin tamamı (JSON), `kalite_skoru` |

## 5. Frontend'e kalanlar (api.js'yi gerçek uca bağlarken)
- **Örnek proje:** "Örnek projeyle dene" seçildiyse dosya yerine `secim.ornek = "blog-api"` gönderilir.
- **Canlı akış mesajları:** `done` dışında `durduruldu` ve `hata` da gelebilir; `hata`'da `mesaj` kullanıcıya gösterilir.
- **Yükleme kutusu dosyaların kendisini tutmalı.** `UploadBox` / `dosyaOlcum.js` şu an yalnızca `{ ad, sayi, boyut }` ölçüyor, dosyaları saklamıyor. Gönderebilmek için seçilen `File` listesi (göreli yollarıyla) de tutulmalı.
- **Token saklanmalı.** Giriş yanıtındaki `token`, `localStorage`'daki `kullanici` ile birlikte saklanır ve her isteğe `Authorization` başlığı olarak eklenir. 401 gelirse oturum kapatılıp giriş penceresi açılır.
- **Hata mesajları.** `detail` metni kullanıcıya gösterilir (ör. 409'daki "Bu e-postayla bir hesap zaten var").
