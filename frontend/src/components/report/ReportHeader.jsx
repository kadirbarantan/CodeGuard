// Rapor başlığı: tamamlandı rozeti, başlık, proje özeti ve "+ Yeni Test"
import { ALANLAR, DILLER, TURLER } from '../../config/testStratejileri'

export default function ReportHeader({ report, onNew }) {
  const dil = report.kaynak === 'url' ? 'URL' : DILLER[report.dil] || report.dil
  const ozet = [report.proje, ALANLAR[report.alan]?.ad || report.alan, dil, TURLER[report.tur] || report.tur].join(' · ')
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <span className="inline-block rounded-full bg-ok-bg px-3 py-1 text-sm font-medium text-ok-text">
          Tamamlandı{report.turSayisi ? ` · ${report.turSayisi} turda` : ''}
        </span>
        <h1 className="mt-2 text-2xl font-semibold text-text">Sonuçlar ve Rapor</h1>
        <p className="mt-1 text-sm text-text-2">{ozet}</p>
      </div>
      <button
        type="button"
        onClick={onNew}
        className="min-h-10 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:opacity-90"
      >
        + Yeni Test
      </button>
    </div>
  )
}
