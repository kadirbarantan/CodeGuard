// Hero: rozet, başlık, açıklama ve 3 küçük özellik rozeti.
import { Sparkles } from 'lucide-react'

const ROZETLER = ['Birim · Arayüz (E2E) · Kullanılabilirlik', 'C# · Python · JS/TS · PHP', 'Kod ya da URL ile test', 'Kendini düzelten ajanlar']

export default function Hero() {
  return (
    <section className="px-4 pt-12 pb-8 text-center">
      <span className="inline-flex items-center gap-2 rounded-full border border-ai-border bg-ai-bg px-3 py-1 text-sm font-medium text-ai-text">
        <Sparkles size={14} />
        LLM ajanlarıyla otonom test üretimi
      </span>
      <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
        Kodunu yükle, <span className="text-ai-text">ajanlar test etsin.</span>
      </h1>
      <p className="mx-auto mt-4 max-w-2xl text-lg text-muted">
        Projeni yükle ya da sitenin adresini gir. Yapay zekâ ajanları birim ve arayüz testlerini
        yazsın, çalıştırsın, eksik kalanları tamamlasın; kullanılabilirlik testinde okuma desenini
        ve renk uyumunu ölçüp sana raporlasın.
      </p>
      <ul className="mt-6 flex flex-wrap justify-center gap-2">
        {ROZETLER.map((r) => (
          <li key={r} className="rounded-full border border-border bg-surface px-3 py-1 text-sm text-text-2">
            {r}
          </li>
        ))}
      </ul>
    </section>
  )
}
