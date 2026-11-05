# Faz 1 — Arayüz İskeleti (Antigravity için uygulama spesifikasyonu)

> Bu dosya projenin `docs/` klasörüne konur ve Antigravity'deki ajana referans olarak verilir.
> Proje: **LLM Ajanları ile Kod Yorumlama ve Otomatik Test Üretimi Platformu** (bitirme tezi).
> Ekip: TAN, Hümeyra. Danışman: Murat Hoca.

---

## 0. Bu fazın amacı ve sınırı

- **Yalnızca frontend.** Backend ve ajanlar bu fazda yok. Tüm veriler **sahte (mock)** ve tek bir `services/api.js` dosyasından gelir.
- Mock fonksiyonlar, ileride gelecek gerçek backend ile **aynı imzaya** sahip olmalı. Böylece Faz 2'de yalnızca `api.js` değişir, bileşenler değişmez.
- Kod **sade ve okunabilir** olmalı: ekip, sunumda her dosyayı anlatabilecek. Gereksiz soyutlama kullanılmaz.

---

## 1. Teknoloji kuralları (kesin)

| Konu | Karar |
|---|---|
| Çatı | React 18 + Vite |
| Dil | **Düz JavaScript (.jsx)**. TypeScript **yok**. |
| Stil | Tailwind CSS v4. Renkler `src/theme.css` içindeki CSS değişkenlerinden gelir. |
| İkonlar | `lucide-react` |
| Kod görüntüleyici | `@monaco-editor/react`, yalnızca rapordaki "Kod" ve "Üretilen Testler" sekmelerinde, salt-okunur |
| Sayfa yönlendirme | **Yok.** Tek sayfa. `react-router` kullanılmaz. |
| Durum yönetimi | `App.jsx` içinde `useState`. Redux/Zustand **yok**. |
| UI kütüphanesi | **Yok.** shadcn, MUI vb. kullanılmaz. Bileşenler elle yazılır. |
| Yorumlar | Türkçe, kısa |

---

## 2. Klasör yapısı

```
src/
  main.jsx
  App.jsx                    # ekran durumu: 'yukle' | 'calisiyor' | 'rapor'; modal; drawer; kullanıcı; tema
  theme.css                  # tüm renk değişkenleri (açık + koyu)
  services/
    api.js                   # mock backend (bkz. bölüm 7)
  mock/
    runEvents.js             # canlı akış olayları
    report.js                # örnek rapor verisi
    history.js               # geçmiş testler
  components/
    Header.jsx
    ThemeToggle.jsx
    AuthModal.jsx            # giriş / kayıt / şifremi unuttum / mail gönderildi (tek modal)
    HistoryDrawer.jsx
    home/
      Hero.jsx
      ConfigCard.jsx
      HowItWorks.jsx
      AgentLoop.jsx
      ReportPreview.jsx
    run/
      RunSummaryBar.jsx
      LiveStats.jsx
      AgentTimeline.jsx
    report/
      ReportHeader.jsx
      CoverageDonut.jsx
      SummaryCards.jsx
      CodeTab.jsx
      UiTestsTab.jsx
      BugsTab.jsx
      TestsTab.jsx
```

---

## 3. Tema ve renkler (`src/theme.css`)

Renkler **yalnızca** bu değişkenlerle kullanılır. Bileşenlerde sabit hex yazılmaz. Tek istisna mor vurgu `#7C3AED` ve beyaz buton yazısıdır.

Koyu tema `<html data-theme="dark">` ile açılır. Tercih `localStorage`'da (`tema` anahtarı) saklanır. İlk ziyarette `prefers-color-scheme` esas alınır. Koyu modda `color-scheme: dark` ayarlanır.

