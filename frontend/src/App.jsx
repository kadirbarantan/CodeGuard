import { useCallback, useEffect, useRef, useState } from 'react'
import Header from './components/Header'
import Hero from './components/home/Hero'
import TerminalBolumu from './components/home/AcilisAnimasyonu'
import ConfigCard from './components/home/ConfigCard'
import HowItWorks from './components/home/HowItWorks'
// AgentLoop (Standardizasyon Katmanı görseli) ana sayfadan kaldırıldı; tez sunumunda kullanılmak üzere dosyası duruyor.
import ReportPreview from './components/home/ReportPreview'
import GuvenBolumu from './components/home/GuvenBolumu'
import AuthModal from './components/AuthModal'
import Toast from './components/Toast'
import { OTURUM_DUSTU, getReport, oturumuDogrula, startRun, stopRun, subscribeRun } from './services/api'
import RunSummaryBar from './components/run/RunSummaryBar'
import LiveStats from './components/run/LiveStats'
import AgentTimeline from './components/run/AgentTimeline'
import PlanIlerleme from './components/run/PlanIlerleme'
import VurguKart from './components/VurguKart'
import { olaylariOlustur } from './mock/runEvents'
import ReportView from './components/report/ReportView'
import HistoryDrawer from './components/HistoryDrawer'
import { alanAktif, pythonDesteklenir, turDuzelt } from './config/testStratejileri'

