// "Ajanlar döngüyle çalışır": solda Planla–Uygula–Doğrula–Rapor döngüsü, sağda Standardizasyon Katmanı'nın
// ham sandbox çıktısını ajana giden kısa JSON'a çevirdiğini gösteren terminal penceresi (koyu bölüm).
import { Layers, Undo2 } from 'lucide-react'

const ADIMLAR = [
  { ad: 'Planla', alt: 'Dalları ve kritik uç noktaları haritalar.', tur: 'LLM ajanı' },
  { ad: 'Uygula', alt: 'Test kodunu üretir ve taklitleri yapılandırır.', tur: 'LLM ajanı', aktif: true },
  { ad: 'Doğrula', alt: 'Testleri sandboxta çalıştırır, kapsamayı ölçer.', tur: 'Sandbox' },
  { ad: 'Rapor', alt: 'Bulguları ve olası hataları derler.', tur: 'Çıktı' },
]

const HAM = [
  '[coverlet] Instrumentation active',
  '[xunit] 14 passed, 1 incomplete',
  '<line hits="0" number="52" branch="false"/>',
  '[warn] 240+ satır ayrıştırılmamış ham log…',
]

export default function AgentLoop() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 sm:px-6">
      <div className="relative overflow-hidden rounded-[2rem] border border-border bg-panel p-6 text-on-panel shadow-kart sm:p-10">
        {/* Dekor: köşede indigo parıltı */}
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-accent/40 blur-[110px]" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 left-10 h-72 w-72 rounded-full bg-accent-3/20 blur-[110px]" />

        <div className="relative">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Ajanlar döngüyle çalışır</h2>
          <p className="mt-2 max-w-2xl text-on-panel/70">
            Testler bir kez yazılıp bırakılmaz. Ajan sonucu ölçer, eksik kalan için geri döner.
          </p>

          <div className="mt-8 grid gap-6 lg:grid-cols-12">
            {/* Sol: döngü */}
            <div className="space-y-3 lg:col-span-5">
              <ol className="space-y-3">
                {ADIMLAR.map((a, i) => (
                  <li
                    key={a.ad}
                    className={
                      'flex items-center gap-4 rounded-2xl border p-4 ' +
                      (a.aktif ? 'border-accent-2/70 bg-accent/35' : 'border-on-panel/10 bg-on-panel/5')
                    }
                  >
                    <span
                      className={
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-mono text-sm font-bold ' +
                        (a.aktif ? 'bg-accent-2 text-white' : 'bg-on-panel/10 text-on-panel/80')
                      }
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{a.ad}</p>
                      <p className="text-sm text-on-panel/70">{a.alt}</p>
                    </div>
                    <span className="shrink-0 rounded-md bg-on-panel/10 px-2 py-0.5 text-xs font-medium text-on-panel/80">{a.tur}</span>
                  </li>
                ))}
              </ol>
              <p className="flex items-start gap-3 rounded-2xl border border-dashed border-on-panel/25 p-4 text-sm text-on-panel/80">
                <Undo2 size={18} className="mt-0.5 shrink-0 text-accent-3" aria-hidden="true" />
                <span>
                  <strong className="font-semibold text-on-panel">Geri besleme:</strong> kapsanmayan satır ya da başarısız test
                  varsa ajan Uygula adımına döner. İlk deneme ve en fazla 3 tekrar.
                </span>
              </p>
            </div>

            {/* Sağ: Standardizasyon Katmanı terminali */}
            <div className="overflow-hidden rounded-2xl border border-on-panel/10 bg-black/40 font-mono text-sm lg:col-span-7">
              <div className="flex items-center justify-between border-b border-on-panel/10 px-4 py-3">
                <span className="flex items-center gap-2 text-xs text-on-panel/70">
                  <span className="flex gap-1.5" aria-hidden="true">
                    <span className="h-2.5 w-2.5 rounded-full bg-on-panel/25" />
                    <span className="h-2.5 w-2.5 rounded-full bg-on-panel/25" />
                    <span className="h-2.5 w-2.5 rounded-full bg-on-panel/25" />
                  </span>
                  Doğrulama terminali
                </span>
              </div>

              <div className="space-y-4 p-4 sm:p-5">
                <div>
                  <p className="mb-2 text-xs text-[#ffb4ab]">Sandbox çıktısı (ham)</p>
                  <pre className="overflow-x-auto rounded-xl bg-on-panel/5 p-3 text-xs leading-6 text-on-panel/60">
                    {HAM.join('\n')}
                  </pre>
                </div>

                <div className="flex justify-center">
                  <span className="flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 font-sans text-xs font-bold text-white shadow-yumusak">
                    <Layers size={14} aria-hidden="true" /> Standardizasyon Katmanı
                  </span>
                </div>

                <div>
                  <p className="mb-2 text-xs text-[#6ee7b7]">Ajana giden JSON (birkaç satır)</p>
                  <pre className="overflow-x-auto rounded-xl border border-ok/30 bg-ok/10 p-3 text-xs leading-6 text-on-panel">
{`{
  "durum": "eksik_kapsam",
  "dosya": "Services/OrderService.cs",
  "kapsanmadi": "AddItem · qty <= 0 dalı",
  "tekrar": 2
}`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
