// "Bu testte neler yapılacak?": seçilen alan, dil ve test türüne göre üretilen test planı.
// Seçim değişince plan da değişir; test süreci sabit değildir.
import { Box, Globe, ScanSearch, Sparkles, Target, Workflow, Wrench } from 'lucide-react'
import { stratejiOlustur } from '../../config/testStratejileri'

const TIP = {
  analiz: { ikon: ScanSearch, etiket: 'Analiz', sinif: 'bg-soft text-text-2' },
  llm: { ikon: Sparkles, etiket: 'LLM ajanı', sinif: 'bg-ai-bg text-ai-text' },
  sandbox: { ikon: Box, etiket: 'Sandbox', sinif: 'bg-soft text-text-2' },
  tarayici: { ikon: Globe, etiket: 'Tarayıcı', sinif: 'bg-soft text-text-2' },
}

// sade: ana sayfada sağ sütundaki ikincil görünüm (daha küçük, sakin; açıklamalar tek satır)
export default function StratejiOnizleme({ config, sade = false }) {
  const plan = stratejiOlustur(config)

  return (
    <section
      aria-labelledby="plan-baslik"
      className={'flex flex-1 flex-col rounded-2xl border border-border p-4 ' + (sade ? 'bg-soft/40' : 'bg-soft/50 sm:p-5')}
    >
      <div className="flex items-start gap-3 border-b border-border pb-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-soft text-muted">
          <Workflow size={16} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 id="plan-baslik" className={sade ? 'text-sm font-semibold text-text-2' : 'font-bold text-text'}>Bu testte neler yapılacak?</h3>
          <p className="text-xs text-muted">
            {plan.baslik} için {plan.adimlar.length} adımlı plan. Seçimini değiştirince plan da değişir.
          </p>
        </div>
      </div>

      <ol className={'mt-3 overflow-y-auto pr-1 ' + (sade ? 'max-h-[30rem] space-y-1' : 'max-h-[26rem] space-y-2')} aria-live="polite">
        {plan.adimlar.map((a, i) => {
          const t = TIP[a.tip]
          const Ikon = t.ikon
          return (
            <li
              key={a.ad}
              className={
                'flex gap-3 rounded-xl ' +
                (sade ? 'px-2 py-1.5 hover:bg-surface' : 'border border-border bg-surface p-3 shadow-sm transition-colors hover:border-ai-border')
              }
            >
              <span className={'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold ' + (sade ? 'bg-soft text-muted' : 'bg-ai-bg text-ai-text')}>
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={sade ? 'text-sm text-text-2' : 'text-sm font-medium text-text'}>{a.ad}</span>
                  <span className={'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ' + t.sinif}>
                    <Ikon size={12} aria-hidden="true" /> {t.etiket}
                  </span>
                </div>
                <p className={sade ? 'mt-0.5 line-clamp-1 text-xs text-muted' : 'mt-0.5 text-sm text-text-2'} title={a.aciklama}>
                  {a.aciklama}
                </p>
              </div>
            </li>
          )
        })}
      </ol>

      <div className="mt-4 grid gap-3">
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