| Değişken | Açık | Koyu | Kullanım |
|---|---|---|---|
| `--bg` | #F8FAFC | #0B1120 | sayfa zemini, iç dolgular |
| `--surface` | #FFFFFF | #131C2E | kartlar, inputlar |
| `--soft` | #F1F5F9 | #1E293B | sekme zemini, segment seçici |
| `--panel` | #0F172A | #1A2340 | koyu paneller ("Arkada ne oluyor?", kod bloğu) |
| `--on-panel` | #F8FAFC | #F8FAFC | panel üstü yazı |
| `--text` | #0F172A | #E2E8F0 | ana metin |
| `--text-2` | #334155 | #CBD5E1 | ikincil metin |
| `--muted` | #475569 | #94A3B8 | açıklama metni |
| `--border` | #E2E8F0 | #243049 | kart kenarı, ilerleme çubuğu zemini |
| `--border-strong` | #CBD5E1 | #334155 | input kenarı, kesikli çerçeve |
| `--accent` | #7C3AED | #7C3AED | **ajan / vurgu**: ana butonlar, AI ikonları, aktif adım |
| `--ok` | #10B981 | #10B981 | geçti (dolgu, çubuk, işaret) |
| `--bad` | #EF4444 | #EF4444 | kaldı (dolgu, çubuk, işaret) |
| `--ok-text` | #047857 | #34D399 | yeşil **metin** |
| `--bad-text` | #B91C1C | #F87171 | kırmızı **metin** |
| `--ai-text` | #6D28D9 | #A78BFA | mor **metin** |
| `--ok-bg` | #ECFDF5 | rgba(16,185,129,.14) | yeşil rozet zemini |
| `--bad-bg` | #FEF2F2 | rgba(239,68,68,.14) | kırmızı rozet zemini |
| `--ai-bg` | #F5F3FF | rgba(124,58,237,.16) | mor zemin (aktif adım, AI Insight) |
| `--ai-border` | #DDD6FE | rgba(167,139,250,.35) | mor kenar |

> Not: #10B981 ve #EF4444 beyaz zeminde **yazı rengi olarak kullanılmaz** (okunmaz). Yazıda `--ok-text` / `--bad-text` kullanılır.

Tailwind v4'te bu değişkenler `@theme inline` ile sınıflara bağlanır. Örnek: `--color-surface: var(--surface)` → `bg-surface`.

Yazı tipleri: **Inter** (arayüz), **JetBrains Mono** (kod, dosya adları). Google Fonts'tan yüklenir.

---

## 4. Uygulama durumları (`App.jsx`)

```js
screen:  'yukle' | 'calisiyor' | 'rapor'
user:    null | { ad, eposta }
modal:   null | 'giris' | 'kayit' | 'sifre' | 'sifreGonderildi'
pendingStart: boolean     // kullanıcı "Başlat"a bastı ama giriş yapmamıştı
drawerOpen: boolean        // Geçmiş Testlerim paneli
config:  { dosya, alan, dil, tur, digerMetin, baslatmaKomutu }
runId, events[], report
```

Kurallar:
- `screen === 'yukle'` iken açılış ekranı görünür. Diğer ekranlarda karşılama bölümleri **gizlenir**.
- **Başlat**: `user` yoksa → `modal='giris'`, `pendingStart=true`. Giriş başarılı olursa test **otomatik başlar**, seçimler kaybolmaz.
- Test başlayınca `screen='calisiyor'`. Son olay (`type:'done'`) gelince `screen='rapor'`.
- **Yeni sayfa açılmaz**, adres çubuğu değişmez.

---

## 5. Ekranlar

### 5.1 Üst menü (`Header.jsx`) — her durumda görünür
- Solda logo ve **CodeGuard** ("Code" metin rengi, "Guard" mor). Tıklayınca `screen='yukle'`.
- Sağda:
  - Giriş yapılmamışsa: **ThemeToggle** · "Giriş Yap" (metin buton) · "Kayıt Ol" (mor buton)
  - Giriş yapılmışsa: **ThemeToggle** · "Geçmiş Testlerim" · avatar (baş harfler) · "Çıkış"
- ThemeToggle: ay/güneş ikonlu kare buton. `aria-label` "Gece moduna geç" ya da "Gündüz moduna geç".

### 5.2 Açılış (`screen==='yukle'`), yukarıdan aşağıya
1. **Hero** (ortalı):
   - Mor rozet: "LLM ajanlarıyla otonom test üretimi"
   - Başlık: "Kodunu yükle, **ajanlar test etsin.**" (ikinci kısım mor)
   - Açıklama paragrafı
   - 3 rozet: "Birim + Arayüz (E2E) testi" · "C# · Python · JS/TS" · "Kendini düzelten ajanlar"
