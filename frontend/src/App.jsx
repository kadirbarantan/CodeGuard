import { useEffect, useRef, useState } from 'react'
import Header from './components/Header'
import Hero from './components/home/Hero'
import ConfigCard from './components/home/ConfigCard'
import HowItWorks from './components/home/HowItWorks'
import AgentLoop from './components/home/AgentLoop'
import ReportPreview from './components/home/ReportPreview'
import AuthModal from './components/AuthModal'
import { startRun, subscribeRun, stopRun, getReport } from './services/api'
import RunSummaryBar from './components/run/RunSummaryBar'
import LiveStats from './components/run/LiveStats'
import AgentTimeline from './components/run/AgentTimeline'
import ReportView from './components/report/ReportView'
import HistoryDrawer from './components/HistoryDrawer'
import { alanAktif, pythonDesteklenir, arayuzDesteklenir } from './config/testStratejileri'

// Mock oturum: localStorage'da 'kullanici' anahtarıyla saklanır
function kayitliKullanici() {
  try {
    return JSON.parse(localStorage.getItem('kullanici')) || null
  } catch {
    return null
  }
}

// Profildeki meslek ve dillerden konfigürasyon varsayılanları (kullanıcı test başına değiştirebilir).
// Şimdilik yalnızca Web alanı aktif: meslek başka bir alansa varsayılan Web olur.
function profilVarsayilan(cfg, u) {
  if (!u?.profilTamam) return cfg
  const alan = alanAktif(u.meslek) ? u.meslek : 'web'
  const uygunDiller = u.diller.filter((d) => d !== 'python' || pythonDesteklenir(alan))
  const dil = uygunDiller[0] || (pythonDesteklenir(alan) ? 'python' : 'js')
  const tur = arayuzDesteklenir(alan) ? cfg.tur : 'birim'
  return { ...cfg, alan, dil, tur, digerMetin: alan === 'diger' ? u.digerMeslek : cfg.digerMetin }
}

