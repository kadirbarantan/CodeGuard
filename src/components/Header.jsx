import { FlaskConical } from 'lucide-react'
import ThemeToggle from './ThemeToggle'

// Üst menü: her ekranda görünür.
export default function Header({ user, onHome, onLogin, onRegister, onHistory, onLogout }) {
  // Ad Soyad'dan baş harfler
  const basHarfler = user
    ? user.ad
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((s) => s[0].toLocaleUpperCase('tr'))
        .join('')
    : ''

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <button
          type="button"
          onClick={onHome}
          className="flex min-h-10 items-center gap-2 rounded-lg font-semibold text-text"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-white">
            <FlaskConical size={18} />
          </span>
          [Platform Adı]
        </button>

        <nav className="flex flex-wrap items-center gap-2" aria-label="Ana menü">
          <ThemeToggle />
          {user ? (
            <>
              <button
                type="button"
                onClick={onHistory}
                className="min-h-10 rounded-lg px-3 text-sm font-medium text-text-2 hover:bg-soft"
              >
                Geçmiş Testlerim
              </button>
              <span
                title={user.ad}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-ai-bg text-sm font-semibold text-ai-text"
              >
                {basHarfler}
              </span>
              <button
                type="button"
                onClick={onLogout}
                className="min-h-10 rounded-lg px-3 text-sm font-medium text-text-2 hover:bg-soft"
              >
                Çıkış
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onLogin}
                className="min-h-10 rounded-lg px-3 text-sm font-medium text-text-2 hover:bg-soft"
              >
                Giriş Yap
              </button>
              <button
                type="button"
                onClick={onRegister}
                className="min-h-10 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:opacity-90"
              >
                Kayıt Ol
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
