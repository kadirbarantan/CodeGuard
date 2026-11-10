// Hero: rozet, başlık, açıklama ve özellik çipleri. Arka planda yumuşak indigo parıltı ve ince ızgara.
import { Sparkles } from 'lucide-react'

const CIPLER = [
  { ad: 'Birim, arayüz, UX ve erişilebilirlik', nokta: 'bg-accent' },
  { ad: 'C#, Python, JS/TS, PHP', nokta: 'bg-accent-2' },
  { ad: 'Kod, GitHub ya da URL ile test', nokta: 'bg-accent-3' },
  { ad: 'Kendini düzelten ajanlar', nokta: 'bg-ok' },
]

// yan: geniş ekranda test kartının solunda, sola yaslı ve daha küçük başlıkla (arka plan dekoru üst bölümde)
export default function Hero({ yan = false }) {
  if (yan) {
    return (
      <div className="text-center xl:text-left">
        <span className="inline-flex items-center gap-2 rounded-full border border-ai-border bg-surface/80 px-4 py-1.5 text-sm font-medium text-ai-text shadow-yumusak backdrop-blur">
          <Sparkles size={15} aria-hidden="true" />
          LLM ajanlarıyla otonom test üretimi
        </span>
        <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight text-text sm:text-5xl xl:text-[2.75rem]">
          Kodunu yükle, <br className="hidden sm:block" />
          <span className="baslik-gradyan">ajanlar test etsin.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted xl:mx-0">
          Projeni yükle, GitHub'dan seç ya da sitenin adresini gir. Yapay zekâ ajanları birim ve arayüz testlerini
          yazsın, çalıştırsın, eksik kalanları tamamlasın; kullanılabilirlik ve erişilebilirlik testlerinde sitenin
          deneyimini ve WCAG uyumunu ölçüp sana raporlasın.
        </p>
        <ul className="mt-6 flex flex-wrap justify-center gap-2 xl:justify-start">
          {CIPLER.map((c) => (
            <li
              key={c.ad}
              className="flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-1 text-xs font-medium text-text-2"
            >
              <span className={'h-1.5 w-1.5 rounded-full ' + c.nokta} aria-hidden="true" />
              {c.ad}
            </li>
          ))}
        </ul>
      </div>
    )
  }
  return (
    <section className="relative isolate overflow-hidden px-4 pb-10 pt-14 text-center sm:pt-20">
      {/* Dekor: parıltı + ızgara (ekran okuyucudan gizli) */}
      <div aria-hidden="true" className="hero-zemin pointer-events-none absolute inset-0 -z-10">
        <div className="izgara absolute inset-0 opacity-70" />
      </div>

      <span className="inline-flex items-center gap-2 rounded-full border border-ai-border bg-surface/80 px-4 py-1.5 text-sm font-medium text-ai-text shadow-yumusak backdrop-blur">
        <Sparkles size={15} aria-hidden="true" />
        LLM ajanlarıyla otonom test üretimi
      </span>

      <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-extrabold leading-[1.08] tracking-tight text-text sm:text-6xl lg:text-7xl">
        Kodunu yükle, <br className="hidden sm:block" />
        <span className="baslik-gradyan">ajanlar test etsin.</span>
      </h1>

      <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-text-2 sm:text-lg">
        Projeni yükle, GitHub'dan seç ya da sitenin adresini gir. Yapay zekâ ajanları birim ve arayüz testlerini
        yazsın, çalıştırsın, eksik kalanları tamamlasın; kullanılabilirlik ve erişilebilirlik testlerinde sitenin
        deneyimini ve WCAG uyumunu ölçüp sana raporlasın.
      </p>

      <ul className="mx-auto mt-7 flex max-w-4xl flex-wrap justify-center gap-2.5">
        {CIPLER.map((c) => (
          <li
            key={c.ad}
            className="flex items-center gap-2 rounded-full border border-border bg-surface/90 px-3.5 py-1.5 text-sm font-medium text-text shadow-sm"
          >
            <span className={'h-2 w-2 rounded-full ' + c.nokta} aria-hidden="true" />
            {c.ad}
          </li>
        ))}
      </ul>
    </section>
  )
}
