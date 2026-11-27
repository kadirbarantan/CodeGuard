// Backend ile konuşan tek dosya. İki modda çalışır:
// - VITE_API_URL tanımlıysa (frontend/.env.local) gerçek backend'e gider (uçlar: docs/api-sozlesmesi.md);
// - tanımlı değilse mock veriyle çalışır (Vercel'deki tanıtım sitesi ve backend'siz geliştirme).
// Her fonksiyon iki modda da aynı biçimde veri döner; bileşenler hangi modda olduğunu bilmez.
import { olaylariOlustur, doneEvent } from '../mock/runEvents'
import { report } from '../mock/report'
import { kodYorumu } from '../mock/kodYorumu'
import { history } from '../mock/history'
import { uxReport } from '../mock/uxReport'
import { erisimReport, ihlalKaynagi } from '../mock/erisimReport'
import { KOD_TURLERI, VARSAYILAN_TURLER, arayuzVar, erisimVar, turAdi, turListesi, uxVar, urlAdi } from '../config/testStratejileri'
import { githubRepolari } from '../mock/githubRepos'
import { baglamCozumle } from '../mock/baglamCozumleyici'
import { githubAppPencere } from './githubOAuth'
import { googlePencereIleGiris } from './googleOAuth'

// Gerçek backend adresi (.env.local: VITE_API_URL=http://localhost:8000). Tanımlı değilse mock çalışır.
const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')
export const gercekBackend = Boolean(API_URL)

// Oturum düşünce (401) App.jsx bu olayı dinler: çıkış yapar ve giriş penceresini açar
export const OTURUM_DUSTU = 'codeguard:oturum-dustu'

// Giriş token'ı: App.jsx girişte kullanıcıyı (token'la birlikte) localStorage'a 'kullanici' olarak yazar
function token() {
  try {
    return JSON.parse(localStorage.getItem('kullanici'))?.token || ''
  } catch {
    return ''
  }
}

const ISTEK_SURESI_MS = 30000

// Gerçek backend'e istek. Hata olursa backend'in Türkçe mesajıyla (detail) Error fırlatır.
// oturumsuz: giriş/kayıt gibi token istemeyen uçlar (oradaki 401 "şifre yanlış" demektir, oturum düşmesi değil)
async function istek(yol, { method = 'GET', json, form, oturumsuz = false } = {}) {
  const basliklar = {}
  if (!oturumsuz && token()) basliklar.Authorization = 'Bearer ' + token()
  let govde
  if (json !== undefined) {
    basliklar['Content-Type'] = 'application/json'
    govde = JSON.stringify(json)
  } else if (form) {
    govde = form // multipart: tarayıcı Content-Type'ı sınır bilgisiyle kendisi koyar
  }
  // Sunucu yanıt vermezse istek sonsuza kadar beklemesin
  const zamanAsimi = new AbortController()
  const sayac = setTimeout(() => zamanAsimi.abort(), ISTEK_SURESI_MS)
  let yanit
  try {
    yanit = await fetch(API_URL + yol, { method, headers: basliklar, body: govde, signal: zamanAsimi.signal })
  } catch {
    throw new Error(
      zamanAsimi.signal.aborted ? 'Sunucu yanıt vermiyor. Backend\'in çalıştığını kontrol et.' : 'Sunucuya ulaşılamadı. Backend çalışıyor mu?',
    )
  } finally {
    clearTimeout(sayac)
  }
  const veri = await yanit.json().catch(() => null)
  if (!yanit.ok) {
    if (yanit.status === 401 && !oturumsuz) window.dispatchEvent(new Event(OTURUM_DUSTU))
    const detay = veri?.detail
    const hata = new Error(typeof detay === 'string' ? detay : 'Bir hata oluştu. Lütfen tekrar dene.')
    hata.durum = yanit.status
    throw hata
  }
  return veri
}

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

