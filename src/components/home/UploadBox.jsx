// Büyük sürükle-bırak alanı: klasör / dosya / zip seçimi, sayım ve limit uyarısı.
import { useRef, useState } from 'react'
import { CircleCheck, TriangleAlert, Upload } from 'lucide-react'
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
        className={`flex flex-col items-center rounded-xl border-2 border-dashed px-4 py-10 text-center transition-colors ${
          surukleniyor ? 'border-accent bg-ai-bg' : 'border-border-strong bg-bg'
        }`}
      >
        <Upload size={44} className="text-accent" />
        <p className="mt-3 text-lg font-semibold">Kodunu buraya sürükle bırak</p>
        <p className="mt-1 text-sm text-muted">Klasör, dosya ya da .zip · en fazla 5 MB / 200 dosya</p>
        <button
          type="button"
          onClick={() => klasorRef.current.click()}
          className="mt-4 min-h-11 rounded-lg border border-border-strong bg-surface px-5 text-sm font-medium hover:bg-soft"
        >
          Bilgisayarından seç
        </button>
        <button
          type="button"
          onClick={() => dosyaRef.current.click()}
          className="mt-2 min-h-10 px-3 text-sm text-ai-text underline"
        >
          ya da tek dosya / .zip seç
        </button>
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
