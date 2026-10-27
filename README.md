# CodeGuard

**LLM Ajanları ile Kod Yorumlama ve Otomatik Test Üretimi Platformu**

Bitirme tezi projesi. Kullanıcı kodunu yükler; LLM ajanları birim ve arayüz (E2E) testlerini yazar, çalıştırır, eksik kalanları tamamlar ve sonucu raporlar.

## Faz 1 kapsamı

Yalnızca **arayüz iskeleti**. Şunlar çalışır:

- Açılış ekranı: yükleme alanı, alan/dil/tür seçimi, "Nasıl çalışır" ve rapor önizlemesi
- Gece/gündüz teması (tercih saklanır)
- Giriş, kayıt ve şifremi unuttum akışı (mock oturum, `localStorage`)
- Canlı ajan akışı ve Durdur
- Rapor ekranı: Kod (AI Insight), Arayüz Testleri, Olası Hatalar, Üretilen Testler
- Geçmiş Testlerim paneli

> **Veriler şu an mock.** Faz 2'de `services/api.js` gerçek backend'e bağlanacak; bileşenler değişmeyecek.

## Kurulum

```bash
npm install
npm run dev
```

Üretim derlemesi için `npm run build`.

## Klasör yapısı

```
src/
├── App.jsx            Ekran akışı (yükle → çalışıyor → rapor), oturum ve abonelik yönetimi.
├── theme.css          Renk değişkenleri (açık/koyu tema) ve Tailwind bağlantısı.
├── services/
│   └── api.js         Gerçek API ile aynı imzaya sahip mock fonksiyonlar.
├── mock/              Sahte canlı olaylar, rapor ve geçmiş verisi.
└── components/
    ├── Header, AuthModal, HistoryDrawer, ThemeToggle   Ortak parçalar.
    ├── home/          Açılış ekranı (Hero, ConfigCard, yükleme, bilgilendirme bölümleri).
    ├── run/           Çalışma ekranı (özet satırı, canlı metrikler, ajan zaman çizelgesi).
    └── report/        Rapor ekranı (özet kartları, sekmeler, kod görüntüleyici).
```

Teknoloji: React, Vite, Tailwind CSS, Monaco Editor, lucide-react.

Not: Monaco editörü dosyalarını varsayılan olarak CDN'den yükler; kod görüntüleyici için internet gerekir.