// Dönen kullanıcı nesnesinde gerçek backend modunda token da vardır (App.jsx saklar)
export async function login(eposta, sifre) {
  if (API_URL) return istek('/auth/giris', { method: 'POST', json: { eposta, sifre }, oturumsuz: true })
  await bekle()
  const profil = profilOku(eposta)
  // Mock: kayıtlı profil yoksa e-postanın @ öncesinden bir ad üretir
  const tahmin = eposta.split('@')[0].replace(/[._-]+/g, ' ')
  const ad = profil?.ad || tahmin.charAt(0).toLocaleUpperCase('tr') + tahmin.slice(1)
  return kullaniciOlustur(ad, eposta)
}

export async function register(ad, eposta, sifre) {
  if (API_URL) return istek('/auth/kayit', { method: 'POST', json: { ad, eposta, sifre }, oturumsuz: true })
  await bekle()
  return kullaniciOlustur(ad, eposta)
}

// İlk girişte ya da "Profilim"den: { ad, meslek, digerMeslek, diller }
export async function updateProfile(eposta, profil) {
  if (API_URL) return istek('/auth/me/profil', { method: 'PUT', json: profil })
  await bekle()
  localStorage.setItem(profilAnahtari(eposta), JSON.stringify(profil))
  return { eposta, ...profil, profilTamam: true }
}

// GitHub ile giriş/kayıt (GitHub App, yalnızca kimlik): hesap yoksa GitHub bilgileriyle oluşturulur.
// Dönen kullanıcı nesnesinde ek alan: github: { kullaniciAdi, repoErisimi }
export async function githubIleGiris() {
  if (API_URL) return githubAppPencere(API_URL, { giris: true })
  // Mock: GitHub'a gitmeden örnek bir hesapla giriş yapılmış sayılır
  await bekle(900)
  const kullanici = kullaniciOlustur('GitHub Kullanıcısı', 'github-demo@codeguard.dev')
  return { ...kullanici, github: { kullaniciAdi: 'codeguard-demo' } }
}

// Google ile giriş/kayıt (OpenID Connect): hesap yoksa Google bilgileriyle oluşturulur;
// aynı doğrulanmış e-postayla açılmış hesap varsa ona bağlanır. Ek alan: google: { eposta }
export async function googleIleGiris() {
  if (API_URL) return googlePencereIleGiris(API_URL)
  // Mock: Google'a gitmeden örnek bir hesapla giriş yapılmış sayılır
  await bekle(900)
  const eposta = 'google-demo@codeguard.dev'
  return { ...kullaniciOlustur('Google Kullanıcısı', eposta), google: { eposta } }
}

// ── GitHub sekmesi (K17, belge 22): bağlanma, repo erişimi, repo · dal · ağaç · bağlam ──
// Gerçek backend'de bağlanma GitHub App ile olur: kimlik + kullanıcının seçtiği repolara salt okunur erişim.
// Erişim GitHub'da kaldırılmışsa repo uçları 410 döner (GitHubGirdi "Repolarına erişim ver"e döner).
const mockRepo = (ad) => githubRepolari.find((r) => r.ad === ad)
const sorgu = (p) => new URLSearchParams(p).toString()

// Girişli kullanıcı: pencereye verilecek kısa ömürlü bilet → GitHub hesabı bu hesaba bağlanır
async function hesabaBagla() {
  const { bilet } = await istek('/auth/github-app/bilet', { method: 'POST' })
  const kullanici = await githubAppPencere(API_URL, { bilet })
  return { github: kullanici.github, token: kullanici.token }
}

// Giriş yokken: GitHub ile giriş + repo erişimi tek adımda. Dönen: kullanıcı nesnesi
export async function githubBaglan() {
  if (API_URL) return githubAppPencere(API_URL)
  const kullanici = await githubIleGiris()
  return { ...kullanici, github: { ...kullanici.github, repoErisimi: true } }
}

// E-postayla giriş yapmış kullanıcı: hesaba GitHub bağlanır. Dönen: kullanıcıya eklenecek alanlar
export async function githubHesabiBagla() {
  if (API_URL) return hesabaBagla()
  await bekle(900)
  return { github: { kullaniciAdi: 'codeguard-demo', repoErisimi: true } }
}

