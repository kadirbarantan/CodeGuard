// Çalışma ekranı üst satırı: dosya adı · seçim özeti · Durdur
const ALAN = { web: 'Web', oyun: 'Oyun', mobil: 'Mobil', genel: 'Genel', diger: 'Diğer' }
const DIL = { python: 'Python', csharp: 'C#', js: 'JavaScript / TypeScript' }
const TUR = { birim: 'Birim', arayuz: 'Arayüz', ikisi: 'İkisi' }

export default function RunSummaryBar({ config, onStop }) {
  const alan = config.alan === 'diger' && config.digerMetin.trim() ? config.digerMetin.trim() : ALAN[config.alan]
  const ozet = [alan, DIL[config.dil], TUR[config.tur]].join(' · ')

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-border bg-surface px-5 py-4">
      <span className="font-mono text-sm font-semibold text-text">{config.dosya?.ad}</span>
      <span className="text-muted">·</span>
      <span className="text-sm text-text-2">{ozet}</span>
      <button
        type="button"
        onClick={onStop}
        className="ml-auto min-h-10 rounded-lg border border-bad bg-surface px-4 text-sm font-medium text-bad-text hover:bg-bad-bg"
      >
        Durdur
      </button>
    </div>
  )
}
