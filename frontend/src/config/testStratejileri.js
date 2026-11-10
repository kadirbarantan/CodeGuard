// Test stratejileri: seçilen alan + dil + test türüne göre test süreci burada belirlenir.
// Süreç sabit değildir; ajanların hangi adımları çalıştıracağı, hangi araçları kullanacağı
// ve nelere odaklanacağı bu tanımlardan üretilir. Faz 2'de backend de aynı tanımları kullanacak.

export const ALANLAR = {
  web: { ad: 'Web', meslek: 'Web geliştirici' },
  oyun: { ad: 'Oyun', meslek: 'Oyun geliştirici' },
  mobil: { ad: 'Mobil', meslek: 'Mobil geliştirici' },
  genel: { ad: 'Genel', meslek: 'Genel yazılım geliştirici' },
  diger: { ad: 'Diğer', meslek: 'Diğer' },
}

export const DILLER = {
  python: 'Python',
  csharp: 'C#',
  js: 'JavaScript / TypeScript',
  php: 'PHP',
}

export const TURLER = {
  birim: 'Birim',
  arayuz: 'Arayüz',
  ikisi: 'İkisi',
  kullanilabilirlik: 'Kullanılabilirlik',
  erisilebilirlik: 'Erişilebilirlik',
}

// Test girdisi: kaynak kod yükleme ya da canlı sitenin adresi
export const KAYNAKLAR = { kod: 'Kaynak Kod Yükle', url: 'URL Gir' }

// Şu an yalnızca Web alanı aktif. Diğer alanlar gelecek çalışma olarak arayüzde pasif görünür.
export const AKTIF_ALANLAR = ['web']
export const alanAktif = (alan) => AKTIF_ALANLAR.includes(alan)
export const GELISTIRILIYOR_NOTU = 'Şu anda geliştirmeye devam etmektedir'

// Alan kuralları: Mobilde Python yok; Oyun ve Mobilde yalnızca birim testi
export const pythonDesteklenir = (alan) => alan !== 'mobil'
export const arayuzDesteklenir = (alan) => alan !== 'oyun' && alan !== 'mobil'

// Seçilen türün içerdiği test grupları
export const birimVar = (tur) => tur === 'birim' || tur === 'ikisi'
export const arayuzVar = (tur) => tur === 'arayuz' || tur === 'ikisi'
export const uxVar = (tur) => tur === 'kullanilabilirlik'
export const erisimVar = (tur) => tur === 'erisilebilirlik'
// Tur döngüsü olmayan, çalışan site üzerinde tek geçişte ölçülen testler
export const denetimVar = (tur) => uxVar(tur) || erisimVar(tur)

// URL ile yalnızca canlı site test edilebilir: birim testi için kaynak kod gerekir
export const turSecilebilir = (tur, kaynak) => kaynak !== 'url' || tur === 'arayuz' || denetimVar(tur)

