// Test girdisi: "Kaynak Kod Yükle", "GitHub" (K17) ya da "URL Gir" sekmesi.
import { GitBranch, Globe, Upload } from 'lucide-react'
import UploadBox from './UploadBox'
import UrlGirdi from './UrlGirdi'
import GitHubGirdi from './GitHubGirdi'

const SEKMELER = [
  { deger: 'kod', ad: 'Kaynak Kod Yükle', ikon: Upload },
  { deger: 'github', ad: 'GitHub', ikon: GitBranch },
  { deger: 'url', ad: 'URL Gir', ikon: Globe },
]

// github: GitHub sekmesindeki seçim (repo, dal, secilenler, baglam...); diğer props GitHubGirdi'ye geçer
export default function GirdiSecici({ kaynak, dosya, url, onKaynak, onDosya, onUrl, github, githubProps }) {
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
                'flex min-h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-md px-2 text-sm font-medium transition-colors sm:px-4 ' +
                (secili ? 'bg-surface text-ai-text shadow-sm' : 'text-muted hover:text-text')
              }
            >
              {/* 375 px'te üç sekme sığsın: ikonlar dar ekranda gizli */}
              <Ikon size={15} aria-hidden="true" className="hidden sm:block" /> {ad}
            </button>
          )
        })}
      </div>
      <div id="girdi-panel" role="tabpanel" aria-labelledby={'girdi-' + kaynak}>
        {kaynak === 'url' ? (
          <UrlGirdi url={url} onUrl={onUrl} />
        ) : kaynak === 'github' ? (
          <GitHubGirdi github={github} {...githubProps} />
        ) : (
          <UploadBox dosya={dosya} onDosya={onDosya} />
        )}
      </div>
    </div>
  )
}
