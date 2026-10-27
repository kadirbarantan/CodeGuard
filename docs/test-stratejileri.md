# Test Stratejileri

> Danışman notu (Hafta 2): *"Kullanıcı sisteme ilk girişte temel ve mesleki bilgilerini girer. Sistem, seçilen kategori ve programlama diline göre test süreçlerini ayarlar. Test süreci sabit olmamalı, seçimlere göre değişmelidir."*

## 1. Kullanıcı profili
- İlk girişte (kayıttan hemen sonra) **"Profilini tamamla"** adımı açılır. Bu adımda şunlar girilir:
  - Ad soyad
  - **Meslek**: Web, Oyun, Mobil, Genel yazılım ya da Diğer (kısa metin)
  - **Kullanılan diller**: C#, Python, JS/TS (birden fazla seçilebilir)
- Profil tamamlanmadan test başlatılamaz.
- Profil, test konfigürasyonunun **varsayılanlarını** belirler. Alan ve dil profilden dolu gelir ve yanında "Profilinden" etiketi görünür. Kullanıcı bunları o test için değiştirebilir.
- Profil, sağ üstteki avatardan ("Profilim") düzenlenebilir.

## 2. Strateji: alan + dil + test türü → test süreci
Test süreci sabit değildir. Seçilen kombinasyona göre üç şey değişir:
- **Hangi adımların** çalışacağı
- **Hangi araçların** kullanılacağı
- **Ajanın nelere odaklanacağı**

Tanımlar `frontend/src/config/testStratejileri.js` dosyasındadır. Faz 2'de backend de aynı tanımları kullanacak.

| Alan | Test türleri | Ajanın odağı | Sürece eklenen adım |
|---|---|---|---|
| Web | Birim + API entegrasyon + Arayüz (E2E) | HTTP durum kodları, girdi doğrulama, yetkilendirme, veritabanı taklidi | Uygulamayı başlat ve sayfaları keşfet |
| Oyun | Birim | Oyun kuralları, durum makineleri, sabit tohumlu rastgelelik, sahte zaman, ondalık toleransı | Motor bağımlılık ayrıştırma (Unity / Pygame / Phaser) |
| Mobil | Birim | Async akışlar, ağ kopması ve çevrimdışı durum, platform API taklidi, ViewModel | Platform bağımlılık ayrıştırma (.NET MAUI / React Native) |
| Genel | Birim + özellik tabanlı | Sınır değerler, hata yolları, girdi doğrulama | Özellik tabanlı testler |
| Diğer | Genel ile aynı | Kullanıcının yazdığı alan bilgisi ajana iletilir | Özellik tabanlı testler |

Dile göre kullanılan araçlar:

| Dil | Birim | Taklit (mock) | API | Arayüz (E2E) | Özellik tabanlı | Kapsama |
|---|---|---|---|---|---|---|
| Python | pytest | unittest.mock | FastAPI TestClient | pytest-playwright | Hypothesis | coverage.py |
| JS/TS | Jest | jest.fn | supertest | @playwright/test | fast-check | istanbul |
| C# | xUnit | Moq | WebApplicationFactory | Playwright for .NET | FsCheck | coverlet |

Kurallar:
- Mobil alanında Python desteklenmez.
- Oyun ve Mobil alanlarında yalnızca birim testi yapılır. Arayüz (E2E) testleri şimdilik yalnızca web arayüzleri içindir.

## 3. Arayüzde nerede görünür?
- **Konfigürasyon kartı → "Bu testte neler yapılacak?"**: Seçime göre üretilen adımları, araçları ve odak konularını gösterir. Seçim değişince plan da anında değişir.
- **Canlı akış**: Ajan adımları stratejiden üretilir. Örneğin Oyun testinde "Bağımlılık Analizi" adımı vardır ama "UI Keşif" adımı yoktur. Web + İkisi seçildiğinde arayüz adımları da akışa eklenir.
