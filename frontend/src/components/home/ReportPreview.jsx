// Rapor önizlemesi: kapsama, AI Insight ve olası hata kartları.
import { Sparkles, Bug } from 'lucide-react'

const SATIRLAR = [
  { no: 10, kod: 'if not baslik.strip():', durum: 'ok' },
  { no: 11, kod: '    raise HTTPException(400)', durum: 'ok' },
  { no: 12, kod: '    raise HTTPException(413)', durum: 'bad' },
  { no: 13, kod: 'return post', durum: 'ok' },
]
const SATIR_RENK = { ok: 'bg-ok-bg', bad: 'bg-bad-bg' }

const kart = 'rounded-xl border border-border bg-surface p-5'

export default function ReportPreview() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12">
      <h2 className="mb-6 text-center text-2xl font-bold">Raporunda neler olacak?</h2>
      <div className="grid gap-4 md:grid-cols-3">
        <div className={kart}>
          <h3 className="mb-3 font-semibold">Satır satır kapsama</h3>
          <div className="overflow-hidden rounded-lg border border-border font-mono text-xs">
            {SATIRLAR.map((s) => (
              <div key={s.no} className={`flex gap-3 px-3 py-1 ${SATIR_RENK[s.durum]}`}>
                <span className="w-5 text-muted">{s.no}</span>
                <pre className="whitespace-pre text-text">{s.kod}</pre>
              </div>
            ))}
          </div>
        </div>

        <div className={kart}>
          <h3 className="mb-3 flex items-center gap-2 font-semibold">
            <Sparkles size={16} className="text-accent" /> AI Insight
          </h3>
          <p className="rounded-lg border border-ai-border bg-ai-bg p-3 text-sm text-ai-text">
            Ajan 4 turda 12. satıra ulaşamadı: çok uzun içerik gönderen bir test gerekiyor.
          </p>
        </div>

        <div className={kart}>
          <h3 className="mb-3 flex items-center gap-2 font-semibold">
            <Bug size={16} className="text-bad-text" /> Olası hata
          </h3>
          <span className="rounded-full bg-bad-bg px-2 py-0.5 text-xs font-medium text-bad-text">Birim</span>
          <p className="mt-2 text-sm font-medium">Boş başlık kabul ediliyor</p>
          <p className="font-mono text-xs text-muted">app/posts.py:9</p>
          <p className="mt-2 text-sm text-muted">Ajanın gerekçesi: Beklenen 400 yerine 200 döndü.</p>
        </div>
      </div>
    </section>
  )
}
