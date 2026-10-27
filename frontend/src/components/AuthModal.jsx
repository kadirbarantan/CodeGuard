import { useEffect, useRef, useState } from 'react'
import { X, MailCheck } from 'lucide-react'
import { login, register, forgotPassword } from '../services/api'
import ProfileForm from './ProfileForm'

const EPOSTA_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ODAK_SECICI =
  'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'

const BASLIK = {
  giris: 'Giriş Yap',
  kayit: 'Kayıt Ol',
  sifre: 'Şifremi Unuttum',
  sifreGonderildi: 'E-posta gönderildi',
  profil: 'Profilini tamamla',
}

// Alanın altında kırmızı hata metni gösteren girdi
function Alan({ id, label, type = 'text', value, onChange, hata, autoComplete }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-text-2">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        aria-invalid={hata ? 'true' : 'false'}
        aria-describedby={hata ? id + '-hata' : undefined}
        className={
          'min-h-10 w-full rounded-lg border bg-surface px-3 text-sm text-text outline-none focus:border-accent ' +
          (hata ? 'border-bad' : 'border-border-strong')
        }
      />
      {hata && (
        <p id={id + '-hata'} role="alert" className="mt-1 text-sm text-bad-text">
          {hata}
        </p>
      )}
    </div>
  )
}

