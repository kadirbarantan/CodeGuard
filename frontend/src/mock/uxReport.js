// Kullanılabilirlik (UX) testi raporu (mock). Faz 2'de backend aynı biçimi gönderecek.
// Okuma deseni: sayfadaki önemli öğelerin (logo, menü, başlık, ana buton) konumu Z ya da F desenine göre puanlanır.
// Kontrast: WCAG 2.1 AA, normal metin için en az 4.5:1.
export const uxReport = {
  proje: 'ornek-site.com',
  alan: 'web',
  tur: 'kullanilabilirlik',
  tarih: '02.11.2026',
  turSayisi: null,
  ux: { skor: 72, desen: 74, renk: 81, kontrastSorun: 3 },

  sayfalar: [
    { yol: '/', desen: 'Z', uyum: 78, not: 'Logo ve menü doğru yerde; "Kayıt ol" butonu Z deseninin bitiş noktasının (sağ alt) dışında kalıyor.' },
    { yol: '/blog', desen: 'F', uyum: 86, not: 'Başlıklar sola yaslı, ilk kelimeler kolay taranıyor.' },
    { yol: '/blog/:id', desen: 'F', uyum: 82, not: 'Ara başlıklar F desenini destekliyor; uzun paragraflar taramayı zorlaştırıyor.' },
    { yol: '/pricing', desen: 'Z', uyum: 58, not: 'Plan başlıkları sağa yaslı; göz önce fiyatı değil açıklamayı görüyor.' },
    { yol: '/login', desen: 'Z', uyum: 80, not: 'Form ortada, ana buton ilk bakışta görünüyor.' },
    { yol: '/register', desen: 'Z', uyum: 62, not: 'Mobilde gönder butonu ilk ekranın altında kalıyor.' },
  ],

  palet: [
    { hex: '#7C3AED', ad: 'Ana renk', oran: 18 },
    { hex: '#111827', ad: 'Metin', oran: 34 },
    { hex: '#F9FAFB', ad: 'Arka plan', oran: 38 },
    { hex: '#F59E0B', ad: 'Vurgu', oran: 6 },
    { hex: '#9CA3AF', ad: 'İkincil metin', oran: 4 },
  ],
  renkNotu:
    'Palet genel olarak uyumlu: mor ana renk ile turuncu vurgu birbirini tamamlıyor. Ancak turuncu hem uyarı, hem indirim hem de "Yakında" rozeti için kullanılıyor; anlamı tutarsız.',

  kontrast: [
    { oge: 'Alt bilgi bağlantıları', sayfa: '/', on: '#9CA3AF', arka: '#F9FAFB', oran: 2.4 },
    { oge: 'Form ipucu metni', sayfa: '/register', on: '#A1A1AA', arka: '#FFFFFF', oran: 2.6 },
    { oge: '"Yakında" rozeti', sayfa: '/pricing', on: '#F59E0B', arka: '#FFFFFF', oran: 2.1 },
  ],

  bulgular: [
    {
      onem: 'yuksek',
      baslik: 'Ana eylem butonu okuma deseninin dışında',
      sayfa: '/',
      aciklama: 'Kullanıcının gözü Z deseninin sonunda sağ altta duruyor; "Kayıt ol" butonu ise solda, görselin altında.',
      oneri: 'Butonu başlığın sağ altına, Z deseninin bitiş noktasına taşı.',
    },
    {
      onem: 'yuksek',
      baslik: 'Kayıt formunun gönder butonu mobilde görünmüyor',
      sayfa: '/register',
      aciklama: '390 px genişlikte buton ilk ekranın 220 px altında kalıyor; kullanıcı formun bittiğini anlamıyor.',
      oneri: 'Formu kısalt ya da butonu ekranın altına sabitle.',
    },
    {
      onem: 'orta',
      baslik: 'Düşük kontrastlı metinler',
      sayfa: '3 sayfa',
      aciklama: '3 metin WCAG AA sınırının (4.5:1) altında; özellikle güneş altında ve düşük parlaklıkta okunmuyor.',
      oneri: 'İkincil metin rengini #6B7280 yap (4.8:1).',
    },
    {
      onem: 'orta',
      baslik: 'Fiyat başlıkları sağa yaslı',
      sayfa: '/pricing',
      aciklama: 'Sağa yaslı başlıklar Z desenini bozuyor; kullanıcı planları karşılaştırmakta zorlanıyor.',
      oneri: 'Başlıkları sola yasla, fiyatı başlığın hemen altına al.',
    },
    {
      onem: 'dusuk',
      baslik: 'Vurgu rengi farklı anlamlarda kullanılıyor',
      sayfa: 'Genel',
      aciklama: 'Turuncu hem uyarı hem indirim hem de bilgi rozeti için kullanılıyor.',
      oneri: 'Turuncuyu yalnızca uyarılar için kullan; bilgi rozetlerini ana renge çek.',
    },
    {
      onem: 'dusuk',
      baslik: 'Uzun paragraflar taramayı zorlaştırıyor',
      sayfa: '/blog/:id',
      aciklama: 'Bazı paragraflar 9 satırı geçiyor; F deseninde göz sol kenardan aşağı kayıp gidiyor.',
      oneri: 'Paragrafları 3–4 satırla sınırla, ara başlık ekle.',
    },
  ],
}
