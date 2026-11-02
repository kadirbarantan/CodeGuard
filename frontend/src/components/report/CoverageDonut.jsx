// SVG halka grafik: r=50, dolu kısım stroke-dasharray ile çizilir.
const R = 50
const CEVRE = 2 * Math.PI * R

export default function CoverageDonut({ yuzde, etiket = 'Kod coverage' }) {
  const dolu = (Math.max(0, Math.min(100, yuzde)) / 100) * CEVRE
  return (
    <div className="relative h-36 w-36 shrink-0">
      <svg
        viewBox="0 0 120 120"
        role="img"
        aria-label={`${etiket} yüzde ${yuzde}`}
        className="h-full w-full -rotate-90"
      >
        <circle cx="60" cy="60" r={R} fill="none" strokeWidth="12" stroke="var(--border)" />
        <circle
          cx="60"
          cy="60"
          r={R}
          fill="none"
          strokeWidth="12"
          stroke="var(--ok)"
          strokeLinecap="round"
          strokeDasharray={`${dolu} ${CEVRE}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold text-text">%{yuzde}</span>
        <span className="text-xs text-muted">{etiket}</span>
      </div>
    </div>
  )
}
