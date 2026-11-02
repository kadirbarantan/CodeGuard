import { arayuzVar, birimVar, uxVar } from '../../config/testStratejileri'

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

// Kartlar seçilen teste göre değişir: birim → kod coverage, arayüz → etkileşim, kullanılabilirlik → UX ölçümleri
export default function LiveStats({ config, metrics }) {
  const m = metrics || {}
  const kartlar = []

  if (uxVar(config.tur)) {
    kartlar.push(
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
      <div key="kontrast" className={kutu}>
        <p className={etiket}>Kontrast sorunu</p>
        <p className="mt-1 text-2xl font-semibold text-text">{m.kontrast == null ? '—' : m.kontrast}</p>
      </div>,
      <div key="bulgu" className={kutu}>
        <p className={etiket}>UX bulgusu</p>
        <p className="mt-1 text-2xl font-semibold text-bad-text">{m.bulgu || 0}</p>
      </div>,
    )
  } else {
    const { coverage = 0, uiCovered = 0, uiTotal = 0, passed = 0, bugs = 0 } = m
    if (config.kaynak !== 'url' && birimVar(config.tur)) {
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
  }

  return <div className={'grid gap-3 ' + SUTUN[kartlar.length]}>{kartlar}</div>
}
