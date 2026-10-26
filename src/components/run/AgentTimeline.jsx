import { useEffect, useRef } from 'react'
import { Check } from 'lucide-react'

// Dikey zaman çizelgesi: son olay aktif, öncekiler tamamlanmış.
export default function AgentTimeline({ events }) {
  const sonRef = useRef(null)

  // Yeni olay gelince ona yumuşakça kaydır
  useEffect(() => {
    sonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [events.length])

  if (events.length === 0) {
    return <p className="text-sm text-muted">Ajanlar başlatılıyor…</p>
  }

  return (
    <ol>
      {events.map((o, i) => {
        const aktif = i === events.length - 1
        const llm = o.kind.startsWith('LLM')
        return (
          <li key={i} ref={aktif ? sonRef : null} className="flex gap-3">
            <div className="flex flex-col items-center">
              {aktif ? (
                <span className="mt-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-accent bg-surface">
                  <span className="h-2 w-2 rounded-full bg-accent" />
                </span>
              ) : (
                <span className="mt-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ok text-white">
                  <Check size={14} strokeWidth={3} />
                </span>
              )}
              {!aktif && <span className="w-px flex-1 bg-border-strong" />}
            </div>
            <div
              className={
                'mb-3 flex-1 rounded-xl border p-4 ' +
                (aktif ? 'border-ai-border bg-ai-bg' : 'border-border bg-surface')
              }
            >
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
          </li>
        )
      })}
    </ol>
  )
}
