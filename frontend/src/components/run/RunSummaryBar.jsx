// Çalışma ekranı üst satırı (yapışkan): dosya adı · seçim özeti · tur · Durdur
const ALAN = { web: 'Web', oyun: 'Oyun', mobil: 'Mobil', genel: 'Genel', diger: 'Diğer' }
const DIL = { python: 'Python', csharp: 'C#', js: 'JavaScript / TypeScript' }
const TUR = { birim: 'Birim', arayuz: 'Arayüz', ikisi: 'İkisi' }

export default function RunSummaryBar({ config, round, maxRounds, onStop }) {
  const alan = config.alan === 'diger' && config.digerMetin.trim() ? config.digerMetin.trim() : ALAN[config.alan]
  const ozet = [alan, DIL[config.dil], TUR[config.tur]].join(' · ')

  return (
    <div className="sticky top-0 z-30 -mx-4 bg-bg px-4 py-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-border bg-surface px-5 py-3 shadow-sm">
        <span className="min-w-0 truncate font-mono text-sm font-semibold text-text">{config.dosya?.ad}</span>
        <span className="text-muted">·</span>
        <span className="text-sm text-text-2">{ozet}</span>
        <div className="ml-auto flex items-center gap-3">
          <span className="flex items-center gap-2 text-sm font-medium text-ai-text">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-accent" />
            Tur {round} / {maxRounds}
          </span>
          <button
            type="button"
            onClick={onStop}
            className="min-h-10 rounded-lg border border-bad bg-surface px-4 text-sm font-medium text-bad-text hover:bg-bad-bg"
          >
            Durdur
          </button>
        </div>
      </div>
    </div>
  )
}
