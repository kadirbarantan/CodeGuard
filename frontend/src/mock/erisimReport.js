// Erişilebilirlik testi raporu (mock). Faz 2'de backend aynı biçimi gönderecek.
// Ölçüt: WCAG 2.2 AA. Araçlar: axe-core, Lighthouse, Playwright (klavye testi); kaynak kod varsa statik tarama.
// onem: axe-core'un etki düzeyi → kritik (critical) · ciddi (serious) · orta (moderate) · dusuk (minor)
// kaynak: yalnızca kod / GitHub ile testte gelir (URL ile testte kaynak kod yoktur). sablon, dile göre dosya yoluna çevrilir.

export const erisimReport = {
  proje: 'ornek-magaza.com',
  alan: 'web',
  tur: 'erisilebilirlik',
  tarih: '09.11.2026',
  turSayisi: null,
  wcag: 'WCAG 2.2 AA',
  ozet: { uyum: 65, lighthouse: 74, sayfa: 6 },

  // Denetlenen başarı ölçütleri. durum: gecti | kaldi | uygulanmaz
  olcutler: [
    { no: '1.1.1', ad: 'Metin dışı içerik', duzey: 'A', durum: 'kaldi' },
    { no: '1.2.2', ad: 'Altyazılar (kayıtlı)', duzey: 'A', durum: 'uygulanmaz' },
    { no: '1.3.1', ad: 'Bilgi ve ilişkiler', duzey: 'A', durum: 'kaldi' },
    { no: '1.3.4', ad: 'Ekran yönü', duzey: 'AA', durum: 'gecti' },
    { no: '1.4.1', ad: 'Rengin kullanımı', duzey: 'A', durum: 'gecti' },
    { no: '1.4.3', ad: 'Kontrast (asgari)', duzey: 'AA', durum: 'kaldi' },
    { no: '1.4.4', ad: 'Metni yeniden boyutlandırma', duzey: 'AA', durum: 'gecti' },
    { no: '1.4.10', ad: 'Yeniden akış', duzey: 'AA', durum: 'gecti' },
    { no: '1.4.11', ad: 'Metin dışı kontrast', duzey: 'AA', durum: 'gecti' },
    { no: '1.4.12', ad: 'Metin aralığı', duzey: 'AA', durum: 'gecti' },
    { no: '2.1.1', ad: 'Klavye', duzey: 'A', durum: 'kaldi' },
    { no: '2.1.2', ad: 'Klavye tuzağı olmaması', duzey: 'A', durum: 'kaldi' },
    { no: '2.4.1', ad: 'Blokları atlama', duzey: 'A', durum: 'gecti' },
    { no: '2.4.2', ad: 'Sayfa başlığı', duzey: 'A', durum: 'gecti' },
    { no: '2.4.3', ad: 'Odak sırası', duzey: 'A', durum: 'gecti' },
    { no: '2.4.4', ad: 'Bağlantı amacı (bağlam içinde)', duzey: 'A', durum: 'gecti' },
    { no: '2.4.6', ad: 'Başlıklar ve etiketler', duzey: 'AA', durum: 'gecti' },
    { no: '2.4.7', ad: 'Odak görünürlüğü', duzey: 'AA', durum: 'kaldi' },
    { no: '2.5.8', ad: 'Hedef boyutu (asgari)', duzey: 'AA', durum: 'kaldi' },
    { no: '3.1.1', ad: 'Sayfanın dili', duzey: 'A', durum: 'gecti' },
    { no: '3.2.2', ad: 'Girdi sırasında', duzey: 'A', durum: 'gecti' },
    { no: '3.3.1', ad: 'Hatanın belirtilmesi', duzey: 'A', durum: 'gecti' },
    { no: '3.3.2', ad: 'Etiketler veya talimatlar', duzey: 'A', durum: 'kaldi' },
    { no: '3.3.3', ad: 'Hata önerisi', duzey: 'AA', durum: 'gecti' },
    { no: '3.3.8', ad: 'Erişilebilir kimlik doğrulama (asgari)', duzey: 'AA', durum: 'gecti' },
    { no: '4.1.2', ad: 'Ad, rol, değer', duzey: 'A', durum: 'kaldi' },
    { no: '4.1.3', ad: 'Durum mesajları', duzey: 'AA', durum: 'gecti' },
  ],

  ihlaller: [
    {
      onem: 'kritik',
      wcag: '2.1.1',
      baslik: 'Mobil menü klavyeyle açılamıyor',
      sayfa: 'Tüm sayfalar',
      adet: 6,
      oge: 'div.menu-toggle',
      aciklama: 'Menü düğmesi <div> ile yapılmış: Tab ile odaklanılamıyor, Enter ile açılmıyor. Klavye ve ekran okuyucu kullanıcıları menüye hiç ulaşamıyor.',
      oneri: 'Gerçek bir <button> kullan; açık/kapalı durumunu aria-expanded ile bildir.',
      kaynak: {
        sablon: 'base',
        satir: 18,
        kod: '<div class="menu-toggle" onclick="menuAc()">☰</div>',
        duzeltme: '<button type="button" class="menu-toggle" aria-expanded="false"\n        aria-controls="ana-menu" onclick="menuAc()">\n  <span class="sr-only">Menüyü aç</span>☰\n</button>',
      },
    },
    {
      onem: 'kritik',
      wcag: '2.1.2',
      baslik: 'Tarih seçicide klavye tuzağı',
      sayfa: '/register',
      adet: 1,
      oge: '#dogum + .takvim',
      aciklama: 'Doğum tarihi alanında takvim açılınca odak takvimin içinde dönüyor; Tab ile dışarı çıkılamıyor, Esc de kapatmıyor.',
      oneri: 'Tarayıcının kendi tarih alanını kullan ya da Esc ile kapatıp odağı alana geri döndür.',
      kaynak: {
        sablon: 'register',
        satir: 41,
        kod: '<input id="dogum" class="tarih-secici" readonly>',
        duzeltme: '<label for="dogum">Doğum tarihi</label>\n<input id="dogum" type="date" autocomplete="bday">',
      },
    },
    {
      onem: 'ciddi',
      wcag: '1.1.1',
      baslik: 'Alternatif metni olmayan görseller',
      sayfa: '/blog, /blog/:id',
      adet: 14,
      oge: 'img.kapak',
      aciklama: 'Yazı kapak görsellerinde alt özniteliği yok; ekran okuyucu dosya adını okuyor ("kapak-3.jpg").',
      oneri: 'Bilgi veren görsellere içeriği anlatan alt metni yaz; yalnızca süs olan görsellere alt="" ver.',
      kaynak: {
        sablon: 'blog_liste',
        satir: 12,
        kod: '<img class="kapak" src="{{ yazi.kapak }}">',
        duzeltme: '<img class="kapak" src="{{ yazi.kapak }}" alt="{{ yazi.kapak_aciklama }}">',
      },
    },
    {
      onem: 'ciddi',
      wcag: '1.4.3',
      baslik: 'Yetersiz renk kontrastı',
      sayfa: '3 sayfa',
      adet: 7,
      oge: '.ikincil, .ipucu, .rozet-yakinda',
      aciklama: 'Yedi metin, normal metin için gereken 4.5:1 oranının altında; düşük parlaklıkta ve güneş altında okunmuyor. Ayrıntı Kontrast sekmesinde.',
      oneri: 'İkincil metin rengini #6B7280 yap (4.8:1); "Yakında" rozetinde koyu turuncu (#B45309) kullan.',
      kaynak: {
        sablon: 'css',
        satir: 27,
        kod: '.ikincil { color: #9CA3AF; }',
        duzeltme: '.ikincil { color: #6B7280; }',
      },
    },
    {
      onem: 'ciddi',
      wcag: '3.3.2',
      baslik: 'Form alanlarının görünür etiketi yok',
      sayfa: '/login, /register',
      adet: 5,
      oge: 'input[placeholder]',
      aciklama: 'Alanlar yalnızca yer tutucu metinle tanıtılıyor; yazmaya başlayınca kayboluyor ve ekran okuyucu alanın adını okuyamıyor.',
      oneri: 'Her alana <label for> ile görünür bir etiket ekle; yer tutucuyu yalnızca örnek için kullan.',
      kaynak: {
        sablon: 'login',
        satir: 9,
        kod: '<input type="email" name="eposta" placeholder="E-posta">',
        duzeltme: '<label for="eposta">E-posta</label>\n<input id="eposta" type="email" name="eposta" autocomplete="email">',
      },
    },
    {
      onem: 'ciddi',
      wcag: '4.1.2',
      baslik: 'Adı olmayan ikon düğmeleri',
      sayfa: '/, /blog/:id',
      adet: 4,
      oge: 'button.ara, button.paylas',
      aciklama: 'Arama ve paylaşım düğmeleri yalnızca ikondan oluşuyor; ekran okuyucu "düğme" diyor ama ne işe yaradığını söylemiyor.',
      oneri: 'Düğmeye aria-label ver, ikonu aria-hidden ile gizle.',
      kaynak: {
        sablon: 'base',
        satir: 24,
        kod: '<button class="ara"><svg>…</svg></button>',
        duzeltme: '<button class="ara" aria-label="Sitede ara">\n  <svg aria-hidden="true">…</svg>\n</button>',
      },
    },
    {
      onem: 'orta',
      wcag: '2.4.7',
      baslik: 'Odak göstergesi kaldırılmış',
      sayfa: 'Tüm sayfalar',
      adet: 23,
      oge: 'a, button',
      aciklama: 'CSS\'te outline: none tanımlı; klavyeyle gezinen kullanıcı hangi öğede olduğunu göremiyor.',
      oneri: ':focus-visible için belirgin bir çerçeve tanımla.',
      kaynak: {
        sablon: 'css',
        satir: 4,
        kod: 'a, button { outline: none; }',
        duzeltme: 'a:focus-visible, button:focus-visible {\n  outline: 3px solid #2563EB;\n  outline-offset: 2px;\n}',
      },
    },
    {
      onem: 'orta',
      wcag: '2.5.8',
      baslik: 'Küçük dokunma hedefleri',
      sayfa: '/ (alt bilgi)',
      adet: 4,
      oge: '.sosyal a',
      aciklama: 'Sosyal medya bağlantıları 18×18 px ve birbirine çok yakın; en az 24×24 px olmalı.',
      oneri: 'Bağlantılara iç boşluk vererek en az 24×24 px yap.',
      kaynak: {
        sablon: 'css',
        satir: 88,
        kod: '.sosyal a { width: 18px; height: 18px; }',
        duzeltme: '.sosyal a { min-width: 24px; min-height: 24px; padding: 4px; }',
      },
    },
    {
      onem: 'dusuk',
      wcag: '1.3.1',
      baslik: 'Başlık seviyesi atlanıyor',
      sayfa: '/pricing',
      adet: 3,
      oge: 'h4.plan-adi',
      aciklama: 'Sayfa h1\'den h4\'e geçiyor; ekran okuyucu kullanıcıları başlıklarla gezinirken sayfanın yapısını kaybediyor.',
      oneri: 'Plan adlarını h2 yap, görünümünü CSS ile ayarla.',
      kaynak: {
        sablon: 'pricing',
        satir: 15,
        kod: '<h4 class="plan-adi">Pro</h4>',
        duzeltme: '<h2 class="plan-adi">Pro</h2>',
      },
    },
  ],

  // Klavye testi: Playwright yalnızca Tab / Shift+Tab / Enter / Esc ile gezer
  klavye: [
    { sayfa: '/', odaklanabilir: 21, ulasilamayan: 1, odakGorunmuyor: 21, tuzak: false },
    { sayfa: '/blog', odaklanabilir: 34, ulasilamayan: 1, odakGorunmuyor: 34, tuzak: false },
    { sayfa: '/blog/:id', odaklanabilir: 16, ulasilamayan: 1, odakGorunmuyor: 16, tuzak: false },
    { sayfa: '/pricing', odaklanabilir: 12, ulasilamayan: 1, odakGorunmuyor: 12, tuzak: false },
    { sayfa: '/login', odaklanabilir: 7, ulasilamayan: 1, odakGorunmuyor: 7, tuzak: false },
    { sayfa: '/register', odaklanabilir: 11, ulasilamayan: 1, odakGorunmuyor: 11, tuzak: true },
  ],
  // Ana sayfada Tab ile sırayla odaklanılan öğeler (sorun: ulasilamiyor | adsiz | null)
  sekmeSirasi: [
    { ad: 'Logo', sorun: null },
    { ad: 'Ana sayfa', sorun: null },
    { ad: 'Blog', sorun: null },
    { ad: 'Fiyatlar', sorun: null },
    { ad: '☰ Menü', sorun: 'ulasilamiyor' },
    { ad: 'Düğme (ara)', sorun: 'adsiz' },
    { ad: 'Giriş yap', sorun: null },
    { ad: 'Kayıt ol', sorun: null },
    { ad: 'Son yazılar', sorun: null },
  ],

  kontrast: [
    { oge: 'Alt bilgi bağlantıları', sayfa: '/', on: '#9CA3AF', arka: '#F9FAFB', oran: 2.4, gereken: 4.5 },
    { oge: 'Yazı tarihi ve okuma süresi', sayfa: '/blog', on: '#9CA3AF', arka: '#FFFFFF', oran: 2.5, gereken: 4.5 },
    { oge: 'Form ipucu metni', sayfa: '/register', on: '#A1A1AA', arka: '#FFFFFF', oran: 2.6, gereken: 4.5 },
    { oge: '"Yakında" rozeti', sayfa: '/pricing', on: '#F59E0B', arka: '#FFFFFF', oran: 2.1, gereken: 4.5 },
    { oge: 'Pasif düğme metni', sayfa: '/register', on: '#D1D5DB', arka: '#7C3AED', oran: 3.2, gereken: 4.5 },
    { oge: 'Çerez bildirimi bağlantısı', sayfa: '/', on: '#C4B5FD', arka: '#111827', oran: 3.9, gereken: 4.5 },
    { oge: 'Büyük başlık üzerindeki alt yazı', sayfa: '/', on: '#A78BFA', arka: '#F9FAFB', oran: 2.8, gereken: 3 },
  ],
}

