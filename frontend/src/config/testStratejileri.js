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

export const TURLER = { birim: 'Birim', arayuz: 'Arayüz', ikisi: 'İkisi', kullanilabilirlik: 'Kullanılabilirlik' }

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

// URL ile yalnızca canlı site test edilebilir: birim testi için kaynak kod gerekir
export const turSecilebilir = (tur, kaynak) => kaynak !== 'url' || tur === 'arayuz' || tur === 'kullanilabilirlik'

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
export const UX_ARACLARI = ['Playwright', 'axe-core', 'Lighthouse']
export const UX_ODAK = ['Z / F okuma deseni', 'renk uyumu ve kontrast', 'görsel hiyerarşi', 'mobil uyum']
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
  const motor = birim ? MOTOR[alan]?.[dil] : undefined
  const hedef = urlModu ? urlAdi(url) || 'girilen adres' : null
  const adimlar = []

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
    adimlar.push({ tip: 'analiz', ad: 'Renk uyumu ve kontrast', aciklama: 'Renk paleti çıkarılır, metin kontrastı WCAG 2.1 AA ölçütüne göre ölçülür.' })
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
    motor,
  }
}