export default function App() {
  // Ekran durumu: 'yukle' | 'calisiyor' | 'rapor'
  const [screen, setScreen] = useState('yukle')
  // Giriş yapan kullanıcı: null | { ad, eposta }
  const [user, setUser] = useState(kayitliKullanici)
  // Açık modal: null | 'giris' | 'kayit' | 'sifre' | 'sifreGonderildi'
  const [modal, setModal] = useState(null)
  // Kullanıcı Başlat'a bastı ama giriş yapmamıştı
  const [pendingStart, setPendingStart] = useState(false)
  // Geçmiş Testlerim paneli açık mı
  const [drawerOpen, setDrawerOpen] = useState(false)
  // Konfigürasyon seçimleri
  const [config, setConfig] = useState(() =>
    profilVarsayilan(
      { kaynak: 'kod', dosya: null, url: '', alan: 'web', dil: 'python', tur: 'ikisi', digerMetin: '', baslatmaKomutu: '' },
      kayitliKullanici(),
    ),
  )
  // Çalıştırma: canlı olaylar, sonuç raporu (aktif runId aktifRunRef'te tutulur)
  const [events, setEvents] = useState([])
  const [report, setReport] = useState(null)

  // Aktif aboneliğin durdurma fonksiyonu ve geçerli çalıştırma kimliği (eski olayları yok saymak için)
  const durdurRef = useRef(null)
  const aktifRunRef = useRef(null)

  // Aboneliği kapat (varsa)
  function abonelikKapat() {
    if (durdurRef.current) {
      durdurRef.current()
      durdurRef.current = null
    }
  }

  // Bileşen kaldırılırken abonelik kapansın
  useEffect(() => abonelikKapat, [])

  function cikis() {
    abonelikKapat()
    aktifRunRef.current = null
    localStorage.removeItem('kullanici')
    setUser(null)
    setPendingStart(false)
    setEvents([])
    setScreen('yukle')
  }

  // Testi başlat: runId'yi sakla, olayları dinle, çalışıyor ekranına geç
  async function testiBaslat(cfg) {
    abonelikKapat()
    const { runId: id } = await startRun(cfg)
    abonelikKapat() // startRun beklenirken başka bir abonelik açılmış olabilir (çift tıklama)
    aktifRunRef.current = id
    setEvents([])
    setReport(null)
    setScreen('calisiyor')
    durdurRef.current = subscribeRun(id, (olay) => {
      if (aktifRunRef.current !== id) return
      if (olay.type === 'done') {
        abonelikKapat()
        raporaGec(id)
      } else {
        setEvents((onceki) => [...onceki, olay])
      }
    })
  }

  async function raporaGec(id) {
    const sonuc = await getReport(id)
    if (aktifRunRef.current !== id) return // bu arada durduruldu / çıkış yapıldı
    setReport(sonuc)
    setScreen('rapor')
  }

  // Durdur: aboneliği kapat, çalıştırmayı durdur, ana ekrana dön (config korunur)
  function durdur() {
    const id = aktifRunRef.current
    abonelikKapat()
    aktifRunRef.current = null
    setEvents([])
    setScreen('yukle')
    if (id) stopRun(id)
  }

  // Logo ile ana ekrana dönüş: çalışan test varsa önce durdur
  function anaSayfa() {
    if (screen === 'calisiyor') durdur()
    else setScreen('yukle')
  }

  // Geçmişten tamamlanmış bir kayıt aç: çalışan test varsa aboneliği kapat
  async function gecmistenAc(kayit) {
    const id = aktifRunRef.current
    abonelikKapat()
    aktifRunRef.current = null
    setEvents([])
    if (id && screen === 'calisiyor') stopRun(id)
    setDrawerOpen(false)
    const sonuc = await getReport(kayit.runId)
    setReport(sonuc)
    setScreen('rapor')
  }

  // ConfigCard'dan Başlat: giriş yoksa önce giriş, profil eksikse önce profil
  function baslat(cfg) {
    if (!user || !user.profilTamam) {
      setPendingStart(true)
      setModal(user ? 'profil' : 'giris')
      return
    }
    testiBaslat(cfg)
  }

  function modalKapat() {
    setModal(null)
    setPendingStart(false)
  }

  // Giriş/kayıt başarılı: profil eksikse (ilk giriş) profil adımına geç; değilse devam et
  function girisBasarili(kullanici) {
    localStorage.setItem('kullanici', JSON.stringify(kullanici))
    setUser(kullanici)
    if (!kullanici.profilTamam) {
      setModal('profil') // bekleyen başlatma (pendingStart) korunur
      return
    }
    devamEt(kullanici)
  }

  // Profil kaydedildi (ilk kez ya da "Profilim"den)
  function profilKaydedildi(guncel) {
    const kullanici = { ...user, ...guncel }
    localStorage.setItem('kullanici', JSON.stringify(kullanici))
    setUser(kullanici)
    devamEt(kullanici)
  }

  // Modalı kapat; test bekliyorsa seçimler korunarak başlat, beklemiyorsa profil varsayılanlarını uygula
  function devamEt(kullanici) {
    const bekleyen = pendingStart
    setModal(null)
    setPendingStart(false)
    if (bekleyen) testiBaslat(config)
    else if (screen === 'yukle') setConfig((c) => profilVarsayilan(c, kullanici))
  }

  return (
    <div className="min-h-screen bg-bg text-text">
      <Header
        user={user}
        onHome={anaSayfa}
        onLogin={() => setModal('giris')}
        onRegister={() => setModal('kayit')}
        onHistory={() => setDrawerOpen(true)}
        onProfile={() => setModal('profil')}
        onLogout={cikis}
      />
      {screen === 'yukle' && (
        <main>
          <Hero />
          <ConfigCard config={config} onChange={setConfig} user={user} onStart={baslat} />
          <HowItWorks />
          <AgentLoop />
          <ReportPreview />
        </main>
      )}
      {screen === 'calisiyor' && (
        <main className="mx-auto max-w-6xl space-y-4 px-4 pb-8 pt-4">
          <RunSummaryBar
            config={config}
            round={events.length ? events[events.length - 1].round : 1}
            maxRounds={events.length ? events[events.length - 1].maxRounds : 4}
            onStop={durdur}
          />
          <section className="rounded-2xl border border-border bg-surface p-5 sm:p-8">
            <h2 className="mb-5 text-xl font-semibold">Ajanlar ve Süreç (canlı akış)</h2>
            <LiveStats config={config} metrics={events.length ? events[events.length - 1].metrics : null} />
            <div className="mt-6">
              <AgentTimeline events={events} />
            </div>
          </section>
        </main>
      )}
      {screen === 'rapor' && report && (
        <ReportView
          report={report}
          onNew={() => {
            aktifRunRef.current = null
            setEvents([])
            setReport(null)
            setScreen('yukle')
          }}
        />
      )}
      <HistoryDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onSelect={gecmistenAc} />
      {modal && (
        <AuthModal
          view={modal}
          pendingStart={pendingStart}
          kullanici={user}
          onViewChange={setModal}
          onClose={modalKapat}
          onSuccess={girisBasarili}
          onProfilKaydet={profilKaydedildi}
        />
      )}
    </div>
  )
}
