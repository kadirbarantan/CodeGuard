// Kullanılabilirlik (UX) testi raporu: özet, UX bulguları, okuma deseni (Z / F), renk uyumu ve kontrast.
import { useState } from 'react'
import { Lightbulb } from 'lucide-react'
import CoverageDonut from './CoverageDonut'

const ONEM = {
  yuksek: { ad: 'Yüksek', sinif: 'bg-bad-bg text-bad-text' },
  orta: { ad: 'Orta', sinif: 'bg-ai-bg text-ai-text' },
  dusuk: { ad: 'Düşük', sinif: 'bg-soft text-text-2' },
}

const GEREKEN_KONTRAST = 4.5 // WCAG 2.1 AA, normal metin

// Z ya da F okuma deseninin küçük çizimi
function DesenIkonu({ desen }) {
  return (
    <svg viewBox="0 0 40 30" className="h-6 w-8 shrink-0" aria-hidden="true">
      <rect x="0.5" y="0.5" width="39" height="29" rx="4" fill="none" stroke="var(--border-strong)" />
      {desen === 'Z' ? (
        <polyline points="7,7 33,7 7,23 33,23" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      ) : (
        <path d="M7 6 V24 M7 7 H33 M7 15 H25" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
      )}
    </svg>
  )
}

function Cubuk({ oran }) {
  const renk = oran >= 80 ? 'bg-ok' : oran >= 65 ? 'bg-accent' : 'bg-bad'
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-soft">
      <div className={'h-full rounded-full ' + renk} style={{ width: oran + '%' }} />
    </div>
  )
}

function Bulgular({ bulgular }) {
  return (
    <ul className="space-y-3">
      {bulgular.map((b) => (
        <li key={b.baslik} className="rounded-xl border border-border bg-bg p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={'rounded-full px-2 py-0.5 text-xs font-medium ' + ONEM[b.onem].sinif}>{ONEM[b.onem].ad}</span>
            <span className="font-semibold text-text">{b.baslik}</span>
            <span className="ml-auto font-mono text-xs text-muted">{b.sayfa}</span>
          </div>
          <p className="mt-1.5 text-sm text-text-2">{b.aciklama}</p>
          <p className="mt-2 flex gap-2 text-sm text-ai-text">
            <Lightbulb size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              <strong className="font-semibold">Öneri:</strong> {b.oneri}
            </span>
          </p>
        </li>
      ))}
    </ul>
  )
}

