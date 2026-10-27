# CodeGuard

**LLM Ajanları ile Kod Yorumlama ve Otomatik Test Üretimi Platformu**

Bitirme tezi projesi. Kullanıcı kodunu yükler; LLM ajanları birim ve arayüz (E2E) testlerini yazar, çalıştırır, eksik kalanları tamamlar ve sonucu raporlar.

Ekip: TAN, Hümeyra · Danışman: Murat Hoca

## Yol haritası

| Faz | İçerik | Durum |
|---|---|---|
| 1 | Arayüz (mock veri) | ✅ `v0.1-faz1-arayuz` |
| 2 | Backend temeli: FastAPI, kullanıcı/oturum, dosya yükleme, veritabanı | ⏳ |
| 3 | Analiz ve sandbox: Kod Haritası, Docker'da test çalıştırma, Standardizasyon Katmanı | |
| 4 | Birim test ajanı: Planla → Uygula → Doğrula döngüsü (LangGraph) | |
| 5 | Arayüz (E2E) test ajanı: Playwright | |
| 6 | Rapor ve değerlendirme: PDF/ZIP, kalite skoru, başarım raporu | |

## Klasör yapısı

```
CodeGuard/
├── frontend/   React arayüzü (Vite + Tailwind)
├── backend/    Python API ve ajanlar (Faz 2'den itibaren)
└── docs/       Faz spesifikasyonları ve tasarım belgeleri
```

## Arayüzü çalıştırma

```bash
cd frontend
npm install
npm run dev
```

Üretim derlemesi için `npm run build`.

> **Veriler şu an mock.** Faz 2'de `frontend/src/services/api.js` gerçek backend'e bağlanacak; bileşenler değişmeyecek.
>
> Monaco editörü dosyalarını CDN'den yükler; kod görüntüleyici için internet gerekir.

## Faz 1'de çalışanlar

- Açılış ekranı: yükleme alanı, alan/dil/test türü seçimi, "Nasıl çalışır" ve rapor önizlemesi
- Gece/gündüz teması (tercih saklanır)
- Giriş, kayıt ve şifremi unuttum akışı (mock oturum)
- Canlı ajan akışı ve Durdur
- Rapor ekranı: Kod (klasör ağacı, AI Insight), Arayüz Testleri, Olası Hatalar, Üretilen Testler
- Geçmiş Testlerim paneli

## Frontend klasör yapısı

```
frontend/src/
├── App.jsx            Ekran akışı (yükle → çalışıyor → rapor), oturum ve abonelik yönetimi
├── theme.css          Renk değişkenleri (açık/koyu tema) ve Tailwind bağlantısı
├── services/api.js    Gerçek API ile aynı imzaya sahip mock fonksiyonlar
├── mock/              Sahte canlı olaylar, rapor ve geçmiş verisi
└── components/
    ├── Header, AuthModal, HistoryDrawer, ThemeToggle, Toast
    ├── home/          Açılış ekranı
    ├── run/           Çalışma ekranı (özet satırı, canlı metrikler, ajan zaman çizelgesi)
    └── report/        Rapor ekranı (özet, sekmeler, dosya ağacı, kod görüntüleyici)
```

Teknoloji: React, Vite, Tailwind CSS, Monaco Editor, lucide-react.