// GitHub bağlı ama repolara erişim verilmemiş. Dönen: kullanıcıya eklenecek alanlar
export async function githubRepoErisimiVer(github) {
  if (API_URL) return hesabaBagla()
  await bekle(900)
  return { github: { ...github, repoErisimi: true } }
}

// → [{ ad: 'sahip/repo', gizli, dil }]
export async function getGithubRepolari() {
  if (API_URL) return istek('/github/repolar')
  await bekle()
  return githubRepolari.map(({ ad, gizli, dil }) => ({ ad, gizli, dil }))
}

// → [{ ad, commit }] (varsayılan dal ilk sırada)
export async function getGithubDallari(repo) {
  if (API_URL) return istek('/github/dallar?' + sorgu({ repo }))
  await bekle(300)
  return mockRepo(repo)?.dallar || []
}

// → [{ yol, boyut }] (yalnızca yollar ve boyutlar; içerik indirilmez)
export async function getGithubAgaci(repo, dal) {
  if (API_URL) return istek('/github/agac?' + sorgu({ repo, dal }))
  await bekle(500)
  return mockRepo(repo)?.agac || []
}

// Bağlam Çözümleyici: seçilen dosyaların çalışması için gereken dosyalar → { baglam: [{ yol, neden }], tumRepo }
export async function getGithubBaglami(repo, dal, secilenler, tur) {
  if (API_URL) return istek('/github/baglam', { method: 'POST', json: { repo, dal, secilenler, tur: turListesi(tur) } })
  await bekle(300)
  const r = mockRepo(repo)
  return r ? baglamCozumle(r, secilenler, tur) : { baglam: [], tumRepo: false }
}

// Sayfa açılınca kayıtlı oturumun hâlâ geçerli olduğunu doğrular (gerçek backend modunda). Dönen: kullanıcı
export async function oturumuDogrula() {
  return API_URL ? istek('/auth/me') : null
}

export async function forgotPassword(eposta) {
  if (API_URL) throw new Error('Şifre sıfırlama henüz hazır değil. Şimdilik GitHub ya da Google ile giriş yapabilirsin.')
  await bekle()
  return { ok: true }
}

// Mock: her çalıştırmanın konfigürasyonu saklanır; olaylar ve rapor buna göre üretilir
const calistirmalar = new Map()

// Gerçek backend'de gönderilen seçim (docs/api-sozlesmesi.md 2.1)
function secimOlustur(config) {
  const urlModu = config.kaynak === 'url'
  const g = config.github
  return {
    kaynak: config.kaynak || 'kod',
    alan: config.alan,
    dil: urlModu ? null : config.dil,
    tur: config.tur,
    digerMetin: config.digerMetin || '',
    url: urlModu ? config.url.trim() : '',
    baslatmaKomutu: config.baslatmaKomutu || '',
    // "Örnek projeyle dene": dosya yerine sunucudaki örnek proje
    ornek: config.kaynak === 'kod' && config.dosya?.ornek ? config.dosya.ad : null,
    // GitHub: backend dalın son commit'ini indirir, bağlamı kendisi yeniden hesaplar (belge 22)
    github: config.kaynak === 'github' && g ? { repo: g.repo, dal: g.dal, commit: g.commit, secilenler: g.secilenler || [] } : null,
  }
}

export async function startRun(config) {
  if (API_URL) {
    const secim = secimOlustur(config)
    const form = new FormData()
    form.append('secim', JSON.stringify(secim))
    if (secim.kaynak === 'kod' && !secim.ornek) {
      // Dosya adı göreli yoldur (blog-api/app/posts.py); backend klasör yapısını buradan kurar
      for (const { yol, dosya } of config.dosya?.dosyalar || []) form.append('dosyalar', dosya, yol)
    }
    return istek('/runs', { method: 'POST', form })
  }
  await bekle()
  const runId = 'run-' + Date.now()
  const urlModu = config.kaynak === 'url'
  const githubModu = config.kaynak === 'github'
  calistirmalar.set(runId, {
    alan: config.alan,
    dil: config.dil,
    tur: config.tur,
    digerMetin: config.digerMetin,
    kaynak: config.kaynak || 'kod',
    url: urlModu ? config.url : '',
    proje: urlModu ? urlAdi(config.url) : githubModu ? config.github?.repo?.split('/').pop() : config.dosya?.ad,
  })
  return { runId }
}

