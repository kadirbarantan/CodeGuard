// Büyük sürükle-bırak alanı: klasör / dosya / zip seçimi, sayım ve limit uyarısı.
import { useRef, useState } from 'react'
import { CircleCheck, FileArchive, FolderOpen, TriangleAlert, Upload } from 'lucide-react'
import { MAX_BOYUT, MAX_DOSYA, birakmadanOlc, boyutYaz, inputtanOlc } from './dosyaOlcum'

export default function UploadBox({ dosya, onDosya }) {
  const klasorRef = useRef(null)
  const dosyaRef = useRef(null)
  const [hata, setHata] = useState('')
  const [surukleniyor, setSurukleniyor] = useState(false)

  // Ölçümü kontrol et: limit aşılırsa uyarı ver, aksi halde dosyayı kabul et
  function kabulEt(olcum) {
    if (olcum.sayi === 0) {
      setHata('Yüklenecek dosya bulunamadı.')
      onDosya(null)
    } else if (olcum.sayi > MAX_DOSYA || olcum.boyut > MAX_BOYUT) {
      setHata(`Limit aşıldı: ${olcum.sayi} dosya, ${boyutYaz(olcum.boyut)}. En fazla 5 MB / 200 dosya.`)
      onDosya(null)
    } else {
      setHata('')
      onDosya(olcum)
    }
  }

  function inputDegisti(e) {
    kabulEt(inputtanOlc(e.target.files))
    e.target.value = '' // aynı seçimi tekrar yapabilmek için
  }

  async function birakildi(e) {
    e.preventDefault()
    setSurukleniyor(false)
    kabulEt(await birakmadanOlc(e.dataTransfer))
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setSurukleniyor(true)
        }}
        onDragLeave={() => setSurukleniyor(false)}
        onDrop={birakildi}
        className={`group flex flex-col items-center rounded-2xl border-2 border-dashed px-4 py-9 text-center transition-colors ${
          surukleniyor ? 'border-accent bg-ai-bg' : 'border-ai-border bg-gradient-to-b from-soft/60 to-surface hover:border-accent'
        }`}
      >
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-ai-border bg-ai-bg text-ai-text shadow-yumusak transition-transform group-hover:scale-105">
          <Upload size={30} aria-hidden="true" />
        </span>
        <p className="mt-4 text-lg font-bold text-text">Kodunu buraya sürükle bırak</p>
        <p className="mt-1 font-mono text-xs text-muted">Klasör, dosya ya da .zip, en fazla 5 MB ve 200 dosya</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => klasorRef.current.click()}
            className="flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-white shadow-yumusak transition-colors hover:bg-accent-2"
          >
            <FolderOpen size={17} aria-hidden="true" /> Bilgisayarından seç
          </button>
          <button
            type="button"
            onClick={() => dosyaRef.current.click()}
            className="flex min-h-11 items-center gap-2 rounded-xl border border-border-strong bg-surface px-4 text-sm font-semibold text-text shadow-sm transition-colors hover:bg-soft"
          >
            <FileArchive size={17} className="text-muted" aria-hidden="true" /> Tek dosya ya da .zip
          </button>
        </div>
        <input ref={klasorRef} type="file" webkitdirectory="" multiple onChange={inputDegisti} className="hidden" aria-label="Klasör seç" />
        <input ref={dosyaRef} type="file" onChange={inputDegisti} className="hidden" aria-label="Dosya veya zip seç" />
      </div>

      {dosya && (
        <p className="mt-3 flex flex-wrap items-center gap-x-2 text-sm text-ok-text">
          <CircleCheck size={16} />
          <span className="font-mono font-medium">{dosya.ad}</span>
          <span>· {dosya.sayi} dosya · {boyutYaz(dosya.boyut)} · Yüklendi</span>
        </p>
      )}
      {hata && (
        <p role="alert" className="mt-3 flex items-center gap-2 text-sm text-bad-text">
          <TriangleAlert size={16} /> {hata}
        </p>
      )}
    </div>
  )
}
