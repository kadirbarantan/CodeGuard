// "Arkada ne oluyor?": ajan döngüsü şeması (koyu panel).
import { ArrowRight, Undo2 } from 'lucide-react'

const KUTULAR = [
  { ad: 'Planla', alt: 'LLM ajanı', llm: true },
  { ad: 'Uygula', alt: 'LLM ajanı', llm: true },
  { ad: 'Doğrula', alt: 'Sandbox', llm: false },
  { ad: 'Rapor', alt: 'Çıktı', llm: false },
]

export default function AgentLoop() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4">
      <div className="rounded-2xl bg-panel p-5 text-on-panel sm:p-8">
        <p className="text-xs font-semibold tracking-widest text-on-panel/60">ARKADA NE OLUYOR?</p>
        <h2 className="mt-1 text-2xl font-bold">Ajanlar döngüyle çalışır</h2>

        {/* 4 kutu ve oklar */}
        <div className="mt-6 flex flex-col items-stretch gap-3 md:flex-row md:items-center">
          {KUTULAR.map((k, i) => (
            <div key={k.ad} className="flex flex-1 flex-col items-stretch gap-3 md:flex-row md:items-center">
              <div
                className={`flex-1 rounded-xl border px-4 py-4 text-center ${
                  k.llm ? 'border-accent bg-accent/30' : 'border-on-panel/15 bg-on-panel/10'
                }`}
              >
                <div className="font-semibold">{k.ad}</div>
                <div className="text-xs text-on-panel/70">{k.alt}</div>
              </div>
              {i < KUTULAR.length - 1 && (
                <ArrowRight size={20} className="mx-auto shrink-0 rotate-90 text-on-panel/60 md:rotate-0" aria-hidden="true" />
              )}
            </div>
          ))}
        </div>

        {/* Geri dönüş şeridi */}
        <p className="mt-4 flex items-start gap-2 rounded-lg border border-dashed border-on-panel/30 px-4 py-3 text-sm text-on-panel/80">
          <Undo2 size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          Kapsanmayan satır ya da başarısız test varsa ajan Uygula adımına geri döner: ilk deneme + en fazla 3 tekrar.
        </p>

        {/* Standardizasyon katmanı */}
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
          <div className="rounded-lg border border-on-panel/15 bg-on-panel/10 p-4">
            <p className="text-xs font-semibold tracking-wider text-on-panel/60">SANDBOX ÇIKTISI</p>
            <p className="mt-1 text-sm text-on-panel/80">binlerce satır log, XML, HTML</p>
          </div>
          <div className="rounded-lg bg-accent px-4 py-3 text-center text-xs font-bold tracking-wider text-white">
            STANDARDİZASYON KATMANI
          </div>
          <div className="rounded-lg border border-on-panel/15 bg-on-panel/10 p-4">
            <p className="text-xs font-semibold tracking-wider text-on-panel/60">AJANA GİDEN</p>
            <code className="mt-1 block font-mono text-sm break-words text-on-panel">
              {'{"kapsanmadi": "AddItem · qty <= 0 dalı"}'}
            </code>
          </div>
        </div>
      </div>
    </section>
  )
}
