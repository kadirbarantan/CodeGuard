// Erişilebilirlik testi raporu: özet, ihlaller (WCAG maddesi, önem, öğe, öneri; kod varsa dosya ve satır),
// klavye ve odak testi, kontrast ölçümleri ve denetlenen WCAG ölçütleri.
import { useState } from 'react'
import { Check, ChevronDown, Code2, Info, Keyboard, Lightbulb, Minus, X } from 'lucide-react'
import CoverageDonut from './CoverageDonut'
import VurguKart from '../VurguKart'

const ONEM = {
  kritik: { ad: 'Kritik', sinif: 'bg-bad text-white' },
  ciddi: { ad: 'Ciddi', sinif: 'bg-bad-bg text-bad-text' },
  orta: { ad: 'Orta', sinif: 'bg-ai-bg text-ai-text' },
  dusuk: { ad: 'Düşük', sinif: 'bg-soft text-text-2' },
}

const kutu = 'rounded-xl border border-border bg-bg p-4'
const etiket = 'text-sm text-muted'

// Hatalı satır ve önerilen düzeltme (yalnızca kod / GitHub ile testte)
function KodParcasi({ kaynak }) {
  const satirlar = (metin, ilk) =>
    metin.split('\n').map((s, i) => (
      <span key={i} className="flex">
        <span className="w-10 shrink-0 select-none pr-3 text-right text-muted">{ilk + i}</span>
        <span className="whitespace-pre">{s}</span>
      </span>
    ))
  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-border">
      <p className="flex items-center gap-2 border-b border-border bg-soft px-3 py-1.5 font-mono text-xs text-text-2">
        <Code2 size={13} aria-hidden="true" />
        {kaynak.dosya}:{kaynak.satir}
      </p>
      <div className="overflow-x-auto font-mono text-xs leading-relaxed">
        <p className="sr-only">Şu anki kod:</p>
        <code className="block bg-bad-bg/60 px-2 py-2 text-text">{satirlar(kaynak.kod, kaynak.satir)}</code>
        <p className="border-t border-border bg-surface px-3 py-1 font-sans text-xs font-medium text-ok-text">Önerilen düzeltme</p>
        <code className="block bg-ok-bg/60 px-2 py-2 text-text">{satirlar(kaynak.duzeltme, kaynak.satir)}</code>
      </div>
    </div>
  )
}

function IhlalKarti({ ihlal, olcut }) {
  const [kodAcik, setKodAcik] = useState(false)
  const kodId = 'kod-' + ihlal.wcag.replace(/\./g, '-')
  return (
    <li className="rounded-xl border border-border bg-bg p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={'rounded-full px-2 py-0.5 text-xs font-semibold ' + ONEM[ihlal.onem].sinif}>{ONEM[ihlal.onem].ad}</span>
        <span className="font-semibold text-text">{ihlal.baslik}</span>
        <span className="ml-auto font-mono text-xs text-muted">{ihlal.sayfa}</span>
      </div>
      <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
        <span>
          WCAG {ihlal.wcag} {olcut ? `· ${olcut.ad} (${olcut.duzey})` : ''}
        </span>
        <span>{ihlal.adet} öğe</span>
        <span className="font-mono">{ihlal.oge}</span>
      </p>
      <p className="mt-2 text-sm text-text-2">{ihlal.aciklama}</p>
      <p className="mt-2 flex gap-2 text-sm text-ai-text">
        <Lightbulb size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span>
          <strong className="font-semibold">Öneri:</strong> {ihlal.oneri}
        </span>
      </p>
      {ihlal.kaynak && (
        <>
          <button
            type="button"
            onClick={() => setKodAcik((a) => !a)}
            aria-expanded={kodAcik}
            aria-controls={kodId}
            className="mt-3 flex min-h-9 items-center gap-1.5 rounded-lg border border-border-strong bg-surface px-3 text-sm font-medium text-text hover:bg-soft"
          >
            <Code2 size={15} aria-hidden="true" />
            {kodAcik ? 'Kodu gizle' : 'Kodda göster'}
            <ChevronDown size={14} className={'transition-transform ' + (kodAcik ? 'rotate-180' : '')} aria-hidden="true" />
          </button>
          {kodAcik && (
            <div id={kodId}>
              <KodParcasi kaynak={ihlal.kaynak} />
            </div>
          )}
        </>
      )}
    </li>
  )
}