// Canlı akış. Olaylar: agent_step … ve sonda { type: 'done', runId } ya da { type: 'hata', mesaj }.
// Aboneliği kapatan fonksiyon döner.
export function subscribeRun(runId, onEvent) {
  if (API_URL) return canliAkisAc(runId, onEvent)
  // Mock: olayları ~1,3 sn arayla gönderir
  const olaylar = olaylariOlustur(calistirmalar.get(runId) || { alan: 'web', dil: 'python', tur: VARSAYILAN_TURLER })
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

// Gerçek backend: WebSocket. Bağlantı koparsa kaldığı yerden (sonSira) en fazla 3 kez yeniden bağlanır.
function canliAkisAc(runId, onEvent) {
  const adres = API_URL.replace(/^http/, 'ws') + `/runs/${encodeURIComponent(runId)}/olaylar`
  let ws = null
  let bitti = false
  let sonSira = -1
  let deneme = 0

  function bitir(olay) {
    if (bitti) return
    bitti = true
    onEvent(olay)
  }

  function baglan() {
    ws = new WebSocket(adres)
    ws.onopen = () => ws.send(JSON.stringify({ token: token(), sonSira }))
    ws.onmessage = (m) => {
      const olay = JSON.parse(m.data)
      deneme = 0
      if (olay.type === 'agent_step') {
        sonSira = olay.sira
        if (!bitti) onEvent(olay)
      } else if (olay.type === 'done') bitir({ type: 'done', runId })
      else if (olay.type === 'hata') bitir({ type: 'hata', mesaj: olay.mesaj || 'Test tamamlanamadı.' })
      else if (olay.type === 'durduruldu') bitir({ type: 'hata', mesaj: 'Test durduruldu.' })
    }
    ws.onclose = (e) => {
      if (bitti) return
      if (e.code === 4401) {
        bitti = true
        window.dispatchEvent(new Event(OTURUM_DUSTU))
      } else if (e.code === 4404) {
        bitir({ type: 'hata', mesaj: 'Test bulunamadı.' })
      } else if (deneme < 3) {
        deneme += 1
        setTimeout(() => !bitti && baglan(), 1000 * deneme)
      } else {
        bitir({ type: 'hata', mesaj: 'Canlı akış bağlantısı koptu. Sonucu Geçmiş Testlerim\'den açabilirsin.' })
      }
    }
  }

  baglan()
  return () => {
    bitti = true
    ws?.close()
  }
}

export async function stopRun(runId) {
  if (API_URL) return istek(`/runs/${encodeURIComponent(runId)}/durdur`, { method: 'POST' })
  await bekle()
  calistirmalar.delete(runId)
  return { ok: true }
}

// Kod testleri raporu (birim ve/veya arayüz)
function kodRaporu(secim, runId) {
  const { dosyalar, ...digerleri } = report
  // URL ile test: kaynak kod yok; birim sonuçları ve Kod sekmesi rapora girmez
  if (secim.kaynak === 'url') {
    return {
      ...digerleri,
      ...secim,
      coverage: null,
      testSayisi: { ...report.testSayisi, birim: 0 },
      olasiHatalar: report.olasiHatalar.filter((h) => h.tur !== 'birim'),
      testDosyalari: report.testDosyalari.filter((t) => t.tur !== 'birim'),
      runId,
      kaliteSkoru: null,
      dosyalar: [],
    }
  }

  // Mock: arayüz testi seçilmediyse arayüz sonuçları rapora girmez
  const arayuzYok = !arayuzVar(secim.tur)
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
    // Kod Yorumu: Kod Haritası birimleri + LLM açıklaması ve risk (yalnızca kaynak kod varsa)
    kodYorumu,
  }
}

