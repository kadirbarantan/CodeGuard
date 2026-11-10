// "Örnek projeyle dene": kod yüklemeden ya da adres bilmeden platformu denemek için.
// Faz 2'de örnek proje sunucuda hazır durur; startRun dosya yerine { ornek: 'blog-api' } gönderir.

// Kod yükleme sekmesi: hatası önceden bilinen küçük bir FastAPI projesi (raporlardaki blog-api)
export const ORNEK_PROJE = {
  ad: 'blog-api',
  sayi: 38,
  boyut: 412 * 1024,
  uzantilar: { py: 24, html: 6, css: 2, txt: 1 },
  dil: 'python',
  ornek: true,
}

// URL sekmesi: CodeGuard'ın kendi yayındaki arayüzü
export const ORNEK_URL = 'https://code-guard-rose.vercel.app'
