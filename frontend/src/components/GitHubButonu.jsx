import { GitBranch, Loader2 } from 'lucide-react'

// GitHub butonu. Kullanıldığı yerler:
// - AuthModal: giriş ve kayıt görünümlerinde, e-posta formunun üstünde ("GitHub ile Devam Et", tam genişlik)
// - GitHubGirdi: GitHub sekmesindeki bağlanma kartları (metin ve genişlik dışarıdan verilir)
// Koyu lacivert (panel rengi) zemin: mor ana butondan ayrışır, gece modunda kenarlıkla seçilir.
export default function GitHubButonu({ metin = 'GitHub ile Devam Et', onClick, bekliyor, disabled, className = 'w-full' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || bekliyor}
      aria-busy={bekliyor ? 'true' : 'false'}
      className={
        'flex min-h-11 items-center justify-center gap-2.5 rounded-lg border border-border-strong bg-panel px-4 text-sm font-medium text-on-panel transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60 ' +
        className
      }
    >
      {bekliyor ? (
        <Loader2 size={18} className="animate-spin" aria-hidden="true" />
      ) : (
        <GitBranch size={18} aria-hidden="true" />
      )}
      {bekliyor ? 'GitHub bekleniyor…' : metin}
    </button>
  )
}

// "veya e-postayla" ayırıcı çizgi
export function Ayirici({ metin = 'veya e-postayla' }) {
  return (
    <div className="flex items-center gap-3 text-xs text-muted" aria-hidden="true">
      <span className="h-px flex-1 bg-border" />
      {metin}
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}