// Erişilebilirlik raporu: URL ile testte kaynak kod olmadığı için ihlaller koda bağlanmaz
function erisimRaporu(secim, runId) {
  const kodVar = secim.kaynak !== 'url'
  return {
    ...erisimReport,
    ...secim,
    runId,
    ihlaller: erisimReport.ihlaller.map(({ kaynak, ...i }) => (kodVar && kaynak ? { ...i, kaynak: ihlalKaynagi(kaynak, secim.dil) } : i)),
  }
}

// Rapor: seçilen her test grubu kendi raporunu üretir (kod testleri, kullanılabilirlik, erişilebilirlik).
// Tek grup seçildiyse o rapor döner. Birden fazla grup seçildiyse birleşik rapor döner:
//   { ...seçim, runId, tur: [...], turSayisi, parcalar: [{ id: 'kod' | 'ux' | 'erisim', ad, rapor }] }
// Her parçanın rapor biçimi tek başına seçildiğindeki raporla aynıdır.
export async function getReport(runId) {
  if (API_URL) return istek(`/runs/${encodeURIComponent(runId)}/rapor`)
  await bekle()
  // Kalite skoru sonradan gelir. Dosya içerikleri raporla gelmez (getFileSource ile istenir).
  // Seçim: bu oturumda başlatılan çalıştırma ya da geçmişteki kayıt
  const kayit = calistirmalar.get(runId) || history.find((h) => h.runId === runId) || {}
  const secim = Object.fromEntries(
    ['proje', 'alan', 'dil', 'tur', 'digerMetin', 'kaynak', 'url'].filter((k) => kayit[k] != null).map((k) => [k, kayit[k]]),
  )
  const turler = turListesi(secim.tur ?? VARSAYILAN_TURLER)

  const parcalar = []
  const kodTurleri = turler.filter((t) => KOD_TURLERI.includes(t))
  if (kodTurleri.length) parcalar.push({ id: 'kod', ad: turAdi(kodTurleri), rapor: kodRaporu({ ...secim, tur: kodTurleri }, runId) })
  if (uxVar(turler)) parcalar.push({ id: 'ux', ad: 'Kullanılabilirlik', rapor: { ...uxReport, ...secim, tur: ['kullanilabilirlik'], runId } })
  if (erisimVar(turler)) parcalar.push({ id: 'erisim', ad: 'Erişilebilirlik', rapor: erisimRaporu({ ...secim, tur: ['erisilebilirlik'] }, runId) })

  if (parcalar.length === 1) return parcalar[0].rapor
  return {
    ...secim,
    runId,
    tur: turler,
    turSayisi: parcalar.find((p) => p.id === 'kod')?.rapor.turSayisi ?? null,
    parcalar,
  }
}

// Kod sekmesinde seçilen dosyanın içeriği
export async function getFileSource(runId, yol) {
  if (API_URL) {
    try {
      return await istek(`/runs/${encodeURIComponent(runId)}/dosya?yol=${encodeURIComponent(yol)}`)
    } catch {
      return { yol, kod: '// Bu dosyanın içeriği alınamadı.' }
    }
  }
  await bekle(300)
  const dosya = report.dosyalar.find((d) => d.yol === yol)
  return { yol, kod: dosya ? dosya.kod : '' }
}

// Kalite skoru (mutasyon testi) rapordan sonra hesaplanır: gerçek backend'de 2 sn'de bir sorulur (en fazla ~1 dk)
export async function getQualityScore(runId) {
  if (API_URL) {
    for (let i = 0; i < 30; i++) {
      try {
        const s = await istek(`/runs/${encodeURIComponent(runId)}/kalite`)
        if (s.kaliteSkoru != null) return s
      } catch {
        return { kaliteSkoru: null }
      }
      await bekle(2000)
    }
    return { kaliteSkoru: null }
  }
  await bekle()
  await bekle(3000) // mutasyon testi simülasyonu
  return { kaliteSkoru: 81 }
}

export async function getHistory() {
  if (API_URL) return istek('/runs')
  await bekle()
  return history
}
