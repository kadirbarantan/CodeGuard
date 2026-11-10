// Rapor başlığı: tamamlandı rozeti, başlık, proje özeti ve "+ Yeni Test"
import { ALANLAR, DILLER, turAdi } from '../../config/testStratejileri'

const ikinciDugme = 'min-h-10 rounded-lg border border-border-strong bg-surface px-4 text-sm font-medium text-text hover:bg-soft'

// onZip / onPdf verilirse indirme düğmeleri "+ Yeni Test"in yanında durur
export default function ReportHeader({ report, onNew, onZip, onPdf }) {
  const dil = report.kaynak === 'url' ? 'URL' : DILLER[report.dil] || report.dil
  const ozet = [report.proje, ALANLAR[report.alan]?.ad || report.alan, dil, turAdi(report.tur)].join(' · ')
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <span className="inline-block rounded-full bg-ok-bg px-3 py-1 text-sm font-medium text-ok-text">
          Tamamlandı{report.turSayisi ? ` · ${report.turSayisi} turda` : ''}
        </span>
        <h1 className="mt-2 text-2xl font-semibold text-text">Sonuçlar ve Rapor</h1>
        <p className="mt-1 text-sm text-text-2">{ozet}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {onZip && (
          <button type="button" onClick={onZip} className={ikinciDugme}>
            Testleri İndir (.zip)
          </button>
        )}
        {onPdf && (
          <button type="button" onClick={onPdf} className={ikinciDugme}>
            PDF Raporu Al
          </button>
        )}
        <button
          type="button"
          onClick={onNew}
          className="min-h-10 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:opacity-90"
        >
          + Yeni Test
        </button>
      </div>
    </div>
  )
}
