import { useState } from 'react'

// "Arayüz Testleri" sekmesi: test edilen akışlar ve sayfa bazında etkileşim kapsamı.
// Sayfaya tıklayınca akışlar o sayfaya göre süzülür.
export default function UiTestsTab({ report, odakAkis }) {
  const [sayfaFiltre, setSayfaFiltre] = useState(null)

  if (report.tur === 'birim') {
    return (
      <div className="rounded-xl border border-dashed border-border-strong p-10 text-center text-muted">
        Bu testte arayüz testi seçilmedi.
      </div>
    )
  }

  // Kaldı ya da arayüz olası hatası olan sayfalar
  const sorunlu = new Set([
    ...report.akislar.filter((a) => !a.gecti).map((a) => a.sayfa),
    ...report.olasiHatalar.filter((h) => h.tur === 'arayuz' && h.sayfa).map((h) => h.sayfa),
  ])
  const akislar = sayfaFiltre ? report.akislar.filter((a) => a.sayfa === sayfaFiltre) : report.akislar

  const filtreSinif = (aktif) =>
    'min-h-8 rounded-full px-3 text-xs font-medium ' +
    (aktif ? 'bg-accent text-white' : 'border border-border-strong text-text-2 hover:bg-soft')

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-xl border border-border bg-bg p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-text">Test edilen akışlar</h3>
          <div className="flex flex-wrap items-center gap-2">
            {sayfaFiltre && <span className={filtreSinif(true) + ' flex items-center font-mono'}>{sayfaFiltre}</span>}
            <button
              type="button"
              onClick={() => setSayfaFiltre(null)}
              aria-pressed={sayfaFiltre === null}
              className={filtreSinif(sayfaFiltre === null)}
            >
              Tümü
            </button>
          </div>
        </div>
        <ul className="space-y-2">
          {akislar.map((a) => {
            const odakta = a.ad === odakAkis
            return (
              <li
                key={a.ad}
                className={
                  'flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-2 ' +
                  (odakta ? 'border-accent bg-ai-bg' : 'border-transparent bg-surface')
                }
              >
                <span
                  className={
                    'rounded-full px-2 py-0.5 text-xs font-medium ' +
                    (a.gecti ? 'bg-ok-bg text-ok-text' : 'bg-bad-bg text-bad-text')
                  }
                >
                  {a.gecti ? 'Geçti' : 'Kaldı'}
                </span>
                <span className="text-sm text-text">{a.ad}</span>
                <span className="ml-auto font-mono text-xs text-muted">{a.sayfa}</span>
              </li>
            )
          })}
          {akislar.length === 0 && <li className="px-3 py-2 text-sm text-muted">Bu sayfada test edilen akış yok.</li>}
        </ul>
      </section>

      <section className="rounded-xl border border-border bg-bg p-4">
        <h3 className="mb-3 font-semibold text-text">Sayfa bazında etkileşim kapsamı</h3>
        <ul className="space-y-1">
          {report.sayfalar.map((s) => {
            const oran = s.toplam ? (s.kapsanan / s.toplam) * 100 : 0
            const tam = s.kapsanan === s.toplam
            const secili = sayfaFiltre === s.yol
            return (
              <li key={s.yol}>
                <button
                  type="button"
                  onClick={() => setSayfaFiltre(secili ? null : s.yol)}
                  aria-pressed={secili}
                  className={
                    'w-full rounded-lg px-3 py-2 text-left ' + (secili ? 'bg-ai-bg' : 'hover:bg-soft')
                  }
                >
                  <span className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2 font-mono text-text">
                      {s.yol}
                      {sorunlu.has(s.yol) && (
                        <span className="h-2 w-2 rounded-full bg-bad" aria-label="Sorunlu sayfa" />
                      )}
                    </span>
                    <span className="text-text-2">
                      {s.kapsanan} / {s.toplam}
                    </span>
                  </span>
                  <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-soft">
                    <span
                      className={'block h-full rounded-full ' + (tam ? 'bg-ok' : 'bg-accent')}
                      style={{ width: oran + '%' }}
                    />
                  </span>
                  {s.eksik.length > 0 && (
                    <span className="mt-1 block text-xs text-bad-text">Kapsanmayan: {s.eksik.join(', ')}</span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