// "https://ornek.com/yol" → "ornek.com"
export function urlAdi(url) {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

// http(s) ile başlayan, alan adı (ya da localhost) içeren adresler geçerlidir
export function urlGecerli(url) {
  try {
    const u = new URL((url || '').trim())
    return (u.protocol === 'http:' || u.protocol === 'https:') && (u.hostname.includes('.') || u.hostname === 'localhost')
  } catch {
    return false
  }
}

// Dile göre kullanılan araçlar
export const DIL_ARACLARI = {
  python: { birim: 'pytest', mock: 'unittest.mock', api: 'FastAPI TestClient', arayuz: 'pytest-playwright', ozellik: 'Hypothesis', coverage: 'coverage.py' },
  js: { birim: 'Jest', mock: 'jest.fn', api: 'supertest', arayuz: '@playwright/test', ozellik: 'fast-check', coverage: 'istanbul' },
  csharp: { birim: 'xUnit', mock: 'Moq', api: 'WebApplicationFactory', arayuz: 'Playwright for .NET', ozellik: 'FsCheck', coverage: 'coverlet' },
  php: { birim: 'PHPUnit', mock: 'Mockery', api: 'Laravel HTTP Tests', arayuz: 'Playwright', ozellik: 'Eris', coverage: 'Xdebug / PCOV' },
}

// Kullanılabilirlik (UX) testi araçları: dilden bağımsızdır, çalışan site üzerinde ölçülür
// (Renk kontrastı erişilebilirlik testinde ölçülür; burada renk uyumu ve anlam tutarlılığı vardır.)
export const UX_ARACLARI = ['Playwright', 'Lighthouse', 'Gemini (görsel girdi)']
export const UX_ODAK = ['Z / F okuma deseni', 'renk uyumu', 'görsel hiyerarşi', 'mobil uyum']

// Erişilebilirlik testi: WCAG 2.2 AA ölçütleri. Çalışan site üzerinde ölçülür; kaynak kod varsa koddan da taranır.
export const WCAG_SURUM = 'WCAG 2.2 AA'
export const ERISIM_ARACLARI = ['axe-core', 'Lighthouse', 'Playwright (klavye testi)', 'Chromium görme simülasyonu', 'Gemini (görsel girdi)']
// Kaynak kod varsa çalıştırmadan yapılan statik tarama (dile göre)
export const ERISIM_STATIK = {
  js: 'eslint-plugin-jsx-a11y',
  python: 'HTML şablon taraması',
  csharp: 'Razor şablon taraması',
  php: 'Blade / HTML şablon taraması',
}
export const ERISIM_ODAK = [
  'renk kontrastı',
  'klavyeyle gezinme ve odak sırası',
  'görsellerin alternatif metni',
  'form etiketleri ve hata mesajları',
  'ekran okuyucu uyumu (ARIA, başlık sırası)',
  'dokunma hedefi boyutu',
  'renk körlüğü ve yalnızca renkle verilen bilgi',
  'yakınlaştırma ve dar ekran (320 px)',
  'video altyazısı',
  'kendiliğinden hareket eden içerik',
]
// Raporda ihlallerin gruplandığı engel grupları (hangi kullanıcıları etkiliyor)
export const ENGEL_GRUPLARI = {
  gorme: { ad: 'Görme engelli', kim: 'Ekran okuyucuyla gezinen kullanıcılar' },
  azgorme: { ad: 'Az görme ve renk körlüğü', kim: 'Kontrast, renk ve yakınlaştırmaya ihtiyaç duyanlar' },
  hareket: { ad: 'Hareket engelli', kim: 'Fare kullanamayan, klavye ya da anahtarla gezinenler' },
  isitme: { ad: 'İşitme engelli', kim: 'Sesli içeriği altyazıyla takip edenler' },
  bilissel: { ad: 'Bilişsel ve dikkat', kim: 'Açık talimata, sakin bir sayfaya ihtiyaç duyanlar' },
}
// URL ile arayüz testinde odak (kaynak kod olmadığı için yalnızca kullanıcı akışları)
export const URL_ODAK = ['kullanıcı akışları', 'form doğrulama mesajları', 'gezinme ve yönlendirme', 'hata durumları']

// Oyun ve mobilde ayrıştırılacak motor / platform bağımlılıkları
const MOTOR = {
  oyun: { csharp: 'Unity (UnityEngine)', python: 'Pygame', js: 'Phaser / Three.js' },
  mobil: { csharp: '.NET MAUI', js: 'React Native' },
}

// Alana göre ajanın odaklandığı konular ve 2. turda eklediği test türü
export const ALAN_STRATEJI = {
  web: {
    odak: ['HTTP durum kodları', 'form ve girdi doğrulama', 'yetkilendirme', 'veritabanı taklidi'],
    tur2: 'Hatalı istekler ve yetkisiz erişim senaryoları için 9 test eklendi.',
  },
  oyun: {
    odak: ['oyun kuralları ve durum makineleri', 'sabit tohumlu rastgelelik', 'sahte zaman (frame/deltaTime)', 'ondalık sayı toleransı'],
    tur2: 'Sahte zaman ve sabit tohumla 9 deterministik test eklendi.',
  },
  mobil: {
    odak: ['async akışlar', 'ağ kopması ve çevrimdışı durum', 'platform API taklidi', 'ViewModel / durum yönetimi'],
    tur2: 'Ağ kopması ve çevrimdışı senaryoları için 9 test eklendi.',
  },
  genel: {
    odak: ['sınır değerler', 'hata yolları', 'girdi doğrulama'],
    tur2: 'Sınır değerler ve hata yolları için 9 test eklendi.',
  },
}
ALAN_STRATEJI.diger = ALAN_STRATEJI.genel

// Seçime göre test planını üretir: adımlar, araçlar ve odak konuları
// adim.tip: 'analiz' | 'llm' | 'sandbox' | 'tarayici'
// kaynak: 'kod' (proje yüklendi) | 'url' (canlı site adresi girildi)
export function stratejiOlustur({ alan, dil, tur, digerMetin = '', kaynak = 'kod', url = '' }) {
  const arac = DIL_ARACLARI[dil]
  const s = ALAN_STRATEJI[alan]
  const urlModu = kaynak === 'url'
  const birim = !urlModu && birimVar(tur)
  const arayuz = arayuzVar(tur) && arayuzDesteklenir(alan)
  const ux = uxVar(tur)
  const erisim = erisimVar(tur)
  const motor = birim ? MOTOR[alan]?.[dil] : undefined
  const hedef = urlModu ? urlAdi(url) || 'girilen adres' : null
  const adimlar = []

  if (erisim) {
    const statik = !urlModu && ERISIM_STATIK[dil]
    if (statik) {
      adimlar.push({
        tip: 'analiz',
        ad: 'Statik tarama',
        aciklama: `Şablonlar ve bileşenler uygulama çalıştırılmadan taranır (${statik}): eksik alt metin, etiketsiz form alanı, yanlış başlık sırası.`,
      })
    }
    adimlar.push({
      tip: 'tarayici',
      ad: 'Sayfaları gez',
      aciklama: urlModu
        ? `${hedef} açılır; sayfalar masaüstü ve mobil genişlikte gezilir.`
        : 'Uygulama ayağa kaldırılır; sayfalar masaüstü ve mobil genişlikte gezilir.',
    })
    adimlar.push({ tip: 'analiz', ad: 'Otomatik WCAG taraması', aciklama: `Her sayfa axe-core ve Lighthouse ile ${WCAG_SURUM} kurallarına göre taranır; kontrast oranları ölçülür.` })
    adimlar.push({ tip: 'tarayici', ad: 'Klavye ve odak testi', aciklama: 'Playwright yalnızca Tab ve Enter ile gezinir: her öğeye ulaşılıyor mu, odak görünüyor mu, sıra mantıklı mı, klavye tuzağı var mı.' })
    adimlar.push({ tip: 'analiz', ad: 'Ekran okuyucu ağacı', aciklama: 'Tarayıcının erişilebilirlik ağacı çıkarılır; ARIA rolleri, öğe adları ve başlık sırası kontrol edilir.' })
    adimlar.push({
      tip: 'tarayici',
      ad: 'Görme simülasyonu',
      aciklama: 'Sayfalar renk körlüğü (protanopi, döteranopi, tritanopi, akromatopsi) ve bulanık görme simülasyonuyla açılır; yalnızca renkle verilen bilgi aranır. 320 px genişlik ve %200 yakınlaştırmada taşan ya da kırpılan içerik aranır.',
    })
    adimlar.push({
      tip: 'tarayici',
      ad: 'Form, medya ve hareket',
      aciklama: 'Formlar bilerek yanlış gönderilir: hata görünüyor mu, alanla bağlı mı, ekran okuyucuya duyuruluyor mu. Videolarda altyazı aranır; "hareketi azalt" açıkken animasyonların durduğu kontrol edilir.',
    })
    adimlar.push({
      tip: 'llm',
      ad: 'Anlam kontrolü',
      aciklama: 'Otomatik araçların bakamadığı anlam kontrol edilir: alternatif metin görseli gerçekten anlatıyor mu, hata mesajı neyin yanlış olduğunu söylüyor mu (Gemini, görsel girdi).',
    })
    adimlar.push({
      tip: 'llm',
      ad: 'İçgörü ve rapor',
      aciklama: urlModu
        ? 'İhlaller WCAG maddesine göre gruplanır, önem sırasına konur, her birine düzeltme önerisi yazılır.'
        : 'İhlaller WCAG maddesine göre gruplanır, koddaki dosya ve satıra bağlanır, her birine düzeltme önerisi yazılır.',
    })
    const araclar = [...ERISIM_ARACLARI]
    if (statik) araclar.push(statik)
    return {
      baslik: `${ALANLAR[alan].ad} · ${urlModu ? hedef : DILLER[dil]}`,
      adimlar,
      araclar,
      odak: ERISIM_ODAK,
      birim: false,
      arayuz: false,
      ux: false,
      erisim: true,
      motor,
    }
  }

  if (!urlModu && !ux) {
    adimlar.push({ tip: 'analiz', ad: 'Kod Haritası', aciklama: 'Kod analiz edilir; fonksiyonlar, sınıflar ve dallar çıkarılır.' })
  }
  if (motor) {
    adimlar.push({ tip: 'analiz', ad: 'Bağımlılık ayrıştırma', aciklama: `${motor} kullanan kod ayrılır, yalnızca test edilebilir mantık test edilir.` })
  }

  if (ux) {
    adimlar.push({
      tip: 'tarayici',
      ad: 'Sayfaları gez ve görüntü al',
      aciklama: urlModu
        ? `${hedef} açılır; sayfalar masaüstü ve mobil genişlikte gezilir, ekran görüntüsü ve sayfa düzeni alınır.`
        : 'Uygulama ayağa kaldırılır; sayfalar masaüstü ve mobil genişlikte gezilir, ekran görüntüsü ve sayfa düzeni alınır.',
    })
    adimlar.push({ tip: 'analiz', ad: 'Okuma deseni (Z / F)', aciklama: 'Logo, menü, başlık ve ana butonun konumu Z ve F okuma desenlerine göre puanlanır.' })
    adimlar.push({ tip: 'analiz', ad: 'Renk uyumu', aciklama: 'Renk paleti çıkarılır; renklerin uyumu ve aynı rengin hep aynı anlamda kullanılıp kullanılmadığı incelenir.' })
    adimlar.push({ tip: 'llm', ad: 'UX değerlendirmesi', aciklama: 'Ajan ekran görüntülerini görsel hiyerarşi, tutarlılık ve kullanım kolaylığı ilkelerine göre inceler.' })
    adimlar.push({ tip: 'llm', ad: 'İçgörü ve rapor', aciklama: 'Bulgular önem sırasına konur, her biri için somut öneri yazılır.' })
    return {
      baslik: `${ALANLAR[alan].ad} · ${urlModu ? hedef : DILLER[dil]}`,
      adimlar,
      araclar: UX_ARACLARI,
      odak: UX_ODAK,
      birim: false,
      arayuz: false,
      ux: true,
      erisim: false,
      motor,
    }
  }

  // URL ile testte kod yok: odak yalnızca kullanıcı akışlarıdır
  const odak = urlModu ? URL_ODAK : s.odak
  adimlar.push({ tip: 'llm', ad: 'Test planı', aciklama: `Planlayıcı ajan odağı belirler: ${odak.slice(0, 2).join(', ')}.` })
  if (birim) {
    adimlar.push({ tip: 'llm', ad: 'Birim testleri', aciklama: `${arac.birim} ile yazılır, bağımlılıklar ${arac.mock} ile taklit edilir.` })
    if (alan === 'web') {
      adimlar.push({ tip: 'llm', ad: 'API entegrasyon testleri', aciklama: `Uç noktalar ${arac.api} ile çağrılır.` })
    }
    if (alan === 'genel' || alan === 'diger') {
      adimlar.push({ tip: 'llm', ad: 'Özellik tabanlı testler', aciklama: `${arac.ozellik} ile rastgele girdilerle sınır durumlar denenir.` })
    }
    adimlar.push({ tip: 'sandbox', ad: 'Çalıştır ve doğrula', aciklama: `Testler sandbox'ta çalışır, kapsama ${arac.coverage} ile ölçülür; kapsanmayanlar için en fazla 3 tekrar.` })
  }
  if (arayuz) {
    adimlar.push({
      tip: 'tarayici',
      ad: urlModu ? 'Siteyi aç ve keşfet' : 'Uygulamayı başlat ve keşfet',
      aciklama: urlModu
        ? `${hedef} açılır, sayfalar ve etkileşim öğeleri çıkarılır.`
        : 'Uygulama ayağa kaldırılır, sayfalar ve etkileşim öğeleri çıkarılır.',
    })
    const uiArac = urlModu ? 'Playwright' : arac.arayuz
    adimlar.push({ tip: 'llm', ad: 'Arayüz (E2E) testleri', aciklama: `${uiArac} ile tıklama, form ve gezinme akışları yazılır ve çalıştırılır.` })
  }
  adimlar.push({
    tip: 'llm',
    ad: 'İçgörü ve rapor',
    aciklama: birim ? 'Kapsanamayan satırlar açıklanır, olası hatalar raporlanır.' : 'Başarısız akışlar ve kapsanmayan öğeler açıklanır, olası hatalar raporlanır.',
  })

  const araclar = []
  if (birim) araclar.push(arac.birim, arac.mock, arac.coverage)
  if (birim && alan === 'web') araclar.push(arac.api)
  if (birim && (alan === 'genel' || alan === 'diger')) araclar.push(arac.ozellik)
  if (arayuz) araclar.push(urlModu ? 'Playwright' : arac.arayuz)

  return {
    baslik: `${alan === 'diger' && digerMetin.trim() ? digerMetin.trim() : ALANLAR[alan].ad} · ${urlModu ? hedef : DILLER[dil]}`,
    adimlar,
    araclar,
    odak,
    birim,
    arayuz,
    ux: false,
    erisim: false,
    motor,
  }
}