function Ihlaller({ report, olcutBul }) {
  const [filtre, setFiltre] = useState('hepsi')
  const liste = filtre === 'hepsi' ? report.ihlaller : report.ihlaller.filter((i) => i.onem === filtre)
  const filtreler = [['hepsi', 'Tümü', report.ihlaller.length]].concat(
    Object.entries(ONEM).map(([k, o]) => [k, o.ad, report.ihlaller.filter((i) => i.onem === k).length]),
  )
  const kodVar = report.ihlaller.some((i) => i.kaynak)
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Öneme göre süz">
        {filtreler.map(([k, ad, n]) => (
          <button
            key={k}
            type="button"
            aria-pressed={filtre === k}
            onClick={() => setFiltre(k)}
            className={
              'min-h-9 rounded-full border px-3 text-sm font-medium ' +
              (filtre === k ? 'border-accent bg-ai-bg text-ai-text' : 'border-border bg-surface text-text-2 hover:bg-soft')
            }
          >
            {ad} <span className="text-muted">{n}</span>
          </button>
        ))}
      </div>
      {!kodVar && (
        <p className="mb-3 flex gap-2 text-sm text-muted">
          <Info size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
          URL ile testte kaynak kod olmadığı için ihlaller sayfadaki öğeyle gösterilir; kod ya da GitHub ile testte koddaki dosya ve satır da verilir.
        </p>
      )}
      <ul className="space-y-3">
        {liste.map((i) => (
          <IhlalKarti key={i.wcag + i.baslik} ihlal={i} olcut={olcutBul(i.wcag)} />
        ))}
      </ul>
    </div>
  )
}

