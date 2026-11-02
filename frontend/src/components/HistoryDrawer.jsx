import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { getHistory } from '../services/api'

import { TURLER as TUR } from '../config/testStratejileri'

const ALAN = { web: 'Web', oyun: 'Oyun', mobil: 'Mobil', genel: 'Genel', diger: 'Diğer' }
const DIL = { python: 'Python', csharp: 'C#', js: 'JS/TS', php: 'PHP' }

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
    getHistory().then((l) => {
      if (!iptal) setListe(l)
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
    if (k.durum === 'kurulumHatasi') {
      setUyari('Bağımlılıklar kurulamadı; requirements.txt dosyasını kontrol et.')
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
          ) : (
            <ul className="space-y-2">
              {liste.map((k) => {
                const basarili = k.durum === 'tamamlandi'
                return (
                  <li key={k.runId}>
                    <button
                      type="button"
                      onClick={() => sec(k)}
                      className="w-full rounded-xl border border-border bg-bg p-4 text-left hover:border-accent"
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-text">{k.proje}</span>
                        <span
                          className={
                            'rounded-full px-2 py-0.5 text-xs font-medium ' +
                            (basarili ? 'bg-ok-bg text-ok-text' : 'bg-bad-bg text-bad-text')
                          }
                        >
                          {basarili ? 'Tamamlandı' : 'Kurulum hatası'}
                        </span>
                      </span>
                      <span className="mt-1 block text-xs text-muted">
                        {[
                          ALAN[k.alan] || k.alan,
                          k.kaynak === 'url' ? 'URL' : DIL[k.dil] || k.dil,
                          TUR[k.tur] || k.tur,
                          k.coverage != null ? '%' + k.coverage : k.uxSkor != null ? 'UX %' + k.uxSkor : null,
                          k.tarih,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
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
