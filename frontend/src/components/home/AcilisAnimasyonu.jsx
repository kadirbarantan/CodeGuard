// "Bir test böyle koşar": ana sayfada belirgin bir bölüm. Bölüm ekrana gelince terminalde CodeGuard'ın bir
// testi koşturduğu satırlar harf harf yazılır. "Tekrar oynat" ile baştan başlar; "hareketi azalt" açıksa
// satırlar animasyonsuz, tamamı görünür gelir.
import { useEffect, useRef, useState } from 'react'
import { RotateCcw } from 'lucide-react'

const SATIRLAR = [
  { t: 'Test başladı: blog-api (Python), birim ve arayüz testi', s: 'komut' },
  { t: '✓ Kod Haritası çıkarıldı: 38 birim', s: 'ok' },
  { t: '✓ Tur 1: 46 test yazıldı, kapsama %34', s: 'ok' },
  { t: '↻ Kapsanmayan dallar için ajan geri dönüyor…', s: 'geri' },
  { t: '✓ Tur 2: kapsama %71, 3 olası hata', s: 'ok' },
  { t: '✓ Arayüz: 7 akış test edildi, 1 olası hata', s: 'ok' },
  { t: '✓ Tur 3: kapsama %94, 3 olası hata daha', s: 'ok' },
  { t: 'Rapor hazır: 59 test, 7 olası hata', s: 'son' },
]
const RENK = {
  komut: 'text-on-panel',
  ok: 'text-panel-ok',
  geri: 'text-panel-geri',
  son: 'text-on-panel font-bold',
}
const HARF_MS = 22
const SATIR_ARASI_MS = 380
const TOPLAM = SATIRLAR.reduce((t, s) => t + s.t.length, 0)

function hareketAzalt() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

export default function TerminalBolumu() {
  const kokRef = useRef(null)
  const [basladi, setBasladi] = useState(false)
  const [yazilan, setYazilan] = useState(() => (hareketAzalt() ? TOPLAM : 0))

  // Bölüm görünür olunca başla (bir kez)
  useEffect(() => {
    const el = kokRef.current
    if (!el || !('IntersectionObserver' in window)) {
      setBasladi(true)
      return
    }
    const g = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setBasladi(true)
          g.disconnect()
        }
      },
      { threshold: 0.45 },
    )
    g.observe(el)
    return () => g.disconnect()
  }, [])

  // Harf harf yaz; satır sonlarında kısa bekleme
  useEffect(() => {
    if (!basladi || yazilan >= TOPLAM) return
    let sayac = 0
    let satirSonu = false
    for (const s of SATIRLAR) {
      sayac += s.t.length
      if (sayac === yazilan) satirSonu = true
    }
    const t = setTimeout(() => setYazilan((y) => y + 1), satirSonu ? SATIR_ARASI_MS : HARF_MS)
    return () => clearTimeout(t)
  }, [basladi, yazilan])

  let kalan = yazilan
  const gorunen = SATIRLAR.map((s) => {
    const n = Math.max(0, Math.min(s.t.length, kalan))
    kalan -= s.t.length
    return n
  })
  const aktifSatir = gorunen.findIndex((n, i) => n < SATIRLAR[i].t.length)
  const bitti = yazilan >= TOPLAM
  const ilerleme = Math.round((yazilan / TOPLAM) * 100)

  return (
    <section ref={kokRef} className="mx-auto w-full max-w-7xl px-4 sm:px-6">
      <div className="relative overflow-hidden rounded-[2rem] border border-border bg-panel p-6 text-on-panel shadow-kart sm:p-10">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-28 h-96 w-96 rounded-full bg-accent/45 blur-[120px]" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 left-0 h-72 w-72 rounded-full bg-accent-3/20 blur-[110px]" />

        <div className="relative grid items-center gap-8 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Bir test böyle koşar</h2>
            <p className="mt-3 text-on-panel/75">
              Sen kodunu yüklersin; ajan testleri yazar, çalıştırır, eksik kalan dallar için geri dönüp kapsamayı yükseltir.
              Hepsi birkaç dakika içinde, senin bir şey yazmana gerek kalmadan.
            </p>
            <button
              type="button"
              disabled={!bitti}
              onClick={() => setYazilan(0)}
              className="mt-6 flex min-h-10 items-center gap-2 rounded-xl border border-on-panel/20 px-4 text-sm font-semibold text-on-panel/90 transition-colors hover:bg-on-panel/10 disabled:opacity-40"
            >
              <RotateCcw size={16} aria-hidden="true" /> Tekrar oynat
            </button>
          </div>

          <div className="min-w-0 lg:col-span-8">
            <div className="overflow-hidden rounded-2xl border border-on-panel/10 bg-black/45 shadow-kart">
              <div className="flex items-center gap-2 border-b border-on-panel/10 px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-pencere-1" aria-hidden="true" />
                <span className="h-2.5 w-2.5 rounded-full bg-pencere-2" aria-hidden="true" />
                <span className="h-2.5 w-2.5 rounded-full bg-pencere-3" aria-hidden="true" />
                <span className="ml-2 font-mono text-xs text-on-panel/50">codeguard: ajan</span>
              </div>
              {/* Ekran okuyucu tüm metni bir kerede okur; görünen kısım harf harf yazılır */}
              <p className="sr-only">{SATIRLAR.map((s) => s.t).join('. ')}</p>
              <div aria-hidden="true" className="min-h-72 space-y-1.5 overflow-x-auto p-5 font-mono text-[13px] leading-6 sm:text-sm">
                {SATIRLAR.map((s, i) =>
                  gorunen[i] > 0 || i === aktifSatir ? (
                    <p key={i} className={'whitespace-pre ' + RENK[s.s]}>
                      {s.t.slice(0, gorunen[i])}
                      {i === aktifSatir && <span className="imlec ml-0.5 inline-block h-4 w-2 translate-y-0.5 bg-on-panel/80" />}
                    </p>
                  ) : null,
                )}
              </div>
              <div className="h-1 bg-on-panel/10" aria-hidden="true">
                <div
                  className="h-full origin-left bg-gradient-to-r from-accent-2 to-panel-ok transition-transform duration-150 motion-reduce:transition-none"
                  style={{ transform: `scaleX(${ilerleme / 100})` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
