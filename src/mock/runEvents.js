// Canlı akış olayları (WebSocket mesajını taklit eder). Faz 2'de backend aynı biçimi gönderecek.
const m = (coverage, uiCovered, uiTotal, passed, bugs) => ({ coverage, uiCovered, uiTotal, passed, bugs })

export const runEvents = [
  { type: 'agent_step', agent: 'Planlayıcı Ajan', kind: 'LLM', message: 'Kod Haritası çıkarıldı, 38 birim bulundu.', round: 1, maxRounds: 4, metrics: m(0, 0, 0, 0, 0) },
  { type: 'agent_step', agent: 'Planlayıcı Ajan', kind: 'LLM', message: 'Test planı hazır.', round: 1, maxRounds: 4, metrics: m(0, 0, 0, 0, 0) },
  { type: 'agent_step', agent: 'Test Yazıcı Ajan', kind: 'LLM · Tur 1', message: '46 test yazıldı.', round: 1, maxRounds: 4, metrics: m(0, 0, 0, 0, 0) },
  { type: 'agent_step', agent: 'Doğrulayıcı · Standardizasyon Katmanı', kind: 'Sandbox · Tur 1', message: '41/46 test geçti, kapsama %34.', round: 1, maxRounds: 4, metrics: m(34, 0, 0, 41, 0) },
  { type: 'agent_step', agent: 'UI Keşif', kind: 'Tarayıcı', message: '6 sayfa, 24 etkileşim öğesi bulundu.', round: 2, maxRounds: 4, metrics: m(34, 0, 24, 41, 0) },
  { type: 'agent_step', agent: 'Test Yazıcı Ajan', kind: 'LLM · Tur 2', message: 'Kapsanmayan 18 dal için 9 test eklendi.', round: 2, maxRounds: 4, metrics: m(34, 0, 24, 41, 0) },
  { type: 'agent_step', agent: 'Doğrulayıcı · Standardizasyon Katmanı', kind: 'Sandbox · Tur 2', message: 'Kapsama %71, 1 olası hata bulundu.', round: 2, maxRounds: 4, metrics: m(71, 0, 24, 48, 1) },
  { type: 'agent_step', agent: 'UI Test Yazıcı Ajan', kind: 'LLM', message: '6 kullanıcı akışı için arayüz testi yazıldı.', round: 3, maxRounds: 4, metrics: m(71, 0, 24, 48, 1) },
  { type: 'agent_step', agent: 'UI Doğrulayıcı · Standardizasyon Katmanı', kind: 'Sandbox', message: '5/6 akış geçti, 22/24 öğe kapsandı.', round: 3, maxRounds: 4, metrics: m(71, 22, 24, 53, 2) },
  { type: 'agent_step', agent: 'Test Yazıcı Ajan', kind: 'LLM · Tur 3', message: 'Kalan dallar için yeni testler yazıldı.', round: 3, maxRounds: 4, metrics: m(71, 22, 24, 53, 2) },
  { type: 'agent_step', agent: 'Doğrulayıcı · Standardizasyon Katmanı', kind: 'Sandbox · Tur 3', message: 'Kapsama %94, döngü durdu.', round: 3, maxRounds: 4, metrics: m(94, 22, 24, 58, 3) },
  { type: 'agent_step', agent: 'İçgörü Ajanı', kind: 'LLM', message: 'Rapor hazırlanıyor.', round: 4, maxRounds: 4, metrics: m(94, 22, 24, 58, 3) },
]

// Akışın sonunda gelen bitiş olayı (runId api.js'te eklenir)
export const doneEvent = { type: 'done' }