function KlavyeOdak({ report }) {
  const SORUN = { ulasilamiyor: 'Klavyeyle ulaşılamıyor', adsiz: 'Ekran okuyucu adını okuyamıyor' }
  return (
    <div className="space-y-5">
      <p className="text-sm text-text-2">
        Playwright fare kullanmadan yalnızca <kbd className="rounded border border-border bg-soft px-1 font-mono text-xs">Tab</kbd>,{' '}
        <kbd className="rounded border border-border bg-soft px-1 font-mono text-xs">Shift+Tab</kbd>,{' '}
        <kbd className="rounded border border-border bg-soft px-1 font-mono text-xs">Enter</kbd> ve{' '}
        <kbd className="rounded border border-border bg-soft px-1 font-mono text-xs">Esc</kbd> ile her sayfayı gezdi.
      </p>

      <section className={kutu}>
        <h3 className="mb-3 flex items-center gap-2 font-semibold text-text">
          <Keyboard size={16} className="text-ai-text" aria-hidden="true" />
          Ana sayfada Tab sırası
        </h3>
        <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
          {report.sekmeSirasi.map((o, i) => (
            <li key={o.ad} className="flex items-center gap-1.5" title={o.sorun ? SORUN[o.sorun] : undefined}>
              <span
                className={
                  'flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs ' +
                  (o.sorun ? 'border-bad/50 bg-bad-bg text-bad-text' : 'border-border bg-surface text-text-2')
                }
              >
                <span className="font-mono font-bold">{i + 1}</span>
                {o.ad}
                {o.sorun && <span className="sr-only">: {SORUN[o.sorun]}</span>}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-muted">Kırmızı öğeler: menüye Tab ile ulaşılamıyor, arama düğmesinin ekran okuyucuda adı yok.</p>
      </section>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[34rem] text-sm">
          <caption className="sr-only">Sayfalara göre klavye testi sonuçları</caption>
          <thead className="bg-soft text-left text-xs text-muted">
            <tr>
              <th scope="col" className="px-4 py-2 font-medium">Sayfa</th>
              <th scope="col" className="px-4 py-2 font-medium">Odaklanabilen öğe</th>
              <th scope="col" className="px-4 py-2 font-medium">Ulaşılamayan</th>
              <th scope="col" className="px-4 py-2 font-medium">Odağı görünmeyen</th>
              <th scope="col" className="px-4 py-2 font-medium">Klavye tuzağı</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-bg">
            {report.klavye.map((k) => (
              <tr key={k.sayfa}>
                <th scope="row" className="px-4 py-2 text-left font-mono font-normal text-text">{k.sayfa}</th>
                <td className="px-4 py-2 text-text">{k.odaklanabilir}</td>
                <td className={'px-4 py-2 ' + (k.ulasilamayan ? 'font-semibold text-bad-text' : 'text-text')}>{k.ulasilamayan}</td>
                <td className={'px-4 py-2 ' + (k.odakGorunmuyor ? 'font-semibold text-bad-text' : 'text-text')}>{k.odakGorunmuyor}</td>
                <td className="px-4 py-2">
                  {k.tuzak ? <span className="font-semibold text-bad-text">Var</span> : <span className="text-ok-text">Yok</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Kontrast({ report }) {
  return (
    <div>
      <p className="mb-3 text-sm text-text-2">
        WCAG 1.4.3: normal metin için en az <strong>4.5:1</strong>, büyük metin (24 px ya da 18.5 px kalın) için en az <strong>3:1</strong>.
      </p>
      <ul className="grid gap-2 lg:grid-cols-2">
        {report.kontrast.map((k) => (
          <li key={k.oge + k.sayfa} className="flex items-center gap-3 rounded-xl border border-border bg-bg p-3">
            <span
              className="flex h-10 w-12 shrink-0 items-center justify-center rounded-md border border-border text-lg font-semibold"
              style={{ color: k.on, background: k.arka }}
              aria-hidden="true"
            >
              Aa
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm text-text">{k.oge}</span>
              <span className="font-mono text-xs text-muted">
                {k.sayfa} · {k.on} / {k.arka}
              </span>
            </span>
            <span className="text-right">
              <span className="block text-sm font-semibold text-bad-text">{k.oran}:1</span>
              <span className="text-xs text-muted">gereken {k.gereken}:1</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Olcutler({ report }) {
  const DURUM = {
    gecti: { ad: 'Geçti', ikon: Check, sinif: 'text-ok-text' },
    kaldi: { ad: 'Kaldı', ikon: X, sinif: 'text-bad-text' },
    uygulanmaz: { ad: 'Uygulanmaz', ikon: Minus, sinif: 'text-muted' },
  }
  return (
    <div>
      <p className="mb-3 text-sm text-text-2">
        Otomatik araçlarla denetlenebilen {report.wcag} başarı ölçütleri. "Uygulanmaz": sitede o içerik yok (örneğin video).
      </p>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[28rem] text-sm">
          <caption className="sr-only">WCAG başarı ölçütleri ve durumları</caption>
          <thead className="bg-soft text-left text-xs text-muted">
            <tr>
              <th scope="col" className="px-4 py-2 font-medium">Madde</th>
              <th scope="col" className="px-4 py-2 font-medium">Ölçüt</th>
              <th scope="col" className="px-4 py-2 font-medium">Düzey</th>
              <th scope="col" className="px-4 py-2 font-medium">Durum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-bg">
            {report.olcutler.map((o) => {
              const d = DURUM[o.durum]
              const Ikon = d.ikon
              return (
                <tr key={o.no}>
                  <th scope="row" className="px-4 py-2 text-left font-mono font-normal text-text">{o.no}</th>
                  <td className="px-4 py-2 text-text">{o.ad}</td>
                  <td className="px-4 py-2 text-text-2">{o.duzey}</td>
                  <td className={'px-4 py-2 font-medium ' + d.sinif}>
                    <span className="flex items-center gap-1.5">
                      <Ikon size={14} aria-hidden="true" />
                      {d.ad}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function ErisimRaporu({ report }) {
  const [sekme, setSekme] = useState('ihlaller')
  const olcutBul = (no) => report.olcutler.find((o) => o.no === no)
  const gecen = report.olcutler.filter((o) => o.durum === 'gecti').length
  const denetlenen = report.olcutler.filter((o) => o.durum !== 'uygulanmaz').length
  const uyum = Math.round((gecen / denetlenen) * 100)
  const kritik = report.ihlaller.filter((i) => i.onem === 'kritik').length
  const ogeSayisi = report.ihlaller.reduce((t, i) => t + i.adet, 0)
  const kodVar = report.ihlaller.some((i) => i.kaynak)

  const sekmeler = [
    { id: 'ihlaller', ad: `İhlaller (${report.ihlaller.length})` },
    { id: 'klavye', ad: 'Klavye ve Odak' },
    { id: 'kontrast', ad: `Kontrast (${report.kontrast.length})` },
    { id: 'olcutler', ad: 'WCAG Ölçütleri' },
  ]

  function ihlallereGit() {
    setSekme('ihlaller')
    document.getElementById('erisim-sekmeler')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      <VurguKart baslik="Test Özeti" govde="space-y-4 p-5 sm:p-6">
        <p className="rounded-xl bg-ai-bg px-4 py-2.5 text-sm text-ai-text">
          {report.ozet.sayfa} sayfa {report.wcag} ölçütlerine göre denetlendi; uyum %{uyum} ({gecen} / {denetlenen} ölçüt).{' '}
          {kritik} kritik olmak üzere {report.ihlaller.length} tür ihlal, toplam {ogeSayisi} öğede bulundu.
          {kodVar && ' Her ihlal koddaki yerine bağlandı.'}
        </p>
        <div className="flex flex-col items-center gap-5 lg:flex-row">
          <CoverageDonut yuzde={uyum} etiket="WCAG uyumu" />
          <div className="grid w-full flex-1 gap-3 sm:grid-cols-2">
            <div className={kutu}>
              <p className={etiket}>Lighthouse erişilebilirlik</p>
              <p className="mt-1 text-2xl font-semibold text-text">{report.ozet.lighthouse} / 100</p>
              <p className="text-xs text-muted">ana sayfa, mobil</p>
            </div>
            <div className={kutu}>
              <p className={etiket}>Geçen ölçüt</p>
              <p className="mt-1 text-2xl font-semibold text-text">
                {gecen} / {denetlenen}
              </p>
              <p className="text-xs text-muted">{report.wcag}</p>
            </div>
            <button type="button" onClick={ihlallereGit} className={kutu + ' group text-left transition hover:border-bad hover:bg-bad-bg'}>
              <p className={etiket}>İhlal</p>
              <p className="mt-1 flex items-baseline justify-between gap-2">
                <span className="text-2xl font-semibold text-bad-text">{report.ihlaller.length}</span>
                <span className="text-xs font-medium text-bad-text group-hover:underline">İhlalleri gör →</span>
              </p>
              <p className="text-xs text-muted">{ogeSayisi} öğede</p>
            </button>
            <div className={kutu}>
              <p className={etiket}>Kritik ihlal</p>
              <p className="mt-1 text-2xl font-semibold text-bad-text">{kritik}</p>
              <p className="text-xs text-muted">kullanıcıyı tamamen engelliyor</p>
            </div>
          </div>
        </div>
      </VurguKart>

      <section id="erisim-sekmeler" className="scroll-mt-24 rounded-3xl border border-border bg-surface p-5 shadow-yumusak sm:p-6">
        <div role="tablist" aria-label="Erişilebilirlik raporu bölümleri" className="mb-5 flex flex-wrap gap-1 border-b border-border">
          {sekmeler.map((s) => {
            const aktif = sekme === s.id
            return (
              <button
                key={s.id}
                id={'er-sekme-' + s.id}
                type="button"
                role="tab"
                aria-selected={aktif}
                aria-controls={'er-panel-' + s.id}
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
        <div id={'er-panel-' + sekme} role="tabpanel" aria-labelledby={'er-sekme-' + sekme}>
          {sekme === 'ihlaller' && <Ihlaller report={report} olcutBul={olcutBul} />}
          {sekme === 'klavye' && <KlavyeOdak report={report} />}
          {sekme === 'kontrast' && <Kontrast report={report} />}
          {sekme === 'olcutler' && <Olcutler report={report} />}
        </div>
        <p className="mt-5 flex gap-2 border-t border-border pt-4 text-xs text-muted">
          <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          Otomatik araçlar erişilebilirlik sorunlarının hepsini bulamaz; örneğin alternatif metnin anlamlı olup olmadığı ya da
          okuma sırasının mantığı için ekran okuyucuyla elle deneme önerilir.
        </p>
      </section>
    </>
  )
}
