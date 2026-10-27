import { CircleCheck, Code2, Workflow } from 'lucide-react'

const TUR = { birim: 'Birim', arayuz: 'Arayüz' }

// "Olası Hatalar" sekmesi: ajanın bulduğu olası hatalar.
export default function BugsTab({ report, onKoddaGoster, onAkisiGoster }) {
  if (report.olasiHatalar.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-ok bg-ok-bg p-8 text-ok-text">
        <CircleCheck size={20} /> Olası hata bulunmadı.
      </div>
    )
  }

  const butonSinif =
    'mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg border border-border-strong bg-surface px-3 text-sm font-medium text-text hover:bg-soft'

  return (
    <ul className="space-y-3">
      {report.olasiHatalar.map((h, i) => (
        <li key={i} className="rounded-xl border border-border bg-bg p-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="rounded-full bg-bad-bg px-2 py-0.5 text-xs font-medium text-bad-text">
              {TUR[h.tur] || h.tur}
            </span>
            <span className="font-semibold text-text">{h.baslik}</span>
            <span className="ml-auto font-mono text-xs text-muted">{h.konum}</span>
          </div>
          <p className="mt-2 text-sm text-text-2">Ajanın gerekçesi: {h.gerekce}</p>
          {h.tur === 'birim' && h.dosya && (
            <button type="button" onClick={() => onKoddaGoster(h)} className={butonSinif}>
              <Code2 size={16} /> Kodda göster
            </button>
          )}
          {h.tur === 'arayuz' && h.akis && (
            <button type="button" onClick={() => onAkisiGoster(h)} className={butonSinif}>
              <Workflow size={16} /> Akışı göster
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}
