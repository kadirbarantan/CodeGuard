import { useState } from 'react'
import Header from './components/Header'
import Hero from './components/home/Hero'
import ConfigCard from './components/home/ConfigCard'
import HowItWorks from './components/home/HowItWorks'
import AgentLoop from './components/home/AgentLoop'
import ReportPreview from './components/home/ReportPreview'
import AuthModal from './components/AuthModal'
import { startRun } from './services/api'

// Mock oturum: localStorage'da 'kullanici' anahtarıyla saklanır
function kayitliKullanici() {
  try {
    return JSON.parse(localStorage.getItem('kullanici')) || null
  } catch {
    return null
  }
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
  const [config, setConfig] = useState({
    dosya: null,
    alan: 'web',
    dil: 'python',
    tur: 'ikisi',
    digerMetin: '',
    baslatmaKomutu: '',
  })
  // Çalıştırma: kimlik, canlı olaylar, sonuç raporu
  const [runId, setRunId] = useState(null)
  const [events, setEvents] = useState([])
  const [report, setReport] = useState(null)

  function cikis() {
    localStorage.removeItem('kullanici')
    setUser(null)
    setPendingStart(false)
    setScreen('yukle')
  }

  // Testi başlat: runId'yi sakla, çalışıyor ekranına geç
  async function testiBaslat(cfg) {
    const { runId: id } = await startRun(cfg)
    setRunId(id)
    setEvents([])
    setReport(null)
    setScreen('calisiyor')
  }

  // ConfigCard'dan Başlat: giriş yoksa önce modal
  function baslat(cfg) {
    if (!user) {
      setPendingStart(true)
      setModal('giris')
      return
    }
    testiBaslat(cfg)
  }

  function modalKapat() {
    setModal(null)
    setPendingStart(false)
  }

  // Giriş/kayıt başarılı: kullanıcıyı kaydet, modalı kapat, bekleyen başlatmayı sürdür
  function girisBasarili(kullanici) {
    localStorage.setItem('kullanici', JSON.stringify(kullanici))
    setUser(kullanici)
    const bekleyen = pendingStart
    setModal(null)
    setPendingStart(false)
    if (bekleyen) testiBaslat(config)
  }

  return (
    <div className="min-h-screen bg-bg text-text">
      <Header
        user={user}
        onHome={() => setScreen('yukle')}
        onLogin={() => setModal('giris')}
        onRegister={() => setModal('kayit')}
        onHistory={() => setDrawerOpen(true)}
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
        <main className="mx-auto flex max-w-6xl justify-center px-4 py-16">
          <div className="rounded-2xl border border-border bg-surface p-8 text-center">
            <p className="mb-4 text-text">Test başlatıldı (runId: {runId})</p>
            <button
              type="button"
              onClick={() => setScreen('yukle')}
              className="min-h-10 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:opacity-90"
            >
              Geri dön
            </button>
          </div>
        </main>
      )}
      {modal && (
        <AuthModal
          view={modal}
          pendingStart={pendingStart}
          onViewChange={setModal}
          onClose={modalKapat}
          onSuccess={girisBasarili}
        />
      )}
      {/* Sonraki adımlarda: rapor ekranı, HistoryDrawer */}
    </div>
  )
}
