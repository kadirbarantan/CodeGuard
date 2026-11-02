// Test girdisi: "Kaynak Kod Yükle" ya da "URL Gir" sekmesi.
import { Globe, Upload } from 'lucide-react'
import UploadBox from './UploadBox'
import UrlGirdi from './UrlGirdi'

const SEKMELER = [
  { deger: 'kod', ad: 'Kaynak Kod Yükle', ikon: Upload },
  { deger: 'url', ad: 'URL Gir', ikon: Globe },
]

export default function GirdiSecici({ kaynak, dosya, url, onKaynak, onDosya, onUrl }) {
  return (
    <div>
      <div role="tablist" aria-label="Test girdisi" className="mb-3 flex gap-1 rounded-lg bg-soft p-1 sm:inline-flex">
        {SEKMELER.map(({ deger, ad, ikon: Ikon }) => {
          const secili = kaynak === deger
          return (
            <button
              key={deger}
              type="button"
              role="tab"
              id={'girdi-' + deger}
              aria-selected={secili}
              aria-controls="girdi-panel"
              onClick={() => onKaynak(deger)}
              className={
                'flex min-h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 text-sm font-medium transition-colors ' +
                (secili ? 'bg-surface text-ai-text shadow-sm' : 'text-muted hover:text-text')
              }
            >
              <Ikon size={15} aria-hidden="true" /> {ad}
            </button>
          )
        })}
      </div>
      <div id="girdi-panel" role="tabpanel" aria-labelledby={'girdi-' + kaynak}>
        {kaynak === 'url' ? <UrlGirdi url={url} onUrl={onUrl} /> : <UploadBox dosya={dosya} onDosya={onDosya} />}
      </div>
    </div>
  )
}
