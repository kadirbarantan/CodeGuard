import { useEffect, useMemo, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import { ListTree, Search, Sparkles, TriangleAlert } from 'lucide-react'
import FileTree, { dosyaCoverage } from './FileTree'
import { getFileSource } from '../../services/api'

// "Kod" sekmesi: solda dosya ağacı (tümü / yalnızca sorunlular), sağda renkli kod ve AI Insight.

const SATIR_YUKSEKLIK = 20
const MAX_YUKSEKLIK = 500

const DIL = { py: 'python', cs: 'csharp', js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript' }
const dilBul = (yol) => DIL[yol.split('.').pop()] || 'plaintext'

const ilkKapsanmayan = (d) => [...d.satirlar.kapsanmayan].sort((a, b) => a - b)[0] ?? null

// Gece modunu izle (ThemeToggle html'deki data-theme'i değiştirir)
function useKoyuTema() {
  const oku = () => document.documentElement.getAttribute('data-theme') === 'dark'
  const [koyu, setKoyu] = useState(oku)
  useEffect(() => {
    const gozlemci = new MutationObserver(() => setKoyu(oku()))
    gozlemci.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => gozlemci.disconnect()
  }, [])
  return koyu
}

function Lejant({ renk, children }) {
  return (
    <span className="flex items-center gap-2">
      <span className={'h-3 w-3 rounded-sm ' + renk} />
      {children}
    </span>
  )
}

export default function CodeTab({ report, aktifYol, odak, onDosyaSec }) {
  const koyu = useKoyuTema()
  const [arama, setArama] = useState('')
  const [gorunum, setGorunum] = useState('agac') // 'agac' | 'sorunlu'

  // Dosya başına birim olası hataları
  const hatalar = useMemo(() => {
    const m = {}
    for (const h of report.olasiHatalar) {
      if (h.tur !== 'birim' || !h.dosya) continue
      ;(m[h.dosya] ||= []).push(h)
    }
    return m
  }, [report])

  // En kötüden iyiye: önce olası hatası olanlar, sonra coverage'ı düşük olanlar
  const sirali = useMemo(
    () =>
      [...report.dosyalar].sort((a, b) => {
        const ha = hatalar[a.yol]?.length || 0
        const hb = hatalar[b.yol]?.length || 0
        if (ha !== hb) return hb - ha
        return dosyaCoverage(a) - dosyaCoverage(b)
      }),
    [report, hatalar],
  )
  const sorunlu = sirali.filter((d) => (hatalar[d.yol]?.length || 0) > 0 || dosyaCoverage(d) < 100)

  // Açılışta en sorunlu dosya seçili gelir
  const dosya = sirali.find((d) => d.yol === aktifYol) || sirali[0]

  // Dosya içeriği raporla gelmez; seçilince istenir ve önbelleğe alınır
  const onbellek = useRef({})
  const [kaynak, setKaynak] = useState(null) // { yol, kod }
  useEffect(() => {
    const yol = dosya.yol
    if (onbellek.current[yol] != null) {
      setKaynak({ yol, kod: onbellek.current[yol] })
      return
    }
    let iptal = false
    setKaynak(null)
    getFileSource(report.runId, yol).then((s) => {
      onbellek.current[yol] = s.kod
      if (!iptal) setKaynak({ yol, kod: s.kod })
    })
    return () => {
      iptal = true
    }
  }, [report.runId, dosya.yol])
  const kod = kaynak && kaynak.yol === dosya.yol ? kaynak.kod : null

  const [editor, setEditor] = useState(null)
  const [monaco, setMonaco] = useState(null)
  const koleksiyonRef = useRef(null)
  const dosyaRef = useRef(dosya)
  dosyaRef.current = dosya

  // Seçili kapsanmayan satır (AI Insight). Başka dosyadaysa o dosyanın ilk kapsanmayan satırı.
  const [secim, setSecim] = useState(null) // { yol, satir }
  const secili = secim && secim.yol === dosya.yol ? secim.satir : ilkKapsanmayan(dosya)

  function editorHazir(ed, mn) {
    setEditor(ed)
    setMonaco(mn)
    // Kapsanmayan satıra tıklanınca AI Insight aç
    ed.onMouseDown((e) => {
      const satir = e.target.position?.lineNumber
      const d = dosyaRef.current
      if (satir && d.satirlar.kapsanmayan.includes(satir)) setSecim({ yol: d.yol, satir })
    })
  }

  // Kod yüklendikten sonra: satırları boya, olası hata satırlarına "!" koy, odak satırını vurgula
  useEffect(() => {
    if (!editor || !monaco || kod == null) return
    const boya = (satirlar, sinif) =>
      satirlar.map((n) => ({
        range: new monaco.Range(n, 1, n, 1),
        options: { isWholeLine: true, className: 'cov-' + sinif, linesDecorationsClassName: 'cov-serit-' + sinif },
      }))
    const { kapsanan, kapsanmayan, motorBagimli } = dosya.satirlar
    const liste = [...boya(kapsanan, 'ok'), ...boya(kapsanmayan, 'bad'), ...boya(motorBagimli, 'gri')]
    for (const h of hatalar[dosya.yol] || []) {
      liste.push({
        range: new monaco.Range(h.satir, 1, h.satir, 1),
        options: {
          glyphMarginClassName: 'hata-glyph',
          glyphMarginHoverMessage: { value: '**Olası hata:** ' + h.baslik },
        },
      })
    }
    const odakSatir = odak && odak.yol === dosya.yol ? odak.satir : null
    if (odakSatir) {
      liste.push({
        range: new monaco.Range(odakSatir, 1, odakSatir, 1),
        options: { isWholeLine: true, className: 'satir-odak' },
      })
    }
    koleksiyonRef.current?.clear()
    koleksiyonRef.current = editor.createDecorationsCollection(liste)
    if (odakSatir) editor.revealLineInCenter(odakSatir)
  }, [editor, monaco, dosya, hatalar, odak, kod])

  const icgoru = secili != null ? report.icgoruler[`${dosya.yol}:${secili}`] : null
  const satirSayisi = kod ? kod.split('\n').length : 10
  const yukseklik = Math.min(MAX_YUKSEKLIK, satirSayisi * SATIR_YUKSEKLIK + 20)

  const secenekSinif = (aktif) =>
    'flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-md text-xs font-medium ' +
    (aktif ? 'bg-surface text-ai-text shadow-sm' : 'text-text-2 hover:text-text')

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-text-2">
        <Lejant renk="bg-ok">Kapsandı</Lejant>
        <Lejant renk="bg-bad">Kapsanmadı · tıkla, AI Insight</Lejant>
        <Lejant renk="bg-border-strong">Motor bağımlı</Lejant>
      </div>
      <p className="mb-3 mt-1 text-xs text-muted">
        Renkler, üretilen testlerin hangi satırları çalıştırdığını gösterir. Bulunan hatalar ! ile işaretlidir.
      </p>

      <div className="flex flex-col gap-3 md:flex-row">
        <div className="shrink-0 md:w-72">
          <div className="mb-2 flex gap-1 rounded-lg bg-soft p-1" role="group" aria-label="Dosya görünümü">
            <button
              type="button"
              aria-pressed={gorunum === 'agac'}
              onClick={() => setGorunum('agac')}
              className={secenekSinif(gorunum === 'agac')}
            >
              <ListTree size={14} aria-hidden="true" /> Tüm dosyalar
            </button>
            <button
              type="button"
              aria-pressed={gorunum === 'sorunlu'}
              onClick={() => setGorunum('sorunlu')}
              className={secenekSinif(gorunum === 'sorunlu')}
            >
              <TriangleAlert size={14} aria-hidden="true" /> Sorunlu dosyalar ({sorunlu.length})
            </button>
          </div>

          <label className="relative mb-2 block">
            <span className="sr-only">Dosya ara</span>
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={arama}
              onChange={(e) => setArama(e.target.value)}
              placeholder="Dosya ara"
              className="min-h-10 w-full rounded-lg border border-border-strong bg-surface pl-8 pr-3 text-sm text-text outline-none focus:border-accent"
            />
          </label>

          <div className="max-h-[520px] overflow-y-auto pr-1">
            <FileTree
              dosyalar={report.dosyalar}
              hatalar={hatalar}
              aktifYol={dosya.yol}
              arama={arama}
              sadeceSorunlu={gorunum === 'sorunlu'}
              onSec={onDosyaSec}
            />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="mb-2 font-mono text-sm text-text-2">{dosya.yol}</p>
          <div className="relative overflow-hidden rounded-xl border border-border">
            {/* Editör hep açık kalır; dosya yüklenirken üstüne yarı saydam katman gelir */}
            <Editor
              height={yukseklik}
              path={dosya.yol}
              language={dilBul(dosya.yol)}
              value={kod ?? ''}
              theme={koyu ? 'vs-dark' : 'vs'}
              onMount={editorHazir}
              options={{
                readOnly: true,
                domReadOnly: true,
                minimap: { enabled: false },
                glyphMargin: true,
                scrollBeyondLastLine: false,
                lineHeight: SATIR_YUKSEKLIK,
                fontSize: 13,
                padding: { top: 10, bottom: 10 },
                renderLineHighlight: 'none',
              }}
            />
            {kod == null && (
              <div className="absolute inset-0 flex items-center justify-center bg-surface/80 text-sm text-muted">
                Yükleniyor…
              </div>
            )}
          </div>

          {icgoru && (
            <div role="status" className="mt-3 rounded-xl border border-ai-border bg-ai-bg p-4">
              <p className="flex items-center gap-2 font-semibold text-ai-text">
                <Sparkles size={16} /> AI Insight · Satır {secili}
              </p>
              <p className="mt-1 text-sm text-text-2">{icgoru}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