// Oturum: localStorage'da 'kullanici' anahtarıyla saklanır (gerçek backend modunda token da içinde)
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
  const tur = turDuzelt(cfg.tur, alan, cfg.kaynak)
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
      { kaynak: 'kod', dosya: null, url: '', github: null, alan: 'web', dil: 'python', tur: [], digerMetin: '', baslatmaKomutu: '' },
      kayitliKullanici(),
    ),
  )
  // Çalıştırma: canlı olaylar, sonuç raporu (aktif runId aktifRunRef'te tutulur)
  const [events, setEvents] = useState([])
  // Plan ilerlemesi için beklenen toplam olay (Faz 2'de backend toplam adımı kendisi gönderebilir)
  const toplamOlay = screen === 'calisiyor' ? olaylariOlustur(config).length : 0
  const [report, setReport] = useState(null)
  // Sağ altta kısa bildirim (hata mesajları vb.)
  const [bildirim, setBildirim] = useState('')
  const bildirimKapat = useCallback(() => setBildirim(''), [])

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

  // Gerçek backend: sayfa açılınca kayıtlı oturumu doğrula (süresi dolduysa aşağıdaki olay çıkış yaptırır)
  useEffect(() => {
    if (!kayitliKullanici()) return
    oturumuDogrula()
      .then((guncel) => {
        if (!guncel) return
        const kullanici = { ...kayitliKullanici(), ...guncel }
        localStorage.setItem('kullanici', JSON.stringify(kullanici))
        setUser(kullanici)
      })
      .catch(() => {})
  }, [])

  // Oturum düştü (token geçersiz ya da süresi doldu): çıkış yap, giriş penceresini aç
  useEffect(() => {
    function dustu() {
      cikis()
      setModal('giris')
      setBildirim('Oturumun sona erdi. Devam etmek için tekrar giriş yap.')
    }
    window.addEventListener(OTURUM_DUSTU, dustu)
    return () => window.removeEventListener(OTURUM_DUSTU, dustu)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function cikis() {
    abonelikKapat()
    aktifRunRef.current = null
    localStorage.removeItem('kullanici')
    setUser(null)
    setPendingStart(false)
    setEvents([])
    setScreen('yukle')
    setConfig((c) => ({ ...c, github: null })) // repo seçimi hesaba bağlı
  }

  // Testi başlat: runId'yi sakla, olayları dinle, çalışıyor ekranına geç
  async function testiBaslat(cfg) {
    abonelikKapat()
    let id
    try {
      ;({ runId: id } = await startRun(cfg))
    } catch (h) {
      // 401: oturum düştü (giriş penceresi açıldı); girişten sonra test kendiliğinden başlasın
      if (h.durum === 401) setPendingStart(true)
      else setBildirim(h.message)
      return
    }
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
      } else if (olay.type === 'hata') {
        // Kurulum hatası, sunucu yeniden başladı ya da bağlantı koptu: ana ekrana dön, nedenini göster
        abonelikKapat()
        aktifRunRef.current = null
        setEvents([])
        setScreen('yukle')
        setBildirim(olay.mesaj)
      } else {
        setEvents((onceki) => [...onceki, olay])
      }
    })
  }

  async function raporaGec(id) {
    let sonuc
    try {
      sonuc = await getReport(id)
    } catch (h) {
      if (aktifRunRef.current !== id) return
      aktifRunRef.current = null
      setScreen('yukle')
      setBildirim(h.message)
      return
    }
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
    if (id) stopRun(id).catch(() => {})
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
    if (id && screen === 'calisiyor') stopRun(id).catch(() => {})
    setDrawerOpen(false)
    let sonuc
    try {
      sonuc = await getReport(kayit.runId)
    } catch (h) {
      setBildirim(h.message)
      return
    }
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

  // GitHub sekmesinde hesap bağlama / repo erişimi: kullanıcıya yeni alanlar eklenir (örn. github)
  function kullaniciGuncelle(degisim) {
    const kullanici = { ...user, ...degisim }
    localStorage.setItem('kullanici', JSON.stringify(kullanici))
    setUser(kullanici)
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
    <div className="min-h-screen overflow-x-clip bg-bg text-text">
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
          {/* Açılış: solda slogan, sağda test kartı (geniş ekranda yan yana) */}
          <section className="relative isolate overflow-x-clip">
            <div aria-hidden="true" className="hero-zemin pointer-events-none absolute inset-0 -z-10">
              <div className="izgara absolute inset-0 opacity-70" />
            </div>
            <div className="mx-auto grid w-full max-w-7xl items-start gap-12 px-4 pb-16 pt-12 sm:px-6 sm:pt-16 xl:grid-cols-12 xl:gap-10 xl:pb-12 xl:pt-10">
              <div className="xl:sticky xl:top-28 xl:col-span-4 xl:pt-10">
                <Hero yan />
              </div>
              <div className="min-w-0 xl:col-span-8">
          <ConfigCard
            yanYana
            config={config}
            onChange={setConfig}
            user={user}
            onStart={baslat}
            onGirisYapildi={girisBasarili}
            onKullaniciGuncelle={kullaniciGuncelle}
            onGirisAc={() => setModal('giris')}
          />
              </div>
            </div>
          </section>
          <HowItWorks />
          <TerminalBolumu />
          <ReportPreview />
          <GuvenBolumu />
          <footer className="border-t border-border">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-muted sm:px-6">
              <span>
                <strong className="font-bold text-text">CodeGuard</strong>, LLM ajanlarıyla otonom test üretimi
              </span>
              <span>Bitirme projesi, 2026</span>
            </div>
          </footer>
        </main>
      )}
      {screen === 'calisiyor' && (
        <main className="relative isolate">
          <div aria-hidden="true" className="hero-zemin pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem]">
            <div className="izgara absolute inset-0 opacity-70" />
          </div>
          <div className="mx-auto max-w-7xl space-y-6 px-4 pb-12 pt-4 sm:px-6">
            <RunSummaryBar
              config={config}
              round={events.length ? events[events.length - 1].round : 1}
              maxRounds={events.length ? events[events.length - 1].maxRounds : 4}
              onStop={durdur}
            />
            <VurguKart
              baslik="Canlı Akış"
              sag={
                <span className="flex items-center gap-2 text-sm font-medium text-ai-text">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-accent" aria-hidden="true" />
                  Ajanlar çalışıyor
                </span>
              }
              govde="space-y-5 p-4 sm:p-6"
            >
              <PlanIlerleme config={config} adet={events.length} toplam={toplamOlay} />
              <LiveStats config={config} metrics={events.length ? events[events.length - 1].metrics : null} />
              <AgentTimeline events={events} />
            </VurguKart>
          </div>
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
      <Toast message={bildirim} onClose={bildirimKapat} sure={6000} />
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
