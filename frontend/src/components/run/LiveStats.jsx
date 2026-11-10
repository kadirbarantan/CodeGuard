import { arayuzVar, birimVar, erisimVar, uxVar } from '../../config/testStratejileri'

// Canlı metrikler: son olayın metrics alanından beslenir.
function Cubuk({ oran }) {
  const yuzde = Math.max(0, Math.min(100, oran))
  return (
    <div className="mt-2 h-2 overflow-hidden rounded-full bg-soft">
      <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: yuzde + '%' }} />
    </div>
  )
}

const kutu = 'rounded-xl border border-border bg-bg p-4'
const etiket = 'text-sm text-muted'

const SUTUN = { 1: '', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-2 lg:grid-cols-4' }

// Kartlar seçilen test türlerine göre gruplanır: birim → kod coverage, arayüz → etkileşim, kullanılabilirlik → UX ölçümleri,
// erişilebilirlik → WCAG ölçümleri. Birden fazla grup seçiliyse her grup kendi başlığıyla alt alta görünür.
export default function LiveStats({ config, metrics }) {
  const m = metrics || {}
  const gruplar = []

  if ((config.kaynak !== 'url' && birimVar(config.tur)) || arayuzVar(config.tur)) {
    const { coverage = 0, uiCovered = 0, uiTotal = 0, passed = 0, bugs = 0 } = m
    const kartlar = []
    const birim = config.kaynak !== 'url' && birimVar(config.tur)
    if (birim) {
      kartlar.push(
        <div key="cov" className={kutu}>
          <p className={etiket}>Kod coverage</p>
          <p className="mt-1 text-2xl font-semibold text-text">%{coverage}</p>
          <Cubuk oran={coverage} />
        </div>,
      )
    }
    if (arayuzVar(config.tur)) {
      kartlar.push(
        <div key="ui" className={kutu}>
          <p className={etiket}>Etkileşim kapsamı</p>
          <p className="mt-1 text-2xl font-semibold text-text">
            {uiCovered} / {uiTotal}
          </p>
          <Cubuk oran={uiTotal ? (uiCovered / uiTotal) * 100 : 0} />
        </div>,
      )
    }
    kartlar.push(
      <div key="test" className={kutu}>
        <p className={etiket}>Geçen test / Olası hata</p>
        <p className="mt-1 text-2xl font-semibold">
          <span className="text-ok-text">{passed}</span>
          <span className="text-muted"> / </span>
          <span className="text-bad-text">{bugs}</span>
        </p>
      </div>,
    )
    gruplar.push({ id: 'kod', ad: [birim && 'Birim', arayuzVar(config.tur) && 'Arayüz'].filter(Boolean).join(' + '), kartlar })
  }

  if (uxVar(config.tur)) {
    gruplar.push({
      id: 'ux',
      ad: 'Kullanılabilirlik',
      kartlar: [
        <div key="ux" className={kutu}>
          <p className={etiket}>UX skoru</p>
          <p className="mt-1 text-2xl font-semibold text-text">{m.ux == null ? 'Ölçülüyor…' : '%' + m.ux}</p>
          <Cubuk oran={m.ux || 0} />
        </div>,
        <div key="desen" className={kutu}>
          <p className={etiket}>Okuma deseni uyumu</p>
          <p className="mt-1 text-2xl font-semibold text-text">{m.desen == null ? '—' : '%' + m.desen}</p>
          <Cubuk oran={m.desen || 0} />
        </div>,
        <div key="renk" className={kutu}>
          <p className={etiket}>Renk uyumu</p>
          <p className="mt-1 text-2xl font-semibold text-text">{m.renk == null ? '—' : '%' + m.renk}</p>
          <Cubuk oran={m.renk || 0} />
        </div>,
        <div key="bulgu" className={kutu}>
          <p className={etiket}>UX bulgusu</p>
          <p className="mt-1 text-2xl font-semibold text-bad-text">{m.bulgu || 0}</p>
        </div>,
      ],
    })
  }

  if (erisimVar(config.tur)) {
    gruplar.push({
      id: 'erisim',
      ad: 'Erişilebilirlik',
      kartlar: [
        <div key="uyum" className={kutu}>
          <p className={etiket}>WCAG uyumu</p>
          <p className="mt-1 text-2xl font-semibold text-text">{m.uyum == null ? 'Ölçülüyor…' : '%' + m.uyum}</p>
          <Cubuk oran={m.uyum || 0} />
        </div>,
        <div key="lh" className={kutu}>
          <p className={etiket}>Lighthouse erişilebilirlik</p>
          <p className="mt-1 text-2xl font-semibold text-text">{m.lighthouse == null ? '—' : m.lighthouse + ' / 100'}</p>
          <Cubuk oran={m.lighthouse || 0} />
        </div>,
        <div key="ihlal" className={kutu}>
          <p className={etiket}>İhlal türü</p>
          <p className="mt-1 text-2xl font-semibold text-bad-text">{m.ihlal || 0}</p>
        </div>,
        <div key="kritik" className={kutu}>
          <p className={etiket}>Kritik ihlal</p>
          <p className="mt-1 text-2xl font-semibold text-bad-text">{m.kritik || 0}</p>
        </div>,
      ],
    })
  }

  if (gruplar.length === 1) {
    const k = gruplar[0].kartlar
    return <div className={'grid gap-3 ' + SUTUN[k.length]}>{k}</div>
  }
  return (
    <div className="space-y-4">
      {gruplar.map((g) => (
        <section key={g.id} aria-label={g.ad + ' ölçümleri'}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{g.ad}</h3>
          <div className={'grid gap-3 ' + SUTUN[g.kartlar.length]}>{g.kartlar}</div>
        </section>
      ))}
    </div>
  )
}