function OkumaDeseni({ sayfalar }) {
  return (
    <div>
      <p className="mb-3 text-sm text-text-2">
        Görsel ağırlıklı sayfalarda göz <strong>Z</strong>, metin ağırlıklı sayfalarda <strong>F</strong> şeklinde
        dolaşır. Logo, menü, başlık ve ana butonun bu yol üzerinde olup olmadığı puanlanır.
      </p>
      <ul className="divide-y divide-border rounded-xl border border-border bg-bg">
        {sayfalar.map((s) => (
          <li key={s.yol} className="grid gap-2 p-4 sm:grid-cols-[10rem_1fr] sm:items-center">
            <div className="flex items-center gap-3">
              <DesenIkonu desen={s.desen} />
              <div>
                <p className="font-mono text-sm text-text">{s.yol}</p>
                <p className="text-xs text-muted">{s.desen} deseni</p>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <Cubuk oran={s.uyum} />
                <span className="w-10 shrink-0 text-right text-sm font-semibold text-text">%{s.uyum}</span>
              </div>
              <p className="mt-1 text-sm text-text-2">{s.not}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function RenkKontrast({ report }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-xl border border-border bg-bg p-4">
        <h3 className="mb-3 font-semibold text-text">Renk paleti</h3>
        <div className="flex h-10 overflow-hidden rounded-lg border border-border" aria-hidden="true">
          {report.palet.map((r) => (
            <span key={r.hex} style={{ background: r.hex, width: r.oran + '%' }} />
          ))}
        </div>
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {report.palet.map((r) => (
            <li key={r.hex} className="flex items-center gap-2 text-sm">
              <span className="h-5 w-5 shrink-0 rounded border border-border" style={{ background: r.hex }} />
              <span className="min-w-0">
                <span className="block truncate text-text">{r.ad}</span>
                <span className="font-mono text-xs text-muted">
                  {r.hex} · %{r.oran}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-text-2">{report.renkNotu}</p>
      </section>

      <section className="rounded-xl border border-border bg-bg p-4">
        <h3 className="font-semibold text-text">Kontrast sorunları</h3>
        <p className="mb-3 text-xs text-muted">WCAG 2.1 AA: normal metin için en az {GEREKEN_KONTRAST}:1</p>
        <ul className="space-y-2">
          {report.kontrast.map((k) => (
            <li key={k.oge} className="flex items-center gap-3 rounded-lg bg-surface p-3">
              <span
                className="flex h-10 w-12 shrink-0 items-center justify-center rounded-md border border-border text-lg font-semibold"
                style={{ color: k.on, background: k.arka }}
                aria-hidden="true"
              >
                Aa
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-text">{k.oge}</span>
                <span className="font-mono text-xs text-muted">
                  {k.sayfa} · {k.on} / {k.arka}
                </span>
              </span>
              <span className="text-right">
                <span className="block text-sm font-semibold text-bad-text">{k.oran}:1</span>
                <span className="text-xs text-muted">gereken {GEREKEN_KONTRAST}:1</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

export default function UxRaporu({ report, onPdf }) {
  const [sekme, setSekme] = useState('bulgular')
  const sekmeler = [
    { id: 'bulgular', ad: `UX Bulguları (${report.bulgular.length})` },
    { id: 'desen', ad: 'Okuma Deseni' },
    { id: 'renk', ad: 'Renk ve Kontrast' },
  ]
  const kutu = 'rounded-xl border border-border bg-bg p-4'
  const etiket = 'text-sm text-muted'

  return (
    <>
      <section className="flex flex-col items-center gap-5 rounded-2xl border border-border bg-surface p-5 sm:p-6 lg:flex-row">
        <CoverageDonut yuzde={report.ux.skor} etiket="UX skoru" />
        <div className="grid w-full flex-1 gap-3 sm:grid-cols-2">
          <div className={kutu}>
            <p className={etiket}>Okuma deseni uyumu</p>
            <p className="mt-1 text-2xl font-semibold text-text">%{report.ux.desen}</p>
            <p className="text-xs text-muted">{report.sayfalar.length} sayfa · Z / F</p>
          </div>
          <div className={kutu}>
            <p className={etiket}>Renk uyumu</p>
            <p className="mt-1 text-2xl font-semibold text-text">%{report.ux.renk}</p>
            <p className="text-xs text-muted">{report.palet.length} renkli palet</p>
          </div>
          <div className={kutu}>
            <p className={etiket}>Kontrast sorunu</p>
            <p className="mt-1 text-2xl font-semibold text-bad-text">{report.kontrast.length}</p>
            <p className="text-xs text-muted">WCAG AA altında</p>
          </div>
          <div className={kutu}>
            <p className={etiket}>UX bulgusu</p>
            <p className="mt-1 text-2xl font-semibold text-bad-text">{report.bulgular.length}</p>
            <p className="text-xs text-muted">
              {report.bulgular.filter((b) => b.onem === 'yuksek').length} yüksek önemli
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onPdf}
          className="min-h-10 w-full rounded-lg bg-accent px-4 text-sm font-medium text-white hover:opacity-90 lg:w-auto"
        >
          PDF Raporu Al
        </button>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div role="tablist" aria-label="Kullanılabilirlik raporu bölümleri" className="mb-5 flex flex-wrap gap-1 border-b border-border">
          {sekmeler.map((s) => {
            const aktif = sekme === s.id
            return (
              <button
                key={s.id}
                id={'ux-sekme-' + s.id}
                type="button"
                role="tab"
                aria-selected={aktif}
                aria-controls={'ux-panel-' + s.id}
                onClick={() => setSekme(s.id)}
                className={
                  '-mb-px min-h-10 border-b-2 px-4 text-sm font-medium ' +
                  (aktif ? 'border-accent text-ai-text' : 'border-transparent text-text-2 hover:text-text')
                }
              >
                {s.ad}
              </button>
            )
          })}
        </div>
        <div id={'ux-panel-' + sekme} role="tabpanel" aria-labelledby={'ux-sekme-' + sekme}>
          {sekme === 'bulgular' && <Bulgular bulgular={report.bulgular} />}
          {sekme === 'desen' && <OkumaDeseni sayfalar={report.sayfalar} />}
          {sekme === 'renk' && <RenkKontrast report={report} />}
        </div>
      </section>
    </>
  )
}
