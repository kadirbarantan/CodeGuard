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

// Test türleri birden fazla seçilebilir: config.tur bir dizidir, ör. ['birim', 'arayuz'].
// (Eski kayıtlardaki tek tür metni ve 'ikisi' de okunur; bkz. turListesi.)
export const TURLER = {
  birim: 'Birim',
  arayuz: 'Arayüz',
  kullanilabilirlik: 'Kullanılabilirlik',
  erisilebilirlik: 'Erişilebilirlik',
}
export const TUR_SIRASI = ['birim', 'arayuz', 'kullanilabilirlik', 'erisilebilirlik']
// Kod testleri ajan döngüsüyle (1 + 3 tur) çalışır; site denetimleri çalışan site üzerinde tek geçişte ölçülür
export const KOD_TURLERI = ['birim', 'arayuz']
export const DENETIM_TURLERI = ['kullanilabilirlik', 'erisilebilirlik']
// Arayüzde varsayılan seçim yoktur (kullanıcı kendisi seçer). Bu değer yalnızca türü kayıtlı olmayan eski mock kayıtlar içindir.
export const VARSAYILAN_TURLER = ['birim', 'arayuz']

// Dizi, tek tür metni ya da eski 'ikisi' → sıralı tür dizisi
export function turListesi(tur) {
  const liste = Array.isArray(tur) ? tur : tur === 'ikisi' ? ['birim', 'arayuz'] : tur ? [tur] : []
  return TUR_SIRASI.filter((t) => liste.includes(t))
}

// Kısa ad: "Birim + Arayüz", "Arayüz + Erişilebilirlik" …
export const turAdi = (tur) => turListesi(tur).map((t) => TURLER[t]).join(' + ')

// Test girdisi: kaynak kod yükleme ya da canlı sitenin adresi
export const KAYNAKLAR = { kod: 'Kaynak Kod Yükle', url: 'URL Gir' }

// Şu an yalnızca Web alanı aktif. Diğer alanlar gelecek çalışma olarak arayüzde pasif görünür.
export const AKTIF_ALANLAR = ['web']
export const alanAktif = (alan) => AKTIF_ALANLAR.includes(alan)
export const GELISTIRILIYOR_NOTU = 'Şu anda geliştirmeye devam etmektedir'

// Alan kuralları: Mobilde Python yok; Oyun ve Mobilde yalnızca birim testi
export const pythonDesteklenir = (alan) => alan !== 'mobil'
export const arayuzDesteklenir = (alan) => alan !== 'oyun' && alan !== 'mobil'

// Seçimde hangi test grupları var
export const birimVar = (tur) => turListesi(tur).includes('birim')
export const arayuzVar = (tur) => turListesi(tur).includes('arayuz')
export const uxVar = (tur) => turListesi(tur).includes('kullanilabilirlik')
export const erisimVar = (tur) => turListesi(tur).includes('erisilebilirlik')
// Tur döngüsü olmayan, çalışan site üzerinde tek geçişte ölçülen testlerden en az biri var mı
export const denetimVar = (tur) => uxVar(tur) || erisimVar(tur)
// Yalnızca denetim seçili (birim / arayüz yok): canlı akışta tur yerine "Analiz ediliyor"
export const sadeceDenetim = (tur) => denetimVar(tur) && !birimVar(tur) && !arayuzVar(tur)

// Tek bir tür bu kaynakla seçilebilir mi? URL ile birim testi yapılamaz (kaynak kod gerekir)
export const turSecilebilir = (tur, kaynak) => kaynak !== 'url' || tur !== 'birim'

// Seçimi alan ve kaynak kurallarına göre düzelt. Kurallar seçimin tamamını silerse uygun bir varsayılana döner;
// kullanıcının kendi bıraktığı boş seçimde Başlat pasif kalır.
export function turDuzelt(tur, alan, kaynak) {
  const once = turListesi(tur)
  let sonra = once.filter((t) => turSecilebilir(t, kaynak))
  if (!arayuzDesteklenir(alan)) sonra = sonra.filter((t) => t === 'birim')
  if (once.length && !sonra.length) sonra = kaynak === 'url' ? ['arayuz'] : ['birim']
  return sonra
}

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

// ---- Test planı: her test grubu kendi adımlarını üretir, seçilen gruplar tek planda birleşir ----
// adim.tip: 'analiz' | 'llm' | 'sandbox' | 'tarayici' · adim.grup: adımın ait olduğu test grubu (birden fazla grup seçiliyse görünür)
// kaynak: 'kod' (proje yüklendi) | 'github' | 'url' (canlı site adresi girildi)