// Şablon adı → dile göre dosya yolu (kod / GitHub ile testte "Kodda göster" için)
const YOLLAR = {
  python: { base: 'templates/base.html', register: 'templates/register.html', login: 'templates/login.html', blog_liste: 'templates/blog/liste.html', pricing: 'templates/pricing.html', css: 'static/css/site.css' },
  js: { base: 'src/components/Layout.jsx', register: 'src/pages/Register.jsx', login: 'src/pages/Login.jsx', blog_liste: 'src/pages/BlogList.jsx', pricing: 'src/pages/Pricing.jsx', css: 'src/styles/site.css' },
  csharp: { base: 'Pages/Shared/_Layout.cshtml', register: 'Pages/Register.cshtml', login: 'Pages/Login.cshtml', blog_liste: 'Pages/Blog/Index.cshtml', pricing: 'Pages/Pricing.cshtml', css: 'wwwroot/css/site.css' },
  php: { base: 'resources/views/layouts/app.blade.php', register: 'resources/views/auth/register.blade.php', login: 'resources/views/auth/login.blade.php', blog_liste: 'resources/views/blog/index.blade.php', pricing: 'resources/views/pricing.blade.php', css: 'public/css/site.css' },
}

// JSX'te HTML özniteliklerinin React karşılıkları
const jsxYap = (kod) => kod.replace(/ class=/g, ' className=').replace(/ for=/g, ' htmlFor=').replace(/ onclick="menuAc\(\)"/g, ' onClick={menuAc}').replace(/\{\{ (.+?) \}\}/g, '{$1}')

export function ihlalKaynagi(kaynak, dil) {
  const yollar = YOLLAR[dil] || YOLLAR.python
  const css = kaynak.sablon === 'css'
  const cevir = dil === 'js' && !css ? jsxYap : (k) => k
  return { dosya: yollar[kaynak.sablon], satir: kaynak.satir, kod: cevir(kaynak.kod), duzeltme: cevir(kaynak.duzeltme) }
}
