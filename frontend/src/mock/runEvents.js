// Canlı akış olayları (WebSocket mesajını taklit eder). Faz 2'de backend aynı biçimi gönderecek.
// Olaylar seçilen test stratejisine göre üretilir: alan, dil ve tür değişince ajan adımları da değişir.
import { stratejiOlustur, DIL_ARACLARI, ALAN_STRATEJI, ERISIM_STATIK, urlAdi } from '../config/testStratejileri'

const m = (coverage, uiCovered, uiTotal, passed, bugs) => ({ coverage, uiCovered, uiTotal, passed, bugs })

// Kullanılabilirlik (UX) testi: tek geçişlik değerlendirme (tur döngüsü yok).
// metrics: { ux: genel skor, desen: okuma deseni uyumu, renk: renk uyumu, bulgu: UX bulgusu sayısı }
function uxOlaylari(config) {
  const hedef = config.kaynak === 'url' ? urlAdi(config.url) : 'Uygulama'
  const olaylar = []
  const ekle = (agent, kind, message, metrics) =>
    olaylar.push({ type: 'agent_step', agent, kind, message, round: 1, maxRounds: 1, metrics })
  const u = (ux, desen, renk, bulgu) => ({ ux, desen, renk, bulgu })

  ekle('Tarayıcı Ajanı', 'Tarayıcı', `${hedef} açıldı; 6 sayfa masaüstü ve mobil genişlikte gezildi, 12 ekran görüntüsü alındı.`, u(null, null, null, 0))
  ekle('Planlayıcı Ajan', 'LLM', 'Değerlendirme planı hazır: okuma deseni, renk uyumu, görsel hiyerarşi, mobil uyum.', u(null, null, null, 0))
  ekle('Okuma Deseni Analizi', 'Analiz', 'Ana sayfa Z desenine %78 uyumlu; "Kayıt ol" butonu desenin bitiş noktasının dışında kalıyor.', u(null, 78, null, 1))
  ekle('Okuma Deseni Analizi', 'Analiz', 'Yazı listesi ve detay sayfası F desenine uygun; fiyatlar sayfasında başlıklar sağa yaslı.', u(null, 74, null, 2))
  ekle('Renk Uyumu', 'Analiz', '5 renkli palet çıkarıldı; turuncu üç farklı anlamda kullanılıyor.', u(null, 74, 81, 3))
  ekle('UX Değerlendirme Ajanı', 'LLM', 'Ekran görüntüleri görsel hiyerarşi ve tutarlılık ilkelerine göre incelendi; 2 yeni bulgu.', u(null, 74, 81, 6))
  ekle('İçgörü Ajanı', 'LLM', 'Bulgular önem sırasına konuyor, her biri için öneri yazılıyor.', u(72, 74, 81, 6))
  return olaylar
}

// Erişilebilirlik testi: tek geçişlik denetim (tur döngüsü yok).
// metrics: { uyum: WCAG ölçüt uyumu %, lighthouse: Lighthouse erişilebilirlik puanı, ihlal: ihlal türü sayısı, kritik: kritik ihlal sayısı }
function erisimOlaylari(config) {
  const urlModu = config.kaynak === 'url'
  const hedef = urlModu ? urlAdi(config.url) : 'Uygulama'
  const olaylar = []
  const ekle = (agent, kind, message, metrics) =>
    olaylar.push({ type: 'agent_step', agent, kind, message, round: 1, maxRounds: 1, metrics })
  const e = (uyum, lighthouse, ihlal, kritik) => ({ uyum, lighthouse, ihlal, kritik })

  const statik = !urlModu && ERISIM_STATIK[config.dil]
  if (statik) {
    ekle('Statik Tarayıcı', `Analiz · ${statik}`, 'Şablonlarda 14 alternatif metinsiz görsel ve 5 etiketsiz form alanı bulundu.', e(null, null, 2, 0))
  }
  ekle('Tarayıcı Ajanı', 'Tarayıcı', `${urlModu ? hedef + ' açıldı' : 'Uygulama başlatıldı'}; 6 sayfa masaüstü ve mobil genişlikte gezildi.`, e(null, null, statik ? 2 : 0, 0))
  ekle('WCAG Tarayıcı', 'Analiz · axe-core', '6 sayfada 6 tür ihlal bulundu; 7 metin kontrast sınırının altında.', e(null, null, 6, 0))
  ekle('Lighthouse', 'Analiz', 'Erişilebilirlik puanı 74 / 100.', e(null, 74, 6, 0))
  ekle('Klavye Testi', 'Tarayıcı · Playwright', "Mobil menüye klavyeyle ulaşılamıyor; /register'deki tarih seçicide klavye tuzağı var; odak hiçbir sayfada görünmüyor.", e(null, 74, 8, 2))
  ekle('Erişilebilirlik Ağacı', 'Analiz', "4 ikon düğmesinin adı yok; /pricing'de başlık seviyesi atlanıyor.", e(null, 74, 9, 2))
  ekle('Görme Simülasyonu', 'Tarayıcı · Chromium', "Döteranopi ve protanopi simülasyonunda /pricing'deki var / yok noktaları ayırt edilemiyor; 320 px genişlikte blog yazısı yatay kaydırma istiyor.", e(null, 74, 11, 2))
  ekle('Form, Medya ve Hareket', 'Tarayıcı · Playwright', "/register formu yanlış gönderildi: hata ekran okuyucuya duyurulmuyor. Tanıtım videosunda altyazı yok; ana sayfadaki kaydırıcı durdurulamıyor.", e(null, 74, 14, 2))
  ekle('Anlam Kontrolü', 'LLM · Gemini', '9 görselin alternatif metni görseli anlatmıyor ("banner-final.png", "resim"); "Hata oluştu" mesajı neyin yanlış olduğunu söylemiyor.', e(null, 74, 16, 2))
  ekle('İçgörü Ajanı', 'LLM', urlModu ? 'İhlaller WCAG maddelerine ve engel gruplarına göre gruplanıyor, düzeltme önerileri yazılıyor.' : 'İhlaller WCAG maddelerine ve engel gruplarına göre gruplanıp koddaki yerlerine bağlanıyor, düzeltme önerileri yazılıyor.', e(46, 74, 16, 2))
  return olaylar
}

