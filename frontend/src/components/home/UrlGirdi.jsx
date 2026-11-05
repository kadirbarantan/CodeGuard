// URL ile test: kod yüklemeden canlı sitenin adresi girilir (arayüz ve kullanılabilirlik testi).
import { useState } from 'react'
import { CircleCheck, Globe, TriangleAlert } from 'lucide-react'
import { urlAdi, urlGecerli } from '../../config/testStratejileri'

export default function UrlGirdi({ url, onUrl }) {
  const [dokunuldu, setDokunuldu] = useState(false)
  const gecerli = urlGecerli(url)
  const hataGoster = dokunuldu && url.trim() !== '' && !gecerli

  return (
    <div className="rounded-2xl border-2 border-dashed border-ai-border bg-gradient-to-b from-soft/60 to-surface px-4 py-9 text-center">
      <Globe size={44} className="mx-auto text-ai-text" aria-hidden="true" />
      <p className="mt-3 text-lg font-semibold">Canlı sitenin adresini gir</p>
      <p className="mt-1 text-sm text-muted">Kod yüklemeden arayüz ve kullanılabilirlik testi yapılır.</p>

      <label htmlFor="site-url" className="sr-only">Site adresi</label>
      <input
        id="site-url"
        type="url"
        inputMode="url"
        autoComplete="url"
        spellCheck={false}
        placeholder="https://ornek-site.com"
        value={url}
        onChange={(e) => onUrl(e.target.value)}
        onBlur={() => setDokunuldu(true)}
        aria-invalid={hataGoster}
        aria-describedby="site-url-durum"
        className="mx-auto mt-5 block min-h-12 w-full max-w-xl rounded-lg border border-border-strong bg-surface px-4 font-mono text-sm text-text outline-none focus:border-accent"
      />

      <div id="site-url-durum" className="mt-3 min-h-5 text-sm">
        {gecerli && (
          <p className="flex items-center justify-center gap-2 text-ok-text">
            <CircleCheck size={16} aria-hidden="true" />
            <span className="font-mono font-medium">{urlAdi(url)}</span> test edilecek
          </p>
        )}
        {hataGoster && (
          <p role="alert" className="flex items-center justify-center gap-2 text-bad-text">
            <TriangleAlert size={16} aria-hidden="true" /> Adres http:// ya da https:// ile başlamalı.
          </p>
        )}
      </div>
    </div>
  )
}
