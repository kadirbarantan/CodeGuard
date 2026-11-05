// "Raporunda neler olacak?": satır kapsaması (kod penceresi), AI Insight ve olası hata önizlemesi.
// Durumlar yalnızca renkle değil, satır başındaki + / − işaretiyle de ayrılır.
import { Bug, FileCode2, Sparkles } from 'lucide-react'

const SATIRLAR = [
  { no: 8, kod: 'def create_post(baslik, icerik):', durum: null },
  { no: 9, kod: '    if not baslik.strip():', durum: 'ok' },
  { no: 10, kod: '        raise HTTPException(400)', durum: 'ok' },
  { no: 11, kod: '    if len(icerik) > 5000:', durum: 'ok' },
  { no: 12, kod: '        raise HTTPException(413)', durum: 'bad' },
  { no: 13, kod: '    post = db.insert(baslik, icerik)', durum: 'ok' },
  { no: 14, kod: '    if post is None:', durum: 'ok' },
  { no: 15, kod: '        raise HTTPException(500)', durum: 'bad' },
  { no: 16, kod: '    return post', durum: 'ok' },
]
const SATIR = {
  ok: { sinif: 'bg-[#10b981]/15', isaret: '+', isaretSinif: 'text-[#6ee7b7]' },
  bad: { sinif: 'bg-[#f2564b]/20', isaret: '−', isaretSinif: 'text-[#ffb4ab]' },
}

export default function ReportPreview() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-extrabold tracking-tight text-text sm:text-4xl">Raporunda neler olacak?</h2>
        <p className="mt-3 text-text-2">Hangi satırın test edildiğini, ajanın neden ulaşamadığını ve kodda nerede hata olabileceğini görürsün.</p>
      </div>

      <div className="mt-12 grid gap-5 lg:grid-cols-12">
        {/* Satır kapsaması */}
        <div className="flex min-w-0 flex-col rounded-3xl border border-border bg-surface p-5 shadow-yumusak sm:p-6 lg:col-span-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ai-bg text-ai-text">
                <FileCode2 size={20} aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-bold text-text">Satır satır kapsama</h3>
                <p className="text-sm text-muted">Testlerin çalıştırdığı ve ulaşamadığı satırlar</p>
              </div>
            </div>
            <span className="rounded-full bg-ok-bg px-2.5 py-1 text-xs font-semibold text-ok-text">4 turda %34'ten %94'e</span>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-panel font-mono text-xs text-on-panel">
            <div className="flex items-center gap-2 border-b border-on-panel/10 px-4 py-2.5 text-on-panel/70">
              <span className="flex gap-1.5" aria-hidden="true">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
              </span>
              <span className="ml-2">app/posts.py</span>
            </div>
            <div className="overflow-x-auto py-2">
              {SATIRLAR.map((s) => {
                const d = SATIR[s.durum]
                return (
                  <div key={s.no} className={'flex gap-3 px-4 py-1 ' + (d ? d.sinif : '')}>
                    <span className="w-5 shrink-0 text-right text-on-panel/40">{s.no}</span>
                    <span className={'w-3 shrink-0 font-bold ' + (d ? d.isaretSinif : '')} aria-hidden="true">
                      {d ? d.isaret : ''}
                    </span>
                    <pre className="whitespace-pre">{s.kod}</pre>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-5 text-sm">
            <span className="text-muted">Test edilebilir kodda kapsama</span>
            <span className="font-mono font-bold text-ai-text">%94 (386 / 407 satır)</span>
          </div>
        </div>

        {/* AI Insight ve olası hata */}
        <div className="flex min-w-0 flex-col gap-5 lg:col-span-5">
          <div className="flex-1 rounded-3xl border border-border bg-surface p-5 shadow-yumusak sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ai-bg text-ai-text">
                <Sparkles size={20} aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-bold text-text">AI Insight</h3>
                <p className="text-sm text-muted">Kapsanamayan satırın açıklaması</p>
              </div>
            </div>
            <blockquote className="mt-4 rounded-2xl border border-ai-border bg-ai-bg p-4 text-sm leading-relaxed text-text-2">
              Ajan 4 turda 12. satıra ulaşamadı: 5000 karakterden uzun içerik gönderen bir test istek boyut sınırına
              takılıyor. Fonksiyonu doğrudan çağıran ayrı bir birim testi gerekiyor.
            </blockquote>
          </div>

          <div className="flex-1 rounded-3xl border border-border bg-surface p-5 shadow-yumusak sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-bad-bg text-bad-text">
                  <Bug size={20} aria-hidden="true" />
                </span>
                <div>
                  <h3 className="font-bold text-text">Olası hata</h3>
                  <p className="text-sm text-muted">Testin yakaladığı yanlış davranış</p>
                </div>
              </div>
              <span className="rounded-full bg-bad-bg px-2.5 py-1 text-xs font-semibold text-bad-text">Birim</span>
            </div>
            <div className="mt-4 rounded-2xl border border-border bg-soft p-4">
              <p className="font-semibold text-text">Boşluktan oluşan başlık kabul ediliyor</p>
              <p className="mt-0.5 font-mono text-xs text-muted">app/posts.py:9</p>
              <p className="mt-2 text-sm text-text-2">Beklenen 400 yerine 200 döndü; ajan testi koda uydurmadı, olası hata olarak işaretledi.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