export function olaylariOlustur(config) {
  const st = stratejiOlustur(config)
  if (st.ux) return uxOlaylari(config)
  if (st.erisim) return erisimOlaylari(config)
  const urlModu = config.kaynak === 'url'
  const arac = DIL_ARACLARI[config.dil]
  const alanS = ALAN_STRATEJI[config.alan]
  const uiToplam = st.arayuz ? 24 : 0
  const olaylar = []
  const ekle = (agent, kind, message, round, metrics) =>
    olaylar.push({ type: 'agent_step', agent, kind, message, round, maxRounds: 4, metrics })

  // Durum: her adımda güncellenen metrikler
  let cov = 0
  let ui = 0
  let gecen = 0
  let hata = 0
  const mm = () => m(cov, ui, uiToplam, gecen, hata)

  if (!urlModu) ekle('Planlayıcı Ajan', 'LLM', 'Kod Haritası çıkarıldı, 38 birim bulundu.', 1, mm())
  if (st.motor) {
    ekle('Bağımlılık Analizi', 'Analiz', `${st.motor} kullanan 7 birim ayrıldı; 31 birim test edilebilir.`, 1, mm())
  }
  ekle('Planlayıcı Ajan', 'LLM', `Test planı hazır. Odak: ${alanS.odak.slice(0, 2).join(', ')}.`, 1, mm())

  if (st.birim) {
    const apiNotu = config.alan === 'web' ? `, ${arac.api} ile 12 API testi` : ''
    ekle('Test Yazıcı Ajan', 'LLM · Tur 1', `${arac.birim} ile 46 birim testi${apiNotu} yazıldı.`, 1, mm())
    cov = 34
    gecen = 41
    ekle('Doğrulayıcı · Standardizasyon Katmanı', 'Sandbox · Tur 1', `41/46 test geçti, kapsama %${cov}.`, 1, mm())
  }
  if (st.arayuz) {
    const acilis = urlModu ? `${urlAdi(config.url)} açıldı` : 'Uygulama başlatıldı'
    ekle('UI Keşif', 'Tarayıcı', `${acilis}; 6 sayfa, ${uiToplam} etkileşim öğesi bulundu.`, st.birim ? 2 : 1, mm())
  }
  if (st.birim) {
    ekle('Test Yazıcı Ajan', 'LLM · Tur 2', alanS.tur2, 2, mm())
    cov = 71
    gecen = 48
    hata = 1
    ekle('Doğrulayıcı · Standardizasyon Katmanı', 'Sandbox · Tur 2', `Kapsama %${cov}, 1 olası hata bulundu.`, 2, mm())
  }
  if (st.arayuz) {
    ekle('UI Test Yazıcı Ajan', 'LLM', `${urlModu ? 'Playwright' : arac.arayuz} ile 6 kullanıcı akışı için arayüz testi yazıldı.`, st.birim ? 3 : 2, mm())
    ui = 22
    gecen += 5
    hata += 1
    ekle('UI Doğrulayıcı · Standardizasyon Katmanı', 'Sandbox', `5/6 akış geçti, ${ui}/${uiToplam} öğe kapsandı.`, st.birim ? 3 : 2, mm())
  }
  if (st.birim) {
    ekle('Test Yazıcı Ajan', 'LLM · Tur 3', 'Kalan dallar için yeni testler yazıldı.', 3, mm())
    cov = 94
    gecen += 5
    hata += 2
    ekle('Doğrulayıcı · Standardizasyon Katmanı', 'Sandbox · Tur 3', `Kapsama %${cov}, ilerleme durdu; döngü sonlandı.`, 3, mm())
  }
  ekle('İçgörü Ajanı', 'LLM', 'Kapsanamayan satırlar açıklanıyor, rapor hazırlanıyor.', 4, mm())
  return olaylar
}

// Akışın sonunda gelen bitiş olayı (runId api.js'te eklenir)
export const doneEvent = { type: 'done' }