// Giriş / kayıt / şifre sıfırlama modalı.
// view: 'giris' | 'kayit' | 'sifre' | 'sifreGonderildi' | 'profil'
// 'profil': ilk girişte profil tamamlama ya da "Profilim" (kullanici prop'u ile)
export default function AuthModal({ view, pendingStart, kullanici, onViewChange, onClose, onSuccess, onProfilKaydet }) {
  const [ad, setAd] = useState('')
  const [eposta, setEposta] = useState('')
  const [sifre, setSifre] = useState('')
  const [hatalar, setHatalar] = useState({})
  const [bekliyor, setBekliyor] = useState(false)
  const kutuRef = useRef(null)

  // Görünüm değişince hataları temizle, ilk input'a odaklan
  useEffect(() => {
    setHatalar({})
    const ilk = kutuRef.current?.querySelector('input')
    if (ilk) ilk.focus()
    else kutuRef.current?.querySelector('button')?.focus()
  }, [view])

  // ESC kapatır; Tab odağı modal içinde tutar
  useEffect(() => {
    function tus(e) {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab' || !kutuRef.current) return
      const liste = [...kutuRef.current.querySelectorAll(ODAK_SECICI)]
      if (liste.length === 0) return
      const ilk = liste[0]
      const son = liste[liste.length - 1]
      const aktif = document.activeElement
      if (!kutuRef.current.contains(aktif)) {
        e.preventDefault()
        ilk.focus()
      } else if (e.shiftKey && aktif === ilk) {
        e.preventDefault()
        son.focus()
      } else if (!e.shiftKey && aktif === son) {
        e.preventDefault()
        ilk.focus()
      }
    }
    document.addEventListener('keydown', tus)
    return () => document.removeEventListener('keydown', tus)
  }, [onClose])

  function dogrula() {
    const h = {}
    if (view === 'kayit' && !ad.trim()) h.ad = 'Ad Soyad boş bırakılamaz.'
    if (!eposta.trim()) h.eposta = 'E-posta boş bırakılamaz.'
    else if (!EPOSTA_RE.test(eposta.trim())) h.eposta = 'Geçerli bir e-posta adresi gir.'
    if (view !== 'sifre') {
      if (!sifre) h.sifre = 'Şifre boş bırakılamaz.'
      else if (sifre.length < 8) h.sifre = 'Şifre en az 8 karakter olmalı.'
    }
    return h
  }

  async function gonder(e) {
    e.preventDefault()
    if (bekliyor) return
    const h = dogrula()
    setHatalar(h)
    if (Object.keys(h).length > 0) return
    setBekliyor(true)
    try {
      const mail = eposta.trim()
      if (view === 'giris') onSuccess(await login(mail, sifre))
      else if (view === 'kayit') onSuccess(await register(ad.trim(), mail, sifre))
      else {
        await forgotPassword(mail)
        setBekliyor(false)
        onViewChange('sifreGonderildi')
      }
    } catch {
      setHatalar({ genel: 'Bir hata oluştu. Lütfen tekrar dene.' })
      setBekliyor(false)
    }
  }

  const linkSinif = 'font-medium text-ai-text hover:underline'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={kutuRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-baslik"
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Kapat"
          className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-soft"
        >
          <X size={18} />
        </button>

        <h2 id="auth-baslik" className="mb-4 pr-10 text-xl font-semibold text-text">
          {view === 'profil' && kullanici?.profilTamam ? 'Profilim' : BASLIK[view]}
        </h2>

        {(view === 'giris' || view === 'profil') && pendingStart && (
          <p className="mb-4 rounded-lg border border-ai-border bg-ai-bg px-3 py-2 text-sm text-ai-text">
            {view === 'giris'
              ? 'Testi başlatmak için giriş yapmalısın. Seçimlerin kaybolmaz.'
              : 'Profilini tamamlayınca test otomatik başlayacak.'}
          </p>
        )}

        {view === 'profil' ? (
          <ProfileForm kullanici={kullanici} onKaydet={onProfilKaydet} />
        ) : view === 'sifreGonderildi' ? (
          <div className="space-y-4">
            <p className="flex items-start gap-2 text-sm text-text-2">
              <MailCheck size={18} className="mt-0.5 shrink-0 text-ok-text" />
              Şifre sıfırlama bağlantısı gönderildi. Gelen kutunu kontrol et.
            </p>
            <button
              type="button"
              onClick={() => onViewChange('giris')}
              className="min-h-10 w-full rounded-lg bg-accent px-4 text-sm font-medium text-white hover:opacity-90"
            >
              Girişe dön
            </button>
          </div>
        ) : (
          <form onSubmit={gonder} noValidate className="space-y-4">
            {view === 'sifre' && (
              <p className="text-sm text-text-2">
                E-posta adresini gir, sana şifre sıfırlama bağlantısı gönderelim.
              </p>
            )}
            {view === 'kayit' && (
              <Alan id="auth-ad" label="Ad Soyad" value={ad} onChange={setAd} hata={hatalar.ad} autoComplete="name" />
            )}
            <Alan
              id="auth-eposta"
              label="E-posta"
              type="email"
              value={eposta}
              onChange={setEposta}
              hata={hatalar.eposta}
              autoComplete="email"
            />
            {view !== 'sifre' && (
              <Alan
                id="auth-sifre"
                label="Şifre"
                type="password"
                value={sifre}
                onChange={setSifre}
                hata={hatalar.sifre}
                autoComplete={view === 'giris' ? 'current-password' : 'new-password'}
              />
            )}
            {hatalar.genel && (
              <p role="alert" className="text-sm text-bad-text">
                {hatalar.genel}
              </p>
            )}
            <button
              type="submit"
              disabled={bekliyor}
              className="min-h-10 w-full rounded-lg bg-accent px-4 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {bekliyor
                ? 'Bekleniyor…'
                : view === 'giris'
                  ? 'Giriş Yap'
                  : view === 'kayit'
                    ? 'Kayıt Ol'
                    : 'Bağlantı Gönder'}
            </button>

            <div className="flex flex-col gap-1 text-center text-sm text-text-2">
              {view === 'giris' && (
                <>
                  <button type="button" onClick={() => onViewChange('sifre')} className={linkSinif}>
                    Şifremi unuttum
                  </button>
                  <span>
                    Hesabın yok mu?{' '}
                    <button type="button" onClick={() => onViewChange('kayit')} className={linkSinif}>
                      Kayıt ol
                    </button>
                  </span>
                </>
              )}
              {view === 'kayit' && (
                <span>
                  Zaten hesabın var mı?{' '}
                  <button type="button" onClick={() => onViewChange('giris')} className={linkSinif}>
                    Giriş yap
                  </button>
                </span>
              )}
              {view === 'sifre' && (
                <button type="button" onClick={() => onViewChange('giris')} className={linkSinif}>
                  Girişe dön
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
