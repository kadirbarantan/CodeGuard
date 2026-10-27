// "Bu testte neler yapılacak?": seçilen alan, dil ve test türüne göre üretilen test planı.
// Seçim değişince plan da değişir; test süreci sabit değildir.
import { Box, Globe, ScanSearch, Sparkles, Target, Wrench } from 'lucide-react'
import { stratejiOlustur } from '../../config/testStratejileri'

const TIP = {
  analiz: { ikon: ScanSearch, etiket: 'Analiz', sinif: 'bg-soft text-text-2' },
  llm: { ikon: Sparkles, etiket: 'LLM ajanı', sinif: 'bg-ai-bg text-ai-text' },
  sandbox: { ikon: Box, etiket: 'Sandbox', sinif: 'bg-soft text-text-2' },
  tarayici: { ikon: Globe, etiket: 'Tarayıcı', sinif: 'bg-soft text-text-2' },
}

export default function StratejiOnizleme({ config }) {
  const plan = stratejiOlustur(config)

  return (
    <section aria-labelledby="plan-baslik" className="mt-6 rounded-xl border border-border bg-bg p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="plan-baslik" className="font-semibold text-text">Bu testte neler yapılacak?</h3>
        <span className="text-xs text-muted">{plan.baslik} için test planı · seçimini değiştirince plan da değişir</span>
      </div>

      <ol className="mt-4 space-y-2" aria-live="polite">
        {plan.adimlar.map((a, i) => {
          const t = TIP[a.tip]
          const Ikon = t.ikon
          return (
            <li key={a.ad} className="flex gap-3 rounded-lg bg-surface p-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-panel text-xs font-semibold text-on-panel">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-text">{a.ad}</span>
                  <span className={'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ' + t.sinif}>
                    <Ikon size={12} aria-hidden="true" /> {t.etiket}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-text-2">{a.aciklama}</p>
              </div>
            </li>
          )
        })}
      </ol>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted">
            <Wrench size={13} aria-hidden="true" /> Kullanılacak araçlar
          </p>
          <div className="flex flex-wrap gap-1.5">
            {plan.araclar.map((a) => (
              <span key={a} className="rounded-md border border-border bg-surface px-2 py-0.5 font-mono text-xs text-text-2">
                {a}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted">
            <Target size={13} aria-hidden="true" /> Ajanın odaklanacağı konular
          </p>
          <div className="flex flex-wrap gap-1.5">
            {plan.odak.map((o) => (
              <span key={o} className="rounded-md bg-ai-bg px-2 py-0.5 text-xs text-ai-text">
                {o}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
