// Mock backend: gerçek API ile aynı imza. Faz 2'de yalnızca bu dosya değişecek.
import { runEvents, doneEvent } from '../mock/runEvents'
import { report } from '../mock/report'
import { history } from '../mock/history'

// Ağ gecikmesi taklidi
const bekle = (ms = 400) => new Promise((r) => setTimeout(r, ms))

export async function login(eposta, sifre) {
  await bekle()
  // Mock: e-postanın @ öncesinden bir ad üretir
  const ad = eposta.split('@')[0].replace(/[._-]+/g, ' ')
  return { ad: ad.charAt(0).toLocaleUpperCase('tr') + ad.slice(1), eposta }
}

export async function register(ad, eposta, sifre) {
  await bekle()
  return { ad, eposta }
}

export async function forgotPassword(eposta) {
  await bekle()
  return { ok: true }
}

export async function startRun(config) {
  await bekle()
  return { runId: 'run-' + Date.now() }
}

// Olayları ~1,3 sn arayla gönderir, sonda 'done'. Durdurma fonksiyonu döner.
export function subscribeRun(runId, onEvent) {
  let i = 0
  const zamanlayici = setInterval(() => {
    if (i < runEvents.length) {
      onEvent(runEvents[i])
      i++
    } else {
      onEvent({ ...doneEvent, runId })
      clearInterval(zamanlayici)
    }
  }, 1300)
  return () => clearInterval(zamanlayici)
}

export async function stopRun(runId) {
  await bekle()
  return { ok: true }
}

export async function getReport(runId) {
  await bekle()
  // Kalite skoru sonradan gelir
  return { ...report, runId, kaliteSkoru: null }
}

export async function getQualityScore(runId) {
  await bekle()
  await bekle(3000) // mutasyon testi simülasyonu
  return { kaliteSkoru: 81 }
}

export async function getHistory() {
  await bekle()
  return history
}
