import { useEffect, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'

const DIL = { py: 'python', cs: 'csharp', js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript' }
const dilBul = (yol) => DIL[yol.split('.').pop()] || 'plaintext'
const TUR = { birim: 'Birim', arayuz: 'Arayüz' }

// "Üretilen Testler" sekmesi: seçili test dosyasının kodu ve dosya tablosu.
export default function TestsTab({ report }) {
  const dosyalar = report.testDosyalari
  const [aktifYol, setAktifYol] = useState(dosyalar[0]?.yol)
  const [kopyalandi, setKopyalandi] = useState(false)
  const zamanlayiciRef = useRef(null)
  const dosya = dosyalar.find((d) => d.yol === aktifYol) || dosyalar[0]

  useEffect(() => () => clearTimeout(zamanlayiciRef.current), [])

  if (!dosya) {
    return (
      <div className="rounded-xl border border-dashed border-border-strong p-10 text-center text-muted">
        Üretilen test yok.
      </div>
    )
  }

  async function kopyala() {
    try {
      await navigator.clipboard.writeText(dosya.kod)
      setKopyalandi(true)
      clearTimeout(zamanlayiciRef.current)
      zamanlayiciRef.current = setTimeout(() => setKopyalandi(false), 2000)
    } catch {
      console.log('Kopyalanamadı')
    }
  }

  const satirSayisi = dosya.kod.split('\n').length
  const yukseklik = Math.min(360, satirSayisi * 20 + 20)

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl bg-panel">
        <div className="flex items-center justify-between gap-3 px-4 py-2 text-on-panel">
          <span className="truncate font-mono text-sm">{dosya.yol}</span>
          <button
            type="button"
            onClick={kopyala}
            className="min-h-9 shrink-0 rounded-lg border border-on-panel/25 px-3 text-sm hover:bg-on-panel/10"
          >
            {kopyalandi ? 'Kopyalandı ✓' : 'Kopyala'}
          </button>
        </div>
        <Editor
          height={yukseklik}
          path={'test:' + dosya.yol}
          language={dilBul(dosya.yol)}
          value={dosya.kod}
          theme="vs-dark"
          options={{
            readOnly: true,
            domReadOnly: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            lineHeight: 20,
            fontSize: 13,
            padding: { top: 10, bottom: 10 },
            renderLineHighlight: 'none',
          }}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-soft text-text-2">
            <tr>
              <th className="px-4 py-2 font-medium">Dosya</th>
              <th className="px-4 py-2 font-medium">Tür</th>
              <th className="px-4 py-2 font-medium">Test</th>
              <th className="px-4 py-2 font-medium">Sonuç</th>
            </tr>
          </thead>
          <tbody>
            {dosyalar.map((d) => {
              const secili = d.yol === dosya.yol
              const hata = d.sonuc.includes('olası hata')
              return (
                <tr
                  key={d.yol}
                  onClick={() => setAktifYol(d.yol)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setAktifYol(d.yol)
                    }
                  }}
                  tabIndex={0}
                  aria-selected={secili}
                  className={'cursor-pointer border-t border-border ' + (secili ? 'bg-ai-bg' : 'hover:bg-soft')}
                >
                  <td className="px-4 py-2 font-mono text-text">{d.yol}</td>
                  <td className="px-4 py-2 text-text-2">{TUR[d.tur] || d.tur}</td>
                  <td className="px-4 py-2 text-text-2">{d.sayi}</td>
                  <td className={'px-4 py-2 ' + (hata ? 'text-bad-text' : 'text-ok-text')}>{d.sonuc}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
