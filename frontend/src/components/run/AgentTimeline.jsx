import { useLayoutEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'

const ALT_ESIK = 40 // px: kullanıcı bu kadar alttaysa "en altta" sayılır

// Dikey zaman çizelgesi: son olay aktif, öncekiler tamamlanmış.
// Kendi kutusunda kayar; sayfa kaymaz.
export default function AgentTimeline({ events }) {
  const kutuRef = useRef(null)
  const alttaRef = useRef(true)
  const [yeniVar, setYeniVar] = useState(false)

  function enAlta() {
    const k = kutuRef.current
    if (!k) return
    k.scrollTo({ top: k.scrollHeight, behavior: 'smooth' })
    alttaRef.current = true
    setYeniVar(false)
  }

  function kaydirildi() {
    const k = kutuRef.current
    const altta = k.scrollHeight - k.scrollTop - k.clientHeight <= ALT_ESIK
    alttaRef.current = altta
    if (altta) setYeniVar(false)
  }

  // Yeni olay: kullanıcı alttaysa kaydır, değilse buton göster
  useLayoutEffect(() => {
    if (events.length === 0) return
    if (alttaRef.current) enAlta()
    else setYeniVar(true)
  }, [events.length])

  if (events.length === 0) {
    return <p className="text-sm text-muted">Ajanlar başlatılıyor…</p>
  }

  return (
    <div>
      <ol
        ref={kutuRef}
        onScroll={kaydirildi}
        tabIndex={0}
        aria-label="Ajan adımları"
        className="max-h-[60vh] overflow-y-auto pr-1"
      >
        {events.map((o, i) => {
          const aktif = i === events.length - 1
          const llm = o.kind.startsWith('LLM')
          return (
            <li key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                {aktif ? (
                  <span className="mt-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-accent bg-surface">
                    <span className="h-2 w-2 rounded-full bg-accent" />
                  </span>
                ) : (
                  <span className="mt-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ok text-white">
                    <Check size={14} strokeWidth={3} />
                  </span>
                )}
                {!aktif && <span className="w-px flex-1 bg-border-strong" />}
              </div>
              {!aktif ? (
                // Biten adım: tek satır, ayrıntı üzerine gelince
                <div title={o.message} className="mb-2 mt-3 flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 text-sm">
                  <span className="min-w-0 shrink truncate font-semibold text-text sm:shrink-0">{o.agent}</span>
                  <span className={'hidden shrink-0 rounded-full px-2 py-0.5 text-xs font-medium sm:inline ' + (llm ? 'bg-ai-bg text-ai-text' : 'bg-soft text-text-2')}>
                    {o.kind}
                  </span>
                  <span className="hidden min-w-0 truncate text-muted sm:inline">{o.message}</span>
                </div>
              ) : (
              <div className="mb-3 min-w-0 flex-1 rounded-xl border border-ai-border bg-ai-bg p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-text">{o.agent}</span>
                  <span
                    className={
                      'rounded-full px-2 py-0.5 text-xs font-medium ' +
                      (llm ? 'bg-ai-bg text-ai-text' : 'bg-soft text-text-2')
                    }
                  >
                    {o.kind}
                  </span>
                  <span className={'ml-auto text-sm font-medium ' + (aktif ? 'text-ai-text' : 'text-ok-text')}>
                    {aktif ? 'Çalışıyor…' : 'Tamamlandı'}
                  </span>
                </div>
                <p className="mt-1 text-sm text-text-2">{o.message}</p>
              </div>
              )}
            </li>
          )
        })}
      </ol>
      {yeniVar && (
        <div className="mt-2 flex justify-center">
          <button
            type="button"
            onClick={enAlta}
            className="min-h-10 rounded-full bg-accent px-4 text-sm font-medium text-white shadow hover:opacity-90"
          >
            ↓ Yeni adımlar
          </button>
        </div>
      )}
    </div>
  )
}
