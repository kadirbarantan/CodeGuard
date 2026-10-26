import { useState } from 'react'
import Header from './components/Header'
import Hero from './components/home/Hero'
import ConfigCard from './components/home/ConfigCard'
import HowItWorks from './components/home/HowItWorks'
import AgentLoop from './components/home/AgentLoop'
import ReportPreview from './components/home/ReportPreview'

export default function App() {
  // Ekran durumu: 'yukle' | 'calisiyor' | 'rapor'
  const [screen, setScreen] = useState('yukle')
  // Giriş yapan kullanıcı: null | { ad, eposta }
  const [user, setUser] = useState(null)
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
    setUser(null)
    setScreen('yukle')
  }

  // Başlat: şimdilik sadece config'i konsola yazar (giriş/çalıştırma sonraki adımda)
  function baslat(cfg) {
    console.log('Başlat', cfg)
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
      {/* Sonraki adımlarda: calisiyor/rapor ekranları, AuthModal, HistoryDrawer */}
    </div>
  )
}
