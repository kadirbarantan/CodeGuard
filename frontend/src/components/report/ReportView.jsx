import { useCallback, useState } from 'react'
import ReportHeader from './ReportHeader'
import CoverageDonut from './CoverageDonut'
import SummaryCards from './SummaryCards'
import CodeTab from './CodeTab'
import UiTestsTab from './UiTestsTab'
import BugsTab from './BugsTab'
import TestsTab from './TestsTab'
import Toast from '../Toast'
import UxRaporu from './UxRaporu'
import ErisimRaporu from './ErisimRaporu'
import { denetimVar, uxVar } from '../../config/testStratejileri'
import VurguKart from '../VurguKart'
import { ayrilma, yonelme } from '../../config/sayiEki'

// Rapor ekranının üstündeki yumuşak zemin (ana sayfadaki açılışla aynı)
const Zemin = () => (
  <div aria-hidden="true" className="hero-zemin pointer-events-none absolute left-1/2 top-0 -z-10 h-[34rem] w-screen -translate-x-1/2">
    <div className="izgara absolute inset-0 opacity-70" />
  </div>
)

const BACKEND_NOTU = 'Bu özellik backend bağlandığında aktif olacak.'

// Rapor ekranı: başlık, özet kartı ve sekmeler.
// Seçili sekme / dosya / odak satırı / odak akışı burada tutulur.
export default function ReportView({ report, onNew }) {
  const urlModu = report.kaynak === 'url'
  const [sekme, setSekme] = useState(urlModu ? 'arayuz' : 'kod')
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

  // Kullanılabilirlik ve erişilebilirlik testleri kendi rapor düzenini kullanır
  if (denetimVar(report.tur)) {
    return (
      <main className="relative isolate mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        <Zemin />
        <ReportHeader report={report} onNew={onNew} onPdf={() => setToast(BACKEND_NOTU)} />
        {uxVar(report.tur) ? <UxRaporu report={report} /> : <ErisimRaporu report={report} />}
        <Toast message={toast} onClose={toastKapat} />
      </main>
    )
  }

  // Olası hata kutusundan sekmeye geçiş: sekmeyi aç ve görünür yap
  function hatalaraGit() {
    setSekme('hatalar')
    document.getElementById('rapor-sekmeler')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // URL ile testte kaynak kod yoktur: Kod sekmesi gösterilmez, halkada etkileşim kapsamı gösterilir
  const etkilesimYuzde = Math.round((report.etkilesim.kapsanan / report.etkilesim.toplam) * 100)

  // Tek cümlelik sonuç: kaç turda nereden nereye gelindi
  const turlu = report.turSayisi ? `${report.turSayisi} turda ` : ''
  const ozetCumlesi = urlModu
    ? `${turlu}etkileşim kapsamı ${report.ilkEtkilesim != null ? `${report.ilkEtkilesim}/${report.etkilesim.toplam} öğeden ` : ''}${report.etkilesim.kapsanan}/${report.etkilesim.toplam} öğeye çıktı; ${report.olasiHatalar.length} olası hata bulundu.`
    : `${turlu}kod kapsaması ${report.ilkCoverage != null ? `%${ayrilma(report.ilkCoverage)} ` : ''}%${yonelme(report.coverage.testEdilebilir)} çıktı; ${report.olasiHatalar.length} olası hata bulundu.`

  const sekmeler = [
    ...(urlModu ? [] : [{ id: 'kod', ad: 'Kod' }]),
    { id: 'arayuz', ad: 'Arayüz Testleri' },
    { id: 'hatalar', ad: `Olası Hatalar (${report.olasiHatalar.length})` },
    { id: 'testler', ad: 'Üretilen Testler' },
  ]

  return (
    <main className="relative isolate mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <Zemin />
      <ReportHeader report={report} onNew={onNew} onZip={() => setToast(BACKEND_NOTU)} onPdf={() => setToast(BACKEND_NOTU)} />

      <VurguKart baslik="Test Özeti" govde="space-y-4 p-5 sm:p-6">
        <p className="rounded-xl bg-ai-bg px-4 py-2.5 text-sm text-ai-text">{ozetCumlesi}</p>
        <div className="flex flex-col items-center gap-5 lg:flex-row">
        {urlModu ? (
          <CoverageDonut yuzde={etkilesimYuzde} etiket="Etkileşim" />
        ) : (
          <CoverageDonut yuzde={report.coverage.testEdilebilir} />
        )}
        <SummaryCards report={report} onHatalar={hatalaraGit} />
        </div>
      </VurguKart>

      <section id="rapor-sekmeler" className="scroll-mt-24 rounded-3xl border border-border bg-surface shadow-yumusak p-5 sm:p-6">
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
