# Test Stratejileri

> Danışman notu (Hafta 2): *"Kullanıcı sisteme ilk girişte temel ve mesleki bilgilerini girer. Sistem, seçilen kategori ve programlama diline göre test süreçlerini ayarlar. Test süreci sabit olmamalı, seçimlere göre değişmelidir."*

## 1. Kullanıcı profili
- İlk girişte (kayıttan hemen sonra) **"Profilini tamamla"** adımı açılır. Bu adımda şunlar girilir:
  - Ad soyad
  - **Meslek**: Web, Oyun, Mobil, Genel yazılım ya da Diğer (kısa metin)
  - **Kullanılan diller**: C#, Python, JS/TS, PHP (birden fazla seçilebilir)
- Profil tamamlanmadan test başlatılamaz.
- Profil, test konfigürasyonunun **varsayılanlarını** belirler. Alan ve dil profilden dolu gelir ve yanında "Profilinden" etiketi görünür. Kullanıcı bunları o test için değiştirebilir.
- Profil, sağ üstteki avatardan ("Profilim") düzenlenebilir.
- Şimdilik yalnızca Web alanı aktif olduğu için meslek başka bir alan olsa bile varsayılan alan Web olur.

> Danışman notu (Hafta 3): PHP eklenmeli; şimdilik yalnızca web alanında ilerlenmeli, diğer alanlar gelecek çalışma olarak görünmeli; Kullanılabilirlik (UX/UI) testi eklenmeli; kod yüklemeden URL ile test yapılabilmeli.
>
> Danışman notu (Hafta 4): Erişilebilirlik testi eklenmeli (issue #11).

## 1a. Şu anki kapsam (Hafta 3)
- **Aktif alan: yalnızca Web.** Oyun, Mobil, Genel ve Diğer seçenekleri menüde "Yakında" rozetiyle pasif görünür; üzerine gelince ya da tıklanınca "Şu anda geliştirmeye devam etmektedir" yazar, seçilemez. Aşağıdaki tablolardaki diğer alan tanımları gelecek çalışma için korunur.
- **Diller:** C#, Python, JS/TS ve **PHP**. Web dışındaki alanlar seçicide "Yakında" rozetiyle gösterilir (ayrı bir bilgi notu yok).
- **Test türleri:** Birim · Arayüz · İkisi · **Kullanılabilirlik** · **Erişilebilirlik**.
- **Girdi:** "Kaynak Kod Yükle" ya da **"URL Gir"**. URL ile yalnızca Arayüz, Kullanılabilirlik ve Erişilebilirlik seçilebilir (birim testi için kaynak kod gerekir), dil seçimi gerekmez.

## 1b. Kullanılabilirlik (UX/UI) testi
Çalışan site üzerinde ölçülür; dilden bağımsızdır. Kaynak kod yüklendiyse uygulama başlatılır, URL girildiyse doğrudan site açılır.

| Adım | Ne yapılır | Araç |
|---|---|---|
| Sayfaları gez ve görüntü al | Sayfalar masaüstü ve mobil genişlikte açılır, ekran görüntüsü ve DOM düzeni alınır | Playwright |
| Okuma deseni (Z / F) | Logo, menü, başlık ve ana butonun konumu Z (görsel ağırlıklı) ya da F (metin ağırlıklı) desenine göre puanlanır | Playwright (öğe konumları) |
| Renk uyumu | Palet çıkarılır; renklerin uyumu ve aynı rengin hep aynı anlamda kullanılıp kullanılmadığı incelenir (kontrast Erişilebilirlik testinde) | Playwright |
| UX değerlendirmesi | LLM ajanı ekran görüntülerini görsel hiyerarşi, tutarlılık ve kullanım kolaylığına göre inceler | Gemini (görsel girdi) |
| İçgörü ve rapor | Bulgular önem sırasına (yüksek / orta / düşük) konur, her birine somut öneri yazılır | LLM |

Raporda: UX skoru, okuma deseni uyumu (sayfa bazında), renk paleti ve UX bulguları sekmeleri. Bu testte tur döngüsü yoktur; canlı akışta "Tur" yerine "Analiz ediliyor" görünür.

## 1b-2. Erişilebilirlik testi (issue #11)
Ayrı test türüdür; ölçüt **WCAG 2.2 AA**. Kullanılabilirlikten ayrı tutulmasının nedenleri: danışman notunda ayrı madde; kullanılabilirlik yoruma dayalıyken erişilebilirlik kurallara göre geçti/kaldı ölçülür; tezde ayrı başarım ölçüsü verir (WCAG uyum yüzdesi, ihlal sayısı, Lighthouse puanı).

Üç kaynakta da seçilebilir. URL ile site doğrudan açılır; kod yükleme ve GitHub ile uygulama başlatılır ("Başlatma komutu" kullanılır) ve ek olarak statik tarama yapılır.

| Adım | Ne yapılır | Araç |
|---|---|---|
| Statik tarama (yalnızca kod / GitHub) | Şablon ve bileşenler çalıştırılmadan taranır: eksik alt metin, etiketsiz form alanı, yanlış başlık sırası | JS/TS: eslint-plugin-jsx-a11y · Python: HTML şablon taraması · C#: Razor · PHP: Blade |
| Sayfaları gez | Sayfalar masaüstü ve mobil genişlikte açılır | Playwright |
| Otomatik WCAG taraması | Her sayfa WCAG 2.2 AA kurallarına göre taranır, kontrast oranları ölçülür (normal metin ≥ 4.5:1, büyük metin ≥ 3:1) | axe-core, Lighthouse |
| Klavye ve odak testi | Yalnızca Tab / Shift+Tab / Enter / Esc ile gezilir: her öğeye ulaşılıyor mu, odak görünüyor mu, sıra mantıklı mı, klavye tuzağı var mı | Playwright |
| Ekran okuyucu ağacı | Tarayıcının erişilebilirlik ağacı çıkarılır: ARIA rolleri, öğe adları, başlık sırası | Playwright (accessibility tree) |
| İçgörü ve rapor | İhlaller WCAG maddesine göre gruplanır, önem sırasına konur (kritik / ciddi / orta / düşük, axe-core etki düzeyi), düzeltme önerisi yazılır; kod varsa dosya ve satıra bağlanır | LLM |

Raporda: WCAG uyumu halkası (geçen / denetlenen ölçüt), Lighthouse erişilebilirlik puanı, ihlal ve kritik ihlal sayısı; sekmeler: **İhlaller** (öneme göre süzülür; kod / GitHub ile testte "Kodda göster" hatalı satırı ve önerilen düzeltmeyi gösterir), **Klavye ve Odak** (ana sayfada Tab sırası, sayfa bazında ulaşılamayan / odağı görünmeyen öğe, klavye tuzağı), **Kontrast**, **WCAG Ölçütleri** (madde, düzey, geçti / kaldı / uygulanmaz). Tur döngüsü yoktur; canlı akışta "Analiz ediliyor" görünür. Raporda otomatik araçların her sorunu bulamadığı, ekran okuyucuyla elle deneme önerildiği belirtilir.

Canlı akış metrikleri: `{ uyum, lighthouse, ihlal, kritik }`. Mock: `mock/erisimReport.js`, rapor bileşeni: `report/ErisimRaporu.jsx`.

## 1c. URL ile test
- Kaynak kod olmadığı için Kod Haritası, birim testi, kod coverage ve kalite skoru (mutasyon) yoktur.
- Arayüz testinde odak: kullanıcı akışları, form doğrulama mesajları, gezinme ve yönlendirme, hata durumları. Araç: Playwright.
- Raporda Kod sekmesi gizlenir; halkada etkileşim kapsamı gösterilir.

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
| PHP | PHPUnit | Mockery | Laravel HTTP Tests | Playwright | Eris | Xdebug / PCOV |

Kurallar:
- Mobil alanında Python desteklenmez.
- Oyun ve Mobil alanlarında yalnızca birim testi yapılır. Arayüz (E2E) testleri şimdilik yalnızca web arayüzleri içindir.

## 3. Arayüzde nerede görünür?
- **"Ajanı Görevlendir" kartı → "Bu testte neler yapılacak?"**: Seçime göre üretilen adımları, araçları ve odak konularını gösterir. Seçim değişince plan da anında değişir.
- **Canlı akış**: Ajan adımları stratejiden üretilir. Örneğin Oyun testinde "Bağımlılık Analizi" adımı vardır ama "UI Keşif" adımı yoktur. Web + İkisi seçildiğinde arayüz adımları da akışa eklenir.
