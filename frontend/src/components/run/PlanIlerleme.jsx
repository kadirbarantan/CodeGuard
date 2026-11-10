import { ArrowRight, Check } from 'lucide-react'
import { stratejiOlustur } from '../../config/testStratejileri'

// Ana sayfadaki plan özetinin canlı hâli: biten adımlar tikli, sıradaki vurgulu.
// Hangi adımda olunduğu, gelen olay sayısının toplam olaya oranından kestirilir.
export default function PlanIlerleme({ config, adet, toplam }) {
  const adimlar = stratejiOlustur(config).adimlar
  const oran = toplam ? Math.min(1, adet / toplam) : 0
  const biten = Math.max(0, Math.min(adimlar.length - 1, Math.floor(oran * adimlar.length)))
  // Birden fazla test grubu seçiliyse grup değiştiği yerde adımın önünde grup adı görünür
  const coklu = adimlar.some((a) => a.grup)

  return (
    <div className="rounded-2xl border border-border bg-soft/50 p-4">
      <p className="mb-3 text-sm font-semibold text-text">
        Plan <span className="font-normal text-muted">· {biten + 1} / {adimlar.length}. adım</span>
      </p>
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
        {adimlar.map((a, i) => {
          const durum = i < biten ? 'bitti' : i === biten ? 'aktif' : 'bekliyor'
          return (
            <li key={i + a.ad} className="flex items-center gap-1.5" title={a.aciklama} aria-current={durum === 'aktif' ? 'step' : undefined}>
              <span
                className={
                  'flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs ' +
                  (durum === 'bitti'
                    ? 'border-ok/40 bg-ok-bg text-ok-text'
                    : durum === 'aktif'
                      ? 'border-accent bg-ai-bg font-semibold text-ai-text ring-2 ring-accent/20'
                      : 'border-border bg-surface text-muted')
                }
              >
                {durum === 'bitti' ? (
                  <Check size={12} strokeWidth={3} aria-hidden="true" />
                ) : durum === 'aktif' ? (
                  <span className="h-2 w-2 animate-pulse rounded-full bg-accent" aria-hidden="true" />
                ) : (
                  <span className="font-mono font-bold">{i + 1}</span>
                )}
                {coklu && a.grup !== adimlar[i - 1]?.grup && <span className="font-semibold opacity-75">{a.grup}:</span>}
                {a.ad}
              </span>
              {i < adimlar.length - 1 && <ArrowRight size={12} className="text-muted" aria-hidden="true" />}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
