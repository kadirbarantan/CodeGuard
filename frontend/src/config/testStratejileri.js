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
}

export const TURLER = { birim: 'Birim', arayuz: 'Arayüz', ikisi: 'İkisi' }

// Alan kuralları: Mobilde Python yok; Oyun ve Mobilde yalnızca birim testi
export const pythonDesteklenir = (alan) => alan !== 'mobil'
export const arayuzDesteklenir = (alan) => alan !== 'oyun' && alan !== 'mobil'

// Dile göre kullanılan araçlar
export const DIL_ARACLARI = {
  python: { birim: 'pytest', mock: 'unittest.mock', api: 'FastAPI TestClient', arayuz: 'pytest-playwright', ozellik: 'Hypothesis', coverage: 'coverage.py' },
  js: { birim: 'Jest', mock: 'jest.fn', api: 'supertest', arayuz: '@playwright/test', ozellik: 'fast-check', coverage: 'istanbul' },
  csharp: { birim: 'xUnit', mock: 'Moq', api: 'WebApplicationFactory', arayuz: 'Playwright for .NET', ozellik: 'FsCheck', coverage: 'coverlet' },
}

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
export function stratejiOlustur({ alan, dil, tur, digerMetin = '' }) {
  const arac = DIL_ARACLARI[dil]
  const s = ALAN_STRATEJI[alan]
  const birim = tur !== 'arayuz'
  const arayuz = tur !== 'birim' && arayuzDesteklenir(alan)
  const motor = MOTOR[alan]?.[dil]
  const adimlar = []

  adimlar.push({ tip: 'analiz', ad: 'Kod Haritası', aciklama: 'Kod analiz edilir; fonksiyonlar, sınıflar ve dallar çıkarılır.' })
  if (motor) {
    adimlar.push({ tip: 'analiz', ad: 'Bağımlılık ayrıştırma', aciklama: `${motor} kullanan kod ayrılır, yalnızca test edilebilir mantık test edilir.` })
  }
  adimlar.push({ tip: 'llm', ad: 'Test planı', aciklama: `Planlayıcı ajan odağı belirler: ${s.odak.slice(0, 2).join(', ')}.` })
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
    adimlar.push({ tip: 'tarayici', ad: 'Uygulamayı başlat ve keşfet', aciklama: 'Uygulama ayağa kaldırılır, sayfalar ve etkileşim öğeleri çıkarılır.' })
    adimlar.push({ tip: 'llm', ad: 'Arayüz (E2E) testleri', aciklama: `${arac.arayuz} ile tıklama, form ve gezinme akışları yazılır ve çalıştırılır.` })
  }
  adimlar.push({ tip: 'llm', ad: 'İçgörü ve rapor', aciklama: 'Kapsanamayan satırlar açıklanır, olası hatalar raporlanır.' })

  const araclar = []
  if (birim) araclar.push(arac.birim, arac.mock, arac.coverage)
  if (birim && alan === 'web') araclar.push(arac.api)
  if (birim && (alan === 'genel' || alan === 'diger')) araclar.push(arac.ozellik)
  if (arayuz) araclar.push(arac.arayuz)

  return {
    baslik: `${alan === 'diger' && digerMetin.trim() ? digerMetin.trim() : ALANLAR[alan].ad} · ${DILLER[dil]}`,
    adimlar,
    araclar,
    odak: s.odak,
    birim,
    arayuz,
    motor,
  }
}
