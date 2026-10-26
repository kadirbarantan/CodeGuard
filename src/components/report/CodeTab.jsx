import { useEffect, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import { Sparkles } from 'lucide-react'

const SATIR_YUKSEKLIK = 20
const MAX_YUKSEKLIK = 500

const DIL = { py: 'python', cs: 'csharp', js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript' }
const dilBul = (yol) => DIL[yol.split('.').pop()] || 'plaintext'

// Kapsanan satır oranı (%)
function dosyaCoverage(d) {
  const { kapsanan, kapsanmayan } = d.satirlar
  const toplam = kapsanan.length + kapsanmayan.length
  return toplam ? Math.round((kapsanan.length / toplam) * 100) : 100
}

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

export default function CodeTab({ report }) {
  const dosyalar = report.dosyalar
  const [aktifYol, setAktifYol] = useState(dosyalar[0].yol)
  const dosya = dosyalar.find((d) => d.yol === aktifYol) || dosyalar[0]
  const koyu = useKoyuTema()

  const [editor, setEditor] = useState(null)
  const [monaco, setMonaco] = useState(null)
  const koleksiyonRef = useRef(null)
  const dosyaRef = useRef(dosya)
  dosyaRef.current = dosya

  // Seçili kapsanmayan satır: açılışta ilk kapsanmayan satır
  const ilkSatir = (d) => [...d.satirlar.kapsanmayan].sort((a, b) => a - b)[0] ?? null
  const [secili, setSecili] = useState(() => ilkSatir(dosya))

  function dosyaSec(yol) {
    setAktifYol(yol)
    setSecili(ilkSatir(dosyalar.find((d) => d.yol === yol)))
  }

  function editorHazir(ed, mn) {
    setEditor(ed)
    setMonaco(mn)
    // Kapsanmayan satıra tıklanınca AI Insight aç
    ed.onMouseDown((e) => {
      const satir = e.target.position?.lineNumber
      if (satir && dosyaRef.current.satirlar.kapsanmayan.includes(satir)) setSecili(satir)
    })
  }

  // Satırları boya: kapsanan yeşil, kapsanmayan kırmızı, motor bağımlı gri
  useEffect(() => {
    if (!editor || !monaco) return
    const boya = (satirlar, sinif) =>
      satirlar.map((n) => ({
        range: new monaco.Range(n, 1, n, 1),
        options: { isWholeLine: true, className: 'cov-' + sinif, linesDecorationsClassName: 'cov-serit-' + sinif },
      }))
    const { kapsanan, kapsanmayan, motorBagimli } = dosya.satirlar
    const liste = [...boya(kapsanan, 'ok'), ...boya(kapsanmayan, 'bad'), ...boya(motorBagimli, 'gri')]
    koleksiyonRef.current?.clear()
    koleksiyonRef.current = editor.createDecorationsCollection(liste)
  }, [editor, monaco, dosya])

  const icgoru = secili != null ? report.icgoruler[`${dosya.yol}:${secili}`] : null
  const satirSayisi = dosya.kod.split('\n').length
  const yukseklik = Math.min(MAX_YUKSEKLIK, satirSayisi * SATIR_YUKSEKLIK + 20)

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-text-2">
        <Lejant renk="bg-ok">Kapsandı</Lejant>
        <Lejant renk="bg-bad">Kapsanmadı · tıkla, AI Insight</Lejant>
        <Lejant renk="bg-border-strong">Motor bağımlı</Lejant>
      </div>

      <div className="flex flex-col gap-3 md:flex-row">
        {dosyalar.length > 1 && (
          <ul className="shrink-0 space-y-1 md:w-60" aria-label="Dosyalar">
            {dosyalar.map((d) => (
              <li key={d.yol}>
                <button
                  type="button"
                  onClick={() => dosyaSec(d.yol)}
                  aria-current={d.yol === dosya.yol ? 'true' : undefined}
                  className={
                    'flex min-h-10 w-full items-center justify-between gap-2 rounded-lg px-3 text-left text-sm ' +
                    (d.yol === dosya.yol ? 'bg-ai-bg text-ai-text' : 'text-text-2 hover:bg-soft')
                  }
                >
                  <span className="truncate font-mono">{d.yol}</span>
                  <span className="shrink-0 text-xs">%{dosyaCoverage(d)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="min-w-0 flex-1">
          <div className="overflow-hidden rounded-xl border border-border">
            <Editor
              height={yukseklik}
              path={dosya.yol}
              language={dilBul(dosya.yol)}
              value={dosya.kod}
              theme={koyu ? 'vs-dark' : 'vs'}
              onMount={editorHazir}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineHeight: SATIR_YUKSEKLIK,
                fontSize: 13,
                padding: { top: 10, bottom: 10 },
                renderLineHighlight: 'none',
                domReadOnly: true,
              }}
            />
          </div>

          {icgoru && (
            <div
              role="status"
              className="mt-3 rounded-xl border border-ai-border bg-ai-bg p-4"
            >
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