2. **ConfigCard (tam genişlik)**, başlığı "Test Konfigürasyonu":
   - **Büyük sürükle-bırak alanı**: kesikli çerçeve, büyük yükleme ikonu, "Kodunu buraya sürükle bırak", "Klasör, dosya ya da .zip · en fazla 5 MB / 200 dosya", "Bilgisayarından seç" butonu. Dosya seçilince altında dosya adı, dosya sayısı, boyut ve "Yüklendi" yazısı görünür.
     - Klasör seçimi için `<input type="file" webkitdirectory>`, tek dosya/zip için ayrı bir input.
     - `node_modules`, `bin`, `obj`, `venv`, `.git` klasörleri sayıma katılmaz.
     - 5 MB ya da 200 dosya aşılırsa kırmızı uyarı gösterilir.
   - Yan yana 3 alan:
     - **Test alanı** (`<select>`): Web · Oyun · Mobil · Genel · Diğer…
     - **Dil** (`<select>`): Python · C# · JavaScript / TypeScript
     - **Test türü** (3'lü segment buton): Birim · Arayüz · İkisi
   - Kurallar:
     - Alan **Mobil** ise Python seçeneği pasif olur. Seçiliyse JS/TS'ye geçilir.
     - Alan **Oyun** ya da **Mobil** ise Arayüz ve İkisi pasif olur, tür otomatik Birim'e döner. Altında not: "Bu alanda birim testi yapılır. Arayüz (E2E) testleri şimdilik yalnızca web arayüzleri için."
     - Alan **Diğer** ise metin kutusu açılır: "Alanını kısaca yaz", en fazla 100 karakter.
     - Tür **Arayüz** ya da **İkisi** ise "Başlatma komutu (isteğe bağlı, boş bırakırsan otomatik bulunur)" alanı açılır. Monospace font, örnek: `uvicorn main:app`.
   - Tam genişlikte mor **"Testi Başlat"** butonu. Dosya yoksa pasif.
   - Giriş yapılmamışsa butonun altında küçük not: "Testi başlatmak için giriş yapman istenecek."
3. **HowItWorks**: 4 numaralı kart, her birinde ikon, numara, başlık ve kısa açıklama:
   - 01 Kodunu yükle
   - 02 Alanını ve dilini seç
   - 03 Ajanlar test etsin
   - 04 Raporunu al
4. **AgentLoop** (koyu `--panel`, başlık üstünde "ARKADA NE OLUYOR?"):
   - 4 kutu ve aralarında oklar: **Planla** (LLM ajanı) → **Uygula** (LLM ajanı) → **Doğrula** (Sandbox) → **Rapor**. LLM kutuları koyu mor, diğerleri koyu gri.
   - Kesikli şerit: "Kapsanmayan satır ya da başarısız test varsa ajan Uygula adımına geri döner: ilk deneme + en fazla 3 tekrar."
   - Alt şerit: "SANDBOX ÇIKTISI (binlerce satır log, XML, HTML)" → **"STANDARDİZASYON KATMANI"** (mor kutu) → "AJANA GİDEN" + örnek JSON `{"kapsanmadi": "AddItem · qty <= 0 dalı"}`
5. **ReportPreview** ("Raporunda neler olacak?"), 3 kart:
   - Satır satır kapsama (renkli mini kod)
   - AI Insight balonu
   - Olası hata kartı

### 5.3 Çalışıyor (`screen==='calisiyor'`)
1. **RunSummaryBar**: tek satır: dosya adı · "Web · Python · İkisi" · sağda kırmızı kenarlı "Durdur" butonu. Durdur'a basılırsa `screen='yukle'`.
2. **"Ajanlar ve Süreç (canlı akış)"** kartı:
   - Sağ üstte yanıp sönen mor nokta ve "Tur 2 / 4"
   - **LiveStats**, 3 kutu:
     - Kod coverage (% ve çubuk)
     - Etkileşim kapsamı (x / y ve çubuk)
     - Geçen test (yeşil) / Olası hata (kırmızı)
   - **AgentTimeline**: dikey zaman çizelgesi. Her olay bir satır:
     - Solda daire: tamamlandıysa yeşil + tik, aktifse mor halka. Daireler arasında dikey çizgi.
     - Sağda kart: ajan adı (kalın) · tür etiketi (LLM'ler mor, diğerleri gri) · sağda durum ("Çalışıyor…" mor / "Tamamlandı" yeşil) · altında mesaj.
     - Aktif olay kartı mor zeminli.
     - Yeni olay en alta eklenir. Sayfa yeni olaya yumuşakça kayar.
   - Ajan adları: Planlayıcı Ajan, Test Yazıcı Ajan, Doğrulayıcı · Standardizasyon Katmanı, UI Keşif, UI Test Yazıcı Ajan, UI Doğrulayıcı · Standardizasyon Katmanı, İçgörü Ajanı.
- **Token sayısı ya da maliyet kullanıcıya gösterilmez.**

### 5.4 Rapor (`screen==='rapor'`)
1. **ReportHeader**: yeşil rozet "Tamamlandı · 4 turda", başlık "Sonuçlar ve Rapor", alt satırda proje ve seçimler, sağda "+ Yeni Test" butonu (konfigürasyona döner).
2. **Özet kartı**:
   - Solda **CoverageDonut**: SVG halka, yeşil dolgu, ortada büyük "%94" ve altında "Kod coverage".
   - Ortada **SummaryCards**:
     - Etkileşim kapsamı (22 / 24)
     - Üretilen test (58; altında 52 birim · 6 arayüz)
     - Olası hata (3, kırmızı)
     - Kalite skoru: "Hesaplanıyor…" (mor). Mutasyon testi arka planda çalışır; sonuç gelince sayı görünür. Mock'ta 3 sn sonra "%81" gelsin.
   - Sağda iki buton: "Testleri İndir (.zip)" (çerçeveli) ve "PDF Raporu Al" (mor). Mock'ta yalnızca uyarı ya da konsol çıktısı.
3. **Sekmeler** (`role="tablist"`; aktif sekme mor yazı ve mor alt çizgi):
   - **Kod**:
     - Lejant: yeşil Kapsandı, kırmızı Kapsanmadı · tıkla AI Insight, gri Motor bağımlı
     - Monaco salt-okunur. Satırlar arka planla renklenir (decoration API): kapsanan yeşil, kapsanmayan kırmızı, motor bağımlı gri.
     - Kırmızı bir satıra tıklanınca altta mor **AI Insight** kutusu açılır: "AI Insight · Satır 12" + açıklama.
   - **Arayüz Testleri**: solda "Test edilen akışlar" listesi (Geçti/Kaldı rozeti, akış adı, sayfa yolu), sağda "Sayfa bazında etkileşim kapsamı" (yol, x/y, çubuk; eksikse kırmızı "Kapsanmayan: …").
   - **Olası Hatalar**: kartlar. Her kartta tür rozeti (Birim/Arayüz), başlık, konum (monospace) ve "Ajanın gerekçesi: …".
   - **Üretilen Testler**: üstte koyu panelde seçili test dosyası (Monaco, salt-okunur) ve "Kopyala" butonu. Altında dosya tablosu: Dosya · Tür · Test · Sonuç (yeşil/kırmızı metin). Satıra tıklanınca üstteki kod değişir.

### 5.5 AuthModal
- Tek modal, ortada. Arkası yarı saydam lacivert. ESC ve × ile kapanır. Odak modal içinde tutulur.
- `giris`: E-posta, Şifre (yanında "Şifremi unuttum"), "Giriş Yap", altta "Hesabın yok mu? Kayıt ol".
  - `pendingStart` ise üstte mor not: "Testi başlatmak için giriş yapmalısın. Seçimlerin kaybolmaz."
- `kayit`: Ad Soyad, E-posta, Şifre, "Hesap Oluştur", altta "Zaten hesabın var mı? Giriş yap".
- `sifre`: E-posta, "30 dakika geçerli, tek kullanımlık bağlantı göndereceğiz", "Sıfırlama Bağlantısı Gönder".
- `sifreGonderildi`: "Bu adres kayıtlıysa sıfırlama bağlantısı gönderildi…", "Girişe dön".
- Basit doğrulama: boş alan, e-posta biçimi, şifre en az 8 karakter. Hatalar alanın altında kırmızı metinle gösterilir.

### 5.6 HistoryDrawer
- Sağdan açılır, 400 px genişlik (mobilde tam genişlik). Arkası karartılır.
- Başlık "Geçmiş Testlerim" ve × butonu.
- Her kayıt bir buton: proje adı, durum rozeti (Tamamlandı yeşil / Kurulum hatası kırmızı), alt satırda "Web · Python · İkisi · %94 · 26.10.2026". Tıklanınca o raporu açar.

---

## 6. Mock veri biçimleri (Faz 2'de backend aynı biçimi döndürecek)

**Canlı olay** (`mock/runEvents.js`; WebSocket mesajını taklit eder):
```js
{
  type: 'agent_step',            // ya da 'done'
  agent: 'Test Yazıcı Ajan',
  kind: 'LLM · Tur 2',           // etiket
  message: 'Kapsanmayan 18 dal için 9 test eklendi.',
  round: 2, maxRounds: 4,
  metrics: { coverage: 71, uiCovered: 0, uiTotal: 24, passed: 48, bugs: 1 }
}
```
Örnek akış (12 olay, ~1,3 sn aralıkla):
1. Planlayıcı: Kod Haritası çıkarıldı, 38 birim
2. Planlayıcı: plan hazır
3. Test Yazıcı (Tur 1): 46 test yazıldı
4. Doğrulayıcı (Tur 1): 41/46 geçti, %34
5. UI Keşif: 6 sayfa, 24 öğe
6. Test Yazıcı (Tur 2): 9 test eklendi
7. Doğrulayıcı (Tur 2): %71, 1 olası hata
8. UI Test Yazıcı: 6 akış
9. UI Doğrulayıcı: 5/6 geçti
10. Test Yazıcı (Tur 3): kalan dallar
11. Doğrulayıcı (Tur 3): %94, döngü durdu
12. İçgörü Ajanı: rapor hazırlanıyor

Ardından `{type:'done', runId}` gelir.

**Rapor** (`mock/report.js`):
```js
{
  runId, proje: 'blog-api', alan: 'web', dil: 'python', tur: 'ikisi', tarih, turSayisi: 4,
  coverage: { testEdilebilir: 94, toplam: 89 },
  etkilesim: { kapsanan: 22, toplam: 24 },
  testSayisi: { birim: 52, arayuz: 6 },
  kaliteSkoru: null,             // sonradan gelir
  dosyalar: [{ yol: 'app/posts.py', kod: '...', satirlar: { kapsanan: [..], kapsanmayan: [12, 23], motorBagimli: [] } }],
  icgoruler: { 'app/posts.py:12': 'Ajan 4 turda bu satıra ulaşamadı…' },
  akislar: [{ ad: 'Kayıt olma', sayfa: '/register', gecti: true }],
  sayfalar: [{ yol: '/posts/new', kapsanan: 5, toplam: 6, eksik: ['"Taslak kaydet" butonu'] }],
  olasiHatalar: [{ tur: 'arayuz', baslik, konum, gerekce }],
  testDosyalari: [{ yol: 'tests/unit/test_posts.py', tur: 'birim', sayi: 18, sonuc: '17 geçti · 1 olası hata', kod: '...' }]
}
```

---

## 7. `services/api.js` (mock, gerçek API imzası)

```js
export async function login(eposta, sifre)            // → { ad, eposta }
export async function register(ad, eposta, sifre)     // → { ad, eposta }
export async function forgotPassword(eposta)          // → { ok: true }
export async function startRun(config)                // → { runId }
export function subscribeRun(runId, onEvent)          // setInterval ile olayları gönderir; durdurma fonksiyonu döner
export async function stopRun(runId)
export async function getReport(runId)                // → rapor
export async function getQualityScore(runId)          // 3 sn bekler → { kaliteSkoru: 81 }
export async function getHistory()                    // → geçmiş liste
```
Her fonksiyon `await new Promise(r => setTimeout(r, 400))` ile gecikme taklidi yapar.

---

## 8. Erişilebilirlik ve duyarlılık

- Tüm tıklanabilir öğeler gerçek `<button>` ya da `<a>`. Div'e `onClick` verilmez.
- Her input'un bir `<label>`'ı vardır. İkon-only butonlarda `aria-label` bulunur.
- Dokunma alanları en az 40–44 px.
- Telefon genişliğinde (≤ 640 px):
  - Yan yana alanlar alt alta dizilir.
  - Tablolar yatay kaydırılabilir kutuda gösterilir.
  - Üst menü sarar.

---

## 9. Kabul kriterleri (Faz 1 bitti sayılması için)

- [ ] `npm run dev` ile açılış ekranı görünüyor. Hero, tam genişlik konfigürasyon kartı, Nasıl çalışır, Arkada ne oluyor ve Rapor önizlemesi yer alıyor.
- [ ] Gece modu çalışıyor, tercih yenilemede korunuyor.
- [ ] Alan, dil ve tür kuralları (Mobil→Python pasif, Oyun/Mobil→yalnız Birim, Diğer→metin, Arayüz→başlatma komutu) çalışıyor.
- [ ] Giriş yapmadan Başlat → giriş modalı → giriş → test otomatik başlıyor.
- [ ] Canlı akış 12 olayı sırayla gösteriyor, istatistikler güncelleniyor, Durdur çalışıyor.
- [ ] Akış bitince aynı sayfada rapor açılıyor. 4 sekme ve AI Insight çalışıyor, kalite skoru 3 sn sonra geliyor.
- [ ] Geçmiş paneli açılıyor ve kayda tıklayınca rapor geliyor.
- [ ] Kayıt, şifremi unuttum ve mail gönderildi adımları modal içinde çalışıyor.
- [ ] Hiçbir bileşende sabit hex renk yok (`#7C3AED` ve beyaz buton yazısı hariç).
- [ ] Konsolda hata yok.

## 10. Bu fazda yapılmayacaklar

Gerçek backend, gerçek dosya yükleme sunucusu, WebSocket, LLM, Docker, gerçek PDF/zip üretimi, react-router, TypeScript, UI kütüphaneleri, kullanıcıya token gösterimi, BYOK.
