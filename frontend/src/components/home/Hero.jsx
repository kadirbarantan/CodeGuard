// Hero: başlık, tek cümlelik açıklama ve özellik çipleri. Arka planda yumuşak indigo parıltı ve ince ızgara.
// Hallmark sadeleştirmesi (K25): başlık üstündeki rozet kaldırıldı, açıklama tek cümleye indi, çiplerdeki süs noktaları kalktı.

const CIPLER = ['Birim, arayüz, UX ve erişilebilirlik', 'C#, Python, JS/TS, PHP', 'Kod, GitHub ya da URL ile test', 'Kendini düzelten ajanlar']

const ACIKLAMA =
  "Projeni yükle, GitHub'dan seç ya da sitenin adresini gir; yapay zekâ ajanları testleri yazar, çalıştırır ve sonucu sana raporlar."

// yan: geniş ekranda test kartının solunda, sola yaslı ve daha küçük başlıkla (arka plan dekoru üst bölümde)
export default function Hero({ yan = false }) {
  if (yan) {
    return (
      <div className="text-center xl:text-left">
        <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight text-text sm:text-5xl xl:text-[2.75rem]">
          Kodunu yükle, <br className="hidden sm:block" />
          <span className="baslik-gradyan">ajanlar test etsin.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted xl:mx-0">{ACIKLAMA}</p>
        <ul className="mt-6 flex flex-wrap justify-center gap-2 xl:justify-start">
          {CIPLER.map((c) => (
            <li key={c} className="rounded-full border border-border bg-surface/70 px-3 py-1 text-xs font-medium text-text-2">
              {c}
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

      <h1 className="mx-auto max-w-4xl text-4xl font-extrabold leading-[1.08] tracking-tight text-text sm:text-6xl lg:text-7xl">
        Kodunu yükle, <br className="hidden sm:block" />
        <span className="baslik-gradyan">ajanlar test etsin.</span>
      </h1>

      <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-text-2 sm:text-lg">{ACIKLAMA}</p>

      <ul className="mx-auto mt-7 flex max-w-4xl flex-wrap justify-center gap-2.5">
        {CIPLER.map((c) => (
          <li key={c} className="rounded-full border border-border bg-surface/90 px-3.5 py-1.5 text-sm font-medium text-text shadow-sm">
            {c}
          </li>
        ))}
      </ul>
    </section>
  )
}
