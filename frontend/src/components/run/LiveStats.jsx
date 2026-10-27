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

export default function LiveStats({ metrics }) {
  const { coverage = 0, uiCovered = 0, uiTotal = 0, passed = 0, bugs = 0 } = metrics || {}
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className={kutu}>
        <p className={etiket}>Kod coverage</p>
        <p className="mt-1 text-2xl font-semibold text-text">%{coverage}</p>
        <Cubuk oran={coverage} />
      </div>
      <div className={kutu}>
        <p className={etiket}>Etkileşim kapsamı</p>
        <p className="mt-1 text-2xl font-semibold text-text">
          {uiCovered} / {uiTotal}
        </p>
        <Cubuk oran={uiTotal ? (uiCovered / uiTotal) * 100 : 0} />
      </div>
      <div className={kutu}>
        <p className={etiket}>Geçen test / Olası hata</p>
        <p className="mt-1 text-2xl font-semibold">
          <span className="text-ok-text">{passed}</span>
          <span className="text-muted"> / </span>
          <span className="text-bad-text">{bugs}</span>
        </p>
      </div>
    </div>
  )
}
