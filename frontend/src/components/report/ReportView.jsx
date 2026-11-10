import { useCallback, useState } from 'react'
import ReportHeader from './ReportHeader'
import CoverageDonut from './CoverageDonut'
import SummaryCards from './SummaryCards'
import CodeTab from './CodeTab'
import KodYorumuTab from './KodYorumuTab'
import UiTestsTab from './UiTestsTab'
import BugsTab from './BugsTab'
import TestsTab from './TestsTab'
import Toast from '../Toast'
import UxRaporu from './UxRaporu'
import ErisimRaporu from './ErisimRaporu'
import { arayuzVar, birimVar, denetimVar, erisimVar, turListesi, uxVar } from '../../config/testStratejileri'
import VurguKart from '../VurguKart'
import { ayrilma, yonelme } from '../../config/sayiEki'

// Rapor ekranının üstündeki yumuşak zemin (ana sayfadaki açılışla aynı)
const Zemin = () => (
  <div aria-hidden="true" className="hero-zemin pointer-events-none absolute left-1/2 top-0 -z-10 h-[34rem] w-screen -translate-x-1/2">
    <div className="izgara absolute inset-0 opacity-70" />
  </div>
)

const BACKEND_NOTU = 'Bu özellik backend bağlandığında aktif olacak.'

// Kod testleri raporu (birim ve/veya arayüz): özet kartı ve sekmeler.
// Seçili sekme / dosya / odak satırı / odak akışı burada tutulur.
function KodRaporu({ report }) {
  const urlModu = report.kaynak === 'url'
  // Kaynak kod varsa rapor Kod Yorumu ile açılır: önce kodun ne yaptığı, sonra kapsaması
  const [sekme, setSekme] = useState(urlModu ? 'arayuz' : report.kodYorumu ? 'yorum' : 'kod')
  const [aktifYol, setAktifYol] = useState(null) // null: CodeTab sıralamadaki ilk dosyayı açar
  const [odak, setOdak] = useState(null) // { yol, satir } — "Kodda göster" ile gelir
  const [odakAkis, setOdakAkis] = useState(null) // akış adı — "Akışı göster" ile gelir

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
    ...(urlModu || !report.kodYorumu ? [] : [{ id: 'yorum', ad: 'Kod Yorumu' }]),
    ...(urlModu ? [] : [{ id: 'kod', ad: 'Kod' }]),
    { id: 'arayuz', ad: 'Arayüz Testleri' },
    { id: 'hatalar', ad: `Olası Hatalar (${report.olasiHatalar.length})` },
    { id: 'testler', ad: 'Üretilen Testler' },
  ]

  return (
    <>
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
          {sekme === 'yorum' && <KodYorumuTab report={report} onKoddaGoster={koddaGoster} />}
          {sekme === 'kod' && <CodeTab report={report} aktifYol={aktifYol} odak={odak} onDosyaSec={dosyaSec} />}
          {sekme === 'arayuz' && <UiTestsTab report={report} odakAkis={odakAkis} />}
          {sekme === 'hatalar' && <BugsTab report={report} onKoddaGoster={koddaGoster} onAkisiGoster={akisiGoster} />}
          {sekme === 'testler' && <TestsTab report={report} />}
        </div>
      </section>
    </>
  )
}

// Birden fazla test türü seçildiyse her grubun kısa sonucu (ör. "Kapsama %94 · 5 olası hata")
function parcaOzeti(p) {
  const r = p.rapor
  if (p.id === 'ux') return { deger: `UX skoru ${r.ux.skor}`, ek: `${r.bulgular.length} bulgu` }
  if (p.id === 'erisim') return { deger: `WCAG uyumu %${r.ozet.uyum}`, ek: `${r.ihlaller.length} ihlal` }
  const deger = r.coverage ? `Kapsama %${r.coverage.testEdilebilir}` : `Etkileşim ${r.etkilesim.kapsanan}/${r.etkilesim.toplam}`
  return { deger, ek: `${r.olasiHatalar.length} olası hata` }
}

// Birleşik raporun üstündeki geçiş: her test grubu bir kart; seçilen grubun raporu altta açılır
function ParcaSecici({ parcalar, turSayisi, secili, onSec }) {
  return (
    <VurguKart baslik="Bu testte çalışanlar" govde="space-y-3 p-5 sm:p-6">
      <p className="text-sm text-text-2">
        {turSayisi} test türü tek testte çalıştı:{' '}
        <span className="font-medium text-text">{parcalar.map((p) => parcaOzeti(p).deger).join(' · ')}</span>. Ayrıntısını görmek
        istediğin raporu seç.
      </p>
      <div role="tablist" aria-label="Test türü raporları" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {parcalar.map((p) => {
          const aktif = p.id === secili
          const o = parcaOzeti(p)
          return (
            <button
              key={p.id}
              id={'parca-' + p.id}
              type="button"
              role="tab"
              aria-selected={aktif}
              aria-controls="parca-panel"
              onClick={() => onSec(p.id)}
              className={
                'min-h-16 rounded-xl border px-4 py-3 text-left transition-colors ' +
                (aktif ? 'border-accent bg-ai-bg ring-2 ring-accent/20' : 'border-border bg-surface hover:bg-soft')
              }
            >
              <span className={'block text-sm font-semibold ' + (aktif ? 'text-ai-text' : 'text-text')}>{p.ad}</span>
              <span className="mt-0.5 block text-sm text-text-2">
                {o.deger} <span className="text-muted">· {o.ek}</span>
              </span>
            </button>
          )
        })}
      </div>
    </VurguKart>
  )
}

// Rapor ekranı: başlık, (birden fazla test türü seçildiyse) rapor geçişi ve seçili raporun gövdesi.
// Kullanılabilirlik ve erişilebilirlik kendi rapor düzenini, kod testleri özet + sekmeleri kullanır.
export default function ReportView({ report, onNew }) {
  const parcalar = report.parcalar
  const [secili, setSecili] = useState(parcalar?.[0]?.id)
  const [toast, setToast] = useState('')
  const toastKapat = useCallback(() => setToast(''), [])
  const aktif = parcalar ? parcalar.find((p) => p.id === secili)?.rapor || parcalar[0].rapor : report
  const kodRaporuVar = parcalar ? parcalar.some((p) => p.id === 'kod') : !denetimVar(report.tur)

  return (
    <main className="relative isolate mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <Zemin />
      <ReportHeader
        report={report}
        onNew={onNew}
        onZip={kodRaporuVar ? () => setToast(BACKEND_NOTU) : undefined}
        onPdf={() => setToast(BACKEND_NOTU)}
      />
      {parcalar && <ParcaSecici parcalar={parcalar} turSayisi={turListesi(report.tur).length} secili={secili} onSec={setSecili} />}
      <div id="parca-panel" role={parcalar ? 'tabpanel' : undefined} aria-labelledby={parcalar ? 'parca-' + secili : undefined} className="space-y-6">
        {uxVar(aktif.tur) && !birimVar(aktif.tur) && !arayuzVar(aktif.tur) ? (
          <UxRaporu report={aktif} />
        ) : erisimVar(aktif.tur) && !birimVar(aktif.tur) && !arayuzVar(aktif.tur) ? (
          <ErisimRaporu report={aktif} />
        ) : (
          <KodRaporu key={aktif.runId + secili} report={aktif} />
        )}
      </div>
      <Toast message={toast} onClose={toastKapat} />
    </main>
  )
}

