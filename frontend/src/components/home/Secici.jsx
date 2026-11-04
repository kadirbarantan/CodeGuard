// Açılır seçim kutusu (listbox). Yerel <select>'ten farkı: pasif seçeneklerin yanında rozet
// ve üzerine gelince / tıklanınca açıklama gösterebilir ("Şu anda geliştirmeye devam etmektedir").
// secenekler: [{ deger, ad, rozet?, pasif?, ipucu? }]  ·  yerTutucu: seçim yokken görünen soluk metin
import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown, Clock } from 'lucide-react'

export default function Secici({ etiket, deger, secenekler, onSec, devreDisi = false, yerTutucu = '' }) {
  const kimlik = useId()
  const [acik, setAcik] = useState(false)
  const [vurgulu, setVurgulu] = useState(-1)
  const kokRef = useRef(null)
  const butonRef = useRef(null)
  const listeRef = useRef(null)
  const secili = secenekler.find((s) => s.deger === deger)

  // Dışarı tıklanınca kapan
  useEffect(() => {
    if (!acik) return
    function disari(e) {
      if (!kokRef.current?.contains(e.target)) setAcik(false)
    }
    document.addEventListener('mousedown', disari)
    return () => document.removeEventListener('mousedown', disari)
  }, [acik])

  // Açılınca listeye odaklan
  useEffect(() => {
    if (acik) listeRef.current?.focus()
  }, [acik])

  function ac() {
    setVurgulu(Math.max(0, secenekler.findIndex((s) => s.deger === deger)))
    setAcik(true)
  }

  function kapat() {
    setAcik(false)
    butonRef.current?.focus()
  }

  function sec(i) {
    const s = secenekler[i]
    setVurgulu(i)
    if (!s || s.pasif) return // pasif: seçilmez, açıklaması görünür kalır
    onSec(s.deger)
    kapat()
  }

  function listeTus(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setVurgulu((v) => Math.min(secenekler.length - 1, v + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setVurgulu((v) => Math.max(0, v - 1))
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      sec(vurgulu)
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      e.preventDefault()
      kapat()
    }
  }

  return (
    <div ref={kokRef} className="relative">
      <span id={kimlik + '-etiket'} className="mb-1 block text-sm font-medium text-text-2">
        {etiket}
      </span>
      <button
        ref={butonRef}
        type="button"
        disabled={devreDisi}
        aria-haspopup="listbox"
        aria-expanded={acik}
        aria-labelledby={kimlik + '-etiket ' + kimlik + '-deger'}
        onClick={() => (acik ? setAcik(false) : ac())}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault()
            ac()
          }
        }}
        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border border-border-strong bg-surface px-3 text-left text-sm text-text outline-none focus-visible:border-accent disabled:opacity-50"
      >
        <span id={kimlik + '-deger'} className={'truncate' + (secili ? '' : ' text-muted')}>
          {secili ? secili.ad : yerTutucu}
        </span>
        <ChevronDown size={16} className={'shrink-0 text-muted transition-transform ' + (acik ? 'rotate-180' : '')} aria-hidden="true" />
      </button>

      {acik && (
        <ul
          ref={listeRef}
          role="listbox"
          tabIndex={-1}
          aria-labelledby={kimlik + '-etiket'}
          aria-activedescendant={vurgulu >= 0 ? `${kimlik}-${vurgulu}` : undefined}
          onKeyDown={listeTus}
          className="absolute z-20 mt-1 w-full rounded-xl border border-border bg-surface p-1 shadow-lg outline-none"
        >
          {secenekler.map((s, i) => {
            const seciliMi = s.deger === deger
            const aktifMi = i === vurgulu
            return (
              <li
                key={s.deger}
                id={`${kimlik}-${i}`}
                role="option"
                aria-selected={seciliMi}
                aria-disabled={s.pasif || undefined}
                onMouseEnter={() => setVurgulu(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => sec(i)}
                className={
                  'rounded-lg px-3 py-2 text-sm ' +
                  (s.pasif ? 'cursor-not-allowed text-muted ' : 'cursor-pointer text-text ') +
                  (aktifMi ? 'bg-soft' : '')
                }
              >
                <span className="flex items-center gap-2">
                  <span className="flex-1">{s.ad}</span>
                  {s.rozet && (
                    <span
                      className={
                        'rounded-full px-2 py-0.5 text-[11px] font-medium ' +
                        (s.pasif ? 'bg-soft text-muted ring-1 ring-border-strong' : 'bg-ai-bg text-ai-text')
                      }
                    >
                      {s.rozet}
                    </span>
                  )}
                  {seciliMi && <Check size={15} className="text-ai-text" aria-hidden="true" />}
                </span>
                {s.pasif && s.ipucu && aktifMi && (
                  <span role="note" className="mt-1 flex items-center gap-1.5 text-xs text-ai-text">
                    <Clock size={12} aria-hidden="true" /> {s.ipucu}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
