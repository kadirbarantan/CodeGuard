// Nasıl çalışır: 4 adımlık süreç. Bölüm ekrana girince kartlar sırayla belirir
// (tek bir orkestre an; "hareketi azalt" ayarında animasyon yok).
import { useEffect, useRef, useState } from 'react'
import { Bot, FileCheck2, FileUp, SlidersHorizontal } from 'lucide-react'

const ADIMLAR = [
  {
    ikon: FileUp,
    baslik: 'Kodunu yükle ya da URL gir',
    aciklama: 'Proje klasörünü, dosyayı ya da .zip arşivini sürükle; GitHub reposundan dosya seç ya da canlı sitenin adresini yaz.',
    cipler: ['Klasör ve .zip', 'GitHub reposu', 'Canlı URL'],
    genis: true,
  },
  {
    ikon: SlidersHorizontal,
    baslik: 'Test türünü seç',
    aciklama: 'Alanını ve dilini belirle; birim, arayüz ya da kullanılabilirlik testini seç. Test planı seçimine göre değişir.',
    cipler: ['Birim', 'Arayüz (E2E)', 'Kullanılabilirlik'],
  },
  {
    ikon: Bot,
    baslik: 'Ajanlar test etsin',
    aciklama: "Ajanlar testleri yazar, sandbox'ta çalıştırır ve kapsanmayan satırlar için kendini düzeltir: ilk deneme ve en fazla 3 tekrar.",
    cipler: ['Planla, uygula, doğrula', 'Sandbox'],
  },
  {
    ikon: FileCheck2,
    baslik: 'Raporunu al',
    aciklama: 'Satır kapsaması, olası hatalar, kullanılabilirlik bulguları ve üretilen testler tek raporda; testleri indirip projene ekleyebilirsin.',
    cipler: ['Satır kapsaması', 'Olası hatalar', 'Üretilen testler'],
    genis: true,
    son: true,
  },
]

// Bölüm görünür olduğunda bir kez true olur
function useGorundu() {
  const ref = useRef(null)
  const [gorundu, setGorundu] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || !('IntersectionObserver' in window)) {
      setGorundu(true)
      return
    }
    const g = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setGorundu(true)
          g.disconnect()
        }
      },
      { threshold: 0.2 },
    )
    g.observe(el)
    return () => g.disconnect()
  }, [])
  return [ref, gorundu]
}

export default function HowItWorks() {
  const [ref, gorundu] = useGorundu()

  return (
    <section id="nasil-calisir" className="mx-auto w-full max-w-7xl scroll-mt-24 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-extrabold tracking-tight text-text sm:text-4xl">Nasıl çalışır?</h2>
        <p className="mt-3 text-text-2">Dört adımda kodundan test raporuna. Testleri sen yazmazsın, ajanlar yazar ve düzeltir.</p>
      </div>

      <ol ref={ref} className="mt-12 grid gap-5 md:grid-cols-12">
        {ADIMLAR.map(({ ikon: Ikon, baslik, aciklama, cipler, genis, son }, i) => (
          <li
            key={baslik}
            style={{ animationDelay: `${i * 140}ms` }}
            className={
              'adim-kart group relative overflow-hidden rounded-3xl border border-border bg-surface p-6 shadow-yumusak transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-ai-border hover:shadow-kart sm:p-7 ' +
              (genis ? 'md:col-span-7' : 'md:col-span-5') +
              (gorundu ? ' gorundu' : '')
            }
          >
            {/* Büyük soluk adım numarası (dekor) */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute right-5 top-4 select-none font-mono text-6xl font-bold leading-none text-border transition-colors group-hover:text-ai-border sm:text-7xl"
            >
              {String(i + 1).padStart(2, '0')}
            </span>

            <div className="relative">
              <span
                className={
                  'flex h-12 w-12 items-center justify-center rounded-2xl shadow-yumusak ' +
                  (son ? 'bg-ok text-white' : 'bg-gradient-to-br from-accent to-accent-2 text-white')
                }
              >
                <Ikon size={22} aria-hidden="true" />
              </span>
              <p className="mt-5 text-sm font-semibold text-ai-text">Adım {i + 1}</p>
              <h3 className="mt-1 text-xl font-bold text-text">{baslik}</h3>
              <p className="mt-2 max-w-prose text-sm leading-relaxed text-text-2">{aciklama}</p>
              <ul className="mt-5 flex flex-wrap gap-2">
                {cipler.map((c) => (
                  <li key={c} className="rounded-lg border border-border bg-soft px-2.5 py-1 text-xs font-medium text-text-2">
                    {c}
                  </li>
                ))}
              </ul>
            </div>

            {/* Alt çizgi: kart geldiğinde soldan sağa dolar */}
            <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 bg-border">
              <span
                className={'adim-cizgi block h-full ' + (son ? 'bg-ok' : 'bg-gradient-to-r from-accent to-accent-3')}
              />
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}
