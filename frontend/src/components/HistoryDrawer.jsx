import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, CircleDot, X } from 'lucide-react'
import { getHistory } from '../services/api'

import { TURLER as TUR, turListesi } from '../config/testStratejileri'

const ALAN = { web: 'Web', oyun: 'Oyun', mobil: 'Mobil', genel: 'Genel', diger: 'Diğer' }
const DIL = { python: 'Python', csharp: 'C#', js: 'JS/TS', php: 'PHP' }

// Test durumunun rozeti ve tıklanınca gösterilecek açıklama (tamamlanmayan testlerin raporu yoktur)
const DURUM = {
  tamamlandi: { ad: 'Tamamlandı', sinif: 'bg-ok-bg text-ok-text', Ikon: CheckCircle2 },
  kurulumHatasi: { ad: 'Kurulum hatası', sinif: 'bg-bad-bg text-bad-text', Ikon: AlertTriangle, aciklama: 'Bağımlılıklar kurulamadı; requirements.txt dosyasını kontrol et.' },
  hata: { ad: 'Tamamlanamadı', sinif: 'bg-bad-bg text-bad-text', Ikon: AlertTriangle, aciklama: 'Test tamamlanamadı. Yeniden başlatabilirsin.' },
  durduruldu: { ad: 'Durduruldu', sinif: 'bg-soft text-text-2', Ikon: CircleDot, aciklama: 'Bu test durduruldu; raporu yok.' },
  calisiyor: { ad: 'Sürüyor', sinif: 'bg-ai-bg text-ai-text', Ikon: CircleDot, aciklama: 'Bu test hâlâ sürüyor; bitince raporu açılır.' },
  bekliyor: { ad: 'Sürüyor', sinif: 'bg-ai-bg text-ai-text', Ikon: CircleDot, aciklama: 'Bu test hâlâ sürüyor; bitince raporu açılır.' },
}

// Skor çubuğu rengi: yüksek yeşil, orta mavi, düşük kırmızı
function cubukRengi(d) {
  return d >= 85 ? 'bg-ok' : d >= 60 ? 'bg-accent' : 'bg-bad'
}

// Sağdan kayan "Geçmiş Testlerim" paneli.
export default function HistoryDrawer({ open, onClose, onSelect }) {
  const [liste, setListe] = useState(null) // null: yükleniyor
  const [uyari, setUyari] = useState('')
  const kapatRef = useRef(null)

  // Açılınca geçmişi getir
  useEffect(() => {
    if (!open) return
    let iptal = false
    setListe(null)
    setUyari('')
    kapatRef.current?.focus()
    getHistory()
      .then((l) => {
        if (!iptal) setListe(l)
      })
      .catch((h) => {
        if (iptal) return
        setListe([])
        setUyari(h.message)
      })
    return () => {
      iptal = true
    }
  }, [open])

  // ESC kapatır
  useEffect(() => {
    if (!open) return
    function tus(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', tus)
    return () => document.removeEventListener('keydown', tus)
  }, [open, onClose])

  function sec(k) {
    if (k.durum !== 'tamamlandi') {
      setUyari(k.hata || (DURUM[k.durum] || DURUM.hata).aciklama)
      return
    }
    onSelect(k)
  }

  return (
    <div className={'fixed inset-0 z-40 ' + (open ? '' : 'pointer-events-none')} aria-hidden={!open}>
      <div
        onClick={onClose}
        className={
          'absolute inset-0 bg-overlay transition-opacity duration-300 ' + (open ? 'opacity-100' : 'opacity-0')
        }
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Geçmiş Testlerim"
        className={
          'absolute right-0 top-0 flex h-full w-full flex-col border-l border-border bg-surface shadow-xl transition-[transform,visibility] duration-300 sm:w-[400px] ' +
          (open ? 'visible translate-x-0' : 'invisible translate-x-full')
        }
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold text-text">Geçmiş Testlerim</h2>
          <button
            ref={kapatRef}
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-soft"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {uyari && (
            <p role="alert" className="mb-3 rounded-lg border border-bad bg-bad-bg px-3 py-2 text-sm text-bad-text">
              {uyari}
            </p>
          )}
          {liste === null ? (
            <p className="text-sm text-muted">Yükleniyor…</p>
          ) : liste.length === 0 ? (
            !uyari && <p className="text-sm text-muted">Henüz test yok. İlk testini başlattığında burada görünecek.</p>
          ) : (
            <ul className="space-y-2">
              {liste.map((k) => {
                const d = DURUM[k.durum] || DURUM.hata
                // Seçilen her test grubunun skoru ayrı çubukta (birden fazla tür seçildiyse birden fazla çubuk)
                const skorlar = [
                  ['Kod kapsaması', k.coverage],
                  ['UX skoru', k.uxSkor],
                  ['WCAG uyumu', k.erisimSkor],
                ].filter(([, d]) => d != null)
                return (
                  <li key={k.runId}>
                    <button
                      type="button"
                      onClick={() => sec(k)}
                      className="w-full rounded-2xl border border-border bg-bg p-4 text-left transition hover:border-accent hover:shadow-yumusak"
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate font-semibold text-text">{k.proje}</span>
                        <span className={'flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ' + d.sinif}>
                          <d.Ikon size={12} aria-hidden="true" />
                          {d.ad}
                        </span>
                      </span>
                      <span className="mt-2 flex flex-wrap gap-1.5">
                        {[ALAN[k.alan] || k.alan, k.kaynak === 'url' ? 'URL' : DIL[k.dil] || k.dil, ...turListesi(k.tur).map((t) => TUR[t])]
                          .filter(Boolean)
                          .map((e) => (
                            <span key={e} className="rounded-md border border-border bg-surface px-1.5 py-0.5 text-xs text-text-2">
                              {e}
                            </span>
                          ))}
                        <span className="ml-auto self-center text-xs text-muted">{k.tarih}</span>
                      </span>
                      {skorlar.length > 0 ? (
                        skorlar.map(([skorAdi, skor]) => (
                          <span key={skorAdi} className="mt-3 block">
                            <span className="flex justify-between text-xs">
                              <span className="text-muted">{skorAdi}</span>
                              <span className="font-semibold text-text">%{skor}</span>
                            </span>
                            <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-soft" aria-hidden="true">
                              <span className={'block h-full rounded-full ' + cubukRengi(skor)} style={{ width: skor + '%' }} />
                            </span>
                          </span>
                        ))
                      ) : (
                        (k.durum === 'kurulumHatasi' || k.durum === 'hata') && (
                          <span className="mt-3 block text-xs text-bad-text">Test çalıştırılamadı; ayrıntı için tıkla.</span>
                        )
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </aside>
    </div>
  )
}
