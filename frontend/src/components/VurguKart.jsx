// Ana sayfadaki "Ajanı Görevlendir" kartıyla aynı görünüm: arkada parıltı, belirgin çerçeve, pencere başlığı.
// Canlı akış ve rapor ekranlarının ana kutusu bunu kullanır.
export default function VurguKart({ baslik, sag, children, className = '', govde = 'p-4 sm:p-6' }) {
  return (
    <section className={'relative isolate ' + className}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-4 -z-10 rounded-[2.75rem] bg-gradient-to-br from-accent/40 via-accent-3/25 to-ok/15 opacity-70 blur-3xl"
      />
      <div className="rounded-3xl border border-accent/40 bg-surface ring-4 ring-accent/10 shadow-vurgu">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-3xl border-b border-border bg-soft/70 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex shrink-0 items-center gap-1.5" aria-hidden="true">
              <span className="h-3 w-3 rounded-full bg-pencere-1" />
              <span className="h-3 w-3 rounded-full bg-pencere-2" />
              <span className="h-3 w-3 rounded-full bg-pencere-3" />
            </span>
            <span className="h-4 w-px bg-border-strong" aria-hidden="true" />
            <h2 className="truncate text-lg font-extrabold text-text">{baslik}</h2>
          </div>
          {sag}
        </div>
        <div className={govde}>{children}</div>
      </div>
    </section>
  )
}
