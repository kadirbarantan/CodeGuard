import { useCallback, useState } from 'react'
import ReportHeader from './ReportHeader'
import CoverageDonut from './CoverageDonut'
import SummaryCards from './SummaryCards'
import CodeTab from './CodeTab'
import UiTestsTab from './UiTestsTab'
import BugsTab from './BugsTab'
import TestsTab from './TestsTab'
import Toast from '../Toast'

const BACKEND_NOTU = 'Bu özellik backend bağlandığında aktif olacak.'

// Rapor ekranı: başlık, özet kartı ve sekmeler.
// Seçili sekme / dosya / odak satırı / odak akışı burada tutulur.
export default function ReportView({ report, onNew }) {
  const [sekme, setSekme] = useState('kod')
  const [aktifYol, setAktifYol] = useState(null) // null: CodeTab sıralamadaki ilk dosyayı açar
  const [odak, setOdak] = useState(null) // { yol, satir } — "Kodda göster" ile gelir
  const [odakAkis, setOdakAkis] = useState(null) // akış adı — "Akışı göster" ile gelir
  const [toast, setToast] = useState('')
  const toastKapat = useCallback(() => setToast(''), [])

  function dosyaSec(yol) {
    setAktifYol(yol)
    setOdak(null)
  }

  function koddaGoster(h) {
    setAktifYol(h.dosya)
    setOdak({ yol: h.dosya, satir: h.satir })
    setSekme('kod')
  }

  function akisiGoster(h) {
    setOdakAkis(h.akis)
    setSekme('arayuz')
  }

  const sekmeler = [
    { id: 'kod', ad: 'Kod' },
    { id: 'arayuz', ad: 'Arayüz Testleri' },
    { id: 'hatalar', ad: `Olası Hatalar (${report.olasiHatalar.length})` },
    { id: 'testler', ad: 'Üretilen Testler' },
  ]

  return (
    <main className="mx-auto max-w-6xl space-y-4 px-4 py-8">
      <ReportHeader report={report} onNew={onNew} />

      <section className="flex flex-col items-center gap-5 rounded-2xl border border-border bg-surface p-5 sm:p-6 lg:flex-row">
        <CoverageDonut yuzde={report.coverage.testEdilebilir} />
        <SummaryCards report={report} />
        <div className="flex w-full flex-col gap-2 lg:w-auto">
          <button
            type="button"
            onClick={() => setToast(BACKEND_NOTU)}
            className="min-h-10 rounded-lg border border-border-strong bg-surface px-4 text-sm font-medium text-text hover:bg-soft"
          >
            Testleri İndir (.zip)
          </button>
          <button
            type="button"
            onClick={() => setToast(BACKEND_NOTU)}
            className="min-h-10 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:opacity-90"
          >
            PDF Raporu Al
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div role="tablist" aria-label="Rapor bölümleri" className="mb-5 flex flex-wrap gap-1 border-b border-border">
          {sekmeler.map((s) => {
            const aktif = sekme === s.id
            return (
              <button
                key={s.id}
                id={'sekme-' + s.id}
                type="button"
                role="tab"
                aria-selected={aktif}
                aria-controls={'panel-' + s.id}
                onClick={() => setSekme(s.id)}
                className={
                  '-mb-px min-h-10 border-b-2 px-4 text-sm font-medium ' +
                  (aktif ? 'border-accent text-ai-text' : 'border-transparent text-text-2 hover:text-text')
                }
              >
                {s.ad}
              </button>
            )
          })}
        </div>

        <div id={'panel-' + sekme} role="tabpanel" aria-labelledby={'sekme-' + sekme}>
          {sekme === 'kod' && <CodeTab report={report} aktifYol={aktifYol} odak={odak} onDosyaSec={dosyaSec} />}
          {sekme === 'arayuz' && <UiTestsTab report={report} odakAkis={odakAkis} />}
          {sekme === 'hatalar' && <BugsTab report={report} onKoddaGoster={koddaGoster} onAkisiGoster={akisiGoster} />}
          {sekme === 'testler' && <TestsTab report={report} />}
        </div>
      </section>

      <Toast message={toast} onClose={toastKapat} />
    </main>
  )
}
