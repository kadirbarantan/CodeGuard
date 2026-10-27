// Canlı akış olayları (WebSocket mesajını taklit eder). Faz 2'de backend aynı biçimi gönderecek.
// Olaylar seçilen test stratejisine göre üretilir: alan, dil ve tür değişince ajan adımları da değişir.
import { stratejiOlustur, DIL_ARACLARI, ALAN_STRATEJI } from '../config/testStratejileri'

const m = (coverage, uiCovered, uiTotal, passed, bugs) => ({ coverage, uiCovered, uiTotal, passed, bugs })

export function olaylariOlustur(config) {
  const st = stratejiOlustur(config)
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

  ekle('Planlayıcı Ajan', 'LLM', 'Kod Haritası çıkarıldı, 38 birim bulundu.', 1, mm())
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
    ekle('UI Keşif', 'Tarayıcı', `Uygulama başlatıldı; 6 sayfa, ${uiToplam} etkileşim öğesi bulundu.`, 2, mm())
  }
  if (st.birim) {
    ekle('Test Yazıcı Ajan', 'LLM · Tur 2', alanS.tur2, 2, mm())
    cov = 71
    gecen = 48
    hata = 1
    ekle('Doğrulayıcı · Standardizasyon Katmanı', 'Sandbox · Tur 2', `Kapsama %${cov}, 1 olası hata bulundu.`, 2, mm())
  }
  if (st.arayuz) {
    ekle('UI Test Yazıcı Ajan', 'LLM', `${arac.arayuz} ile 6 kullanıcı akışı için arayüz testi yazıldı.`, 3, mm())
    ui = 22
    gecen += 5
    hata += 1
    ekle('UI Doğrulayıcı · Standardizasyon Katmanı', 'Sandbox', `5/6 akış geçti, ${ui}/${uiToplam} öğe kapsandı.`, 3, mm())
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