// Kod testleri (birim ve/veya arayüz): ajan döngüsü
function kodPlani({ alan, dil, kaynak, birim, arayuz, motor, hedef }) {
  const arac = DIL_ARACLARI[dil]
  const s = ALAN_STRATEJI[alan]
  const urlModu = kaynak === 'url'
  const adimlar = []
  if (!urlModu) {
    adimlar.push({ tip: 'analiz', ad: 'Kod Haritası', aciklama: 'Kod analiz edilir; fonksiyonlar, sınıflar ve dallar çıkarılır. Her birim için ne yaptığı ve ne kadar riskli olduğu yorumlanır; ajan riskli birimlerden başlar.' })
  }
  if (motor) {
    adimlar.push({ tip: 'analiz', ad: 'Bağımlılık ayrıştırma', aciklama: `${motor} kullanan kod ayrılır, yalnızca test edilebilir mantık test edilir.` })
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
  return { adimlar, araclar, odak }
}

// Kullanılabilirlik: tek geçişlik denetim
function uxPlani({ kaynak, hedef }) {
  const urlModu = kaynak === 'url'
  const adimlar = [
    {
      tip: 'tarayici',
      ad: 'Sayfaları gez ve görüntü al',
      aciklama: urlModu
        ? `${hedef} açılır; sayfalar masaüstü ve mobil genişlikte gezilir, ekran görüntüsü ve sayfa düzeni alınır.`
        : 'Uygulama ayağa kaldırılır; sayfalar masaüstü ve mobil genişlikte gezilir, ekran görüntüsü ve sayfa düzeni alınır.',
    },
    { tip: 'analiz', ad: 'Okuma deseni (Z / F)', aciklama: 'Logo, menü, başlık ve ana butonun konumu Z ve F okuma desenlerine göre puanlanır.' },
    { tip: 'analiz', ad: 'Renk uyumu', aciklama: 'Renk paleti çıkarılır; renklerin uyumu ve aynı rengin hep aynı anlamda kullanılıp kullanılmadığı incelenir.' },
    { tip: 'llm', ad: 'UX değerlendirmesi', aciklama: 'Ajan ekran görüntülerini görsel hiyerarşi, tutarlılık ve kullanım kolaylığı ilkelerine göre inceler.' },
    { tip: 'llm', ad: 'İçgörü ve rapor', aciklama: 'Bulgular önem sırasına konur, her biri için somut öneri yazılır.' },
  ]
  return { adimlar, araclar: UX_ARACLARI, odak: UX_ODAK }
}

// Erişilebilirlik: tek geçişlik WCAG denetimi
function erisimPlani({ dil, kaynak, hedef }) {
  const urlModu = kaynak === 'url'
  const statik = !urlModu && ERISIM_STATIK[dil]
  const adimlar = []
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
  return { adimlar, araclar, odak: ERISIM_ODAK }
}

// Seçime göre test planını üretir: adımlar, araçlar ve odak konuları.
// Birden fazla grup seçiliyse adımlar sırayla birleşir (backend'de gruplar paralel çalışır, uygulama bir kez başlatılır):
// her grubun kendi "İçgörü ve rapor" adımı kalkar, sonda tek ortak rapor adımı olur; denetimlerin ikinci "Sayfaları gez" adımı atlanır.
export function stratejiOlustur({ alan, dil, tur, digerMetin = '', kaynak = 'kod', url = '' }) {
  const urlModu = kaynak === 'url'
  const birim = !urlModu && birimVar(tur)
  const arayuz = arayuzVar(tur) && arayuzDesteklenir(alan)
  const ux = uxVar(tur)
  const erisim = erisimVar(tur)
  const motor = birim ? MOTOR[alan]?.[dil] : undefined
  const hedef = urlModu ? urlAdi(url) || 'girilen adres' : null
  const ortak = { alan, dil, kaynak, birim, arayuz, motor, hedef }

  const parcalar = []
  if (birim || arayuz) parcalar.push({ id: 'kod', ad: [birim && 'Birim', arayuz && 'Arayüz'].filter(Boolean).join(' + '), ...kodPlani(ortak) })
  if (ux) parcalar.push({ id: 'ux', ad: 'Kullanılabilirlik', ...uxPlani(ortak) })
  if (erisim) parcalar.push({ id: 'erisim', ad: 'Erişilebilirlik', ...erisimPlani(ortak) })

  const coklu = parcalar.length > 1
  const adimlar = []
  let sayfalarGezildi = false
  for (const p of parcalar) {
    for (const a of p.adimlar) {
      if (coklu && a.ad === 'İçgörü ve rapor') continue
      const gezinti = a.ad === 'Sayfaları gez ve görüntü al' || a.ad === 'Sayfaları gez'
      if (coklu && gezinti && sayfalarGezildi) continue
      if (gezinti) sayfalarGezildi = true
      adimlar.push(coklu ? { ...a, grup: p.ad } : a)
    }
  }
  if (coklu) {
    adimlar.push({
      tip: 'llm',
      ad: 'İçgörü ve rapor',
      grup: 'Ortak',
      aciklama: `${parcalar.map((p) => p.ad).join(', ')} sonuçları tek raporda birleştirilir; her biri için bulgular ve öneriler yazılır.`,
    })
  }

  const tekil = (dizi) => [...new Set(dizi)]
  return {
    baslik: `${alan === 'diger' && digerMetin.trim() ? digerMetin.trim() : ALANLAR[alan].ad} · ${urlModu ? hedef : DILLER[dil]}`,
    adimlar,
    araclar: tekil(parcalar.flatMap((p) => p.araclar)),
    odak: tekil(parcalar.flatMap((p) => p.odak)),
    parcalar: parcalar.map((p) => ({ id: p.id, ad: p.ad })),
    birim,
    arayuz,
    ux,
    erisim,
    motor,
  }
}
