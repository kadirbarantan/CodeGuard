// Mock backend: gerçek API ile aynı imza. Faz 2'de yalnızca bu dosya değişecek.
import { olaylariOlustur, doneEvent } from '../mock/runEvents'
import { report } from '../mock/report'
import { history } from '../mock/history'

// Ağ gecikmesi taklidi
const bekle = (ms = 400) => new Promise((r) => setTimeout(r, ms))

// Mock: profiller tarayıcıda e-postaya göre saklanır (Faz 2'de veritabanında)
const profilAnahtari = (eposta) => 'profil:' + eposta.toLocaleLowerCase('tr')
function profilOku(eposta) {
  try {
    return JSON.parse(localStorage.getItem(profilAnahtari(eposta))) || null
  } catch {
    return null
  }
}

// Kullanıcı nesnesi: { ad, eposta, meslek, digerMeslek, diller, profilTamam }
function kullaniciOlustur(ad, eposta) {
  const profil = profilOku(eposta)
  return profil ? { ad, eposta, ...profil, profilTamam: true } : { ad, eposta, profilTamam: false }
}

export async function login(eposta, sifre) {
  await bekle()
  const profil = profilOku(eposta)
  // Mock: kayıtlı profil yoksa e-postanın @ öncesinden bir ad üretir
  const tahmin = eposta.split('@')[0].replace(/[._-]+/g, ' ')
  const ad = profil?.ad || tahmin.charAt(0).toLocaleUpperCase('tr') + tahmin.slice(1)
  return kullaniciOlustur(ad, eposta)
}

export async function register(ad, eposta, sifre) {
  await bekle()
  return kullaniciOlustur(ad, eposta)
}

// İlk girişte ya da "Profilim"den: { ad, meslek, digerMeslek, diller }
export async function updateProfile(eposta, profil) {
  await bekle()
  localStorage.setItem(profilAnahtari(eposta), JSON.stringify(profil))
  return { eposta, ...profil, profilTamam: true }
}

export async function forgotPassword(eposta) {
  await bekle()
  return { ok: true }
}

// Mock: her çalıştırmanın konfigürasyonu saklanır; olaylar ve rapor buna göre üretilir
const calistirmalar = new Map()

export async function startRun(config) {
  await bekle()
  const runId = 'run-' + Date.now()
  calistirmalar.set(runId, { alan: config.alan, dil: config.dil, tur: config.tur, digerMetin: config.digerMetin })
  return { runId }
}

// Olayları ~1,3 sn arayla gönderir, sonda 'done'. Durdurma fonksiyonu döner.
export function subscribeRun(runId, onEvent) {
  const olaylar = olaylariOlustur(calistirmalar.get(runId) || { alan: 'web', dil: 'python', tur: 'ikisi' })
  let i = 0
  const zamanlayici = setInterval(() => {
    if (i < olaylar.length) {
      onEvent(olaylar[i])
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
  calistirmalar.delete(runId)
  return { ok: true }
}

export async function getReport(runId) {
  await bekle()
  // Kalite skoru sonradan gelir. Dosya içerikleri raporla gelmez (getFileSource ile istenir).
  const { dosyalar, ...digerleri } = report
  const secim = calistirmalar.get(runId) || {}
  // Mock: yalnızca birim testi seçildiyse arayüz sonuçları rapora girmez
  const arayuzYok = secim.tur === 'birim'
  return {
    ...digerleri,
    ...secim,
    ...(arayuzYok && {
      testSayisi: { ...report.testSayisi, arayuz: 0 },
      olasiHatalar: report.olasiHatalar.filter((h) => h.tur !== 'arayuz'),
      testDosyalari: report.testDosyalari.filter((t) => t.tur !== 'arayuz'),
    }),
    runId,
    kaliteSkoru: null,
    dosyalar: dosyalar.map(({ kod, ...d }) => d),
  }
}

// Kod sekmesinde seçilen dosyanın içeriği
export async function getFileSource(runId, yol) {
  await bekle(300)
  const dosya = report.dosyalar.find((d) => d.yol === yol)
  return { yol, kod: dosya ? dosya.kod : '' }
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
