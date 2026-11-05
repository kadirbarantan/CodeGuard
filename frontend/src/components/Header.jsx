import ThemeToggle from './ThemeToggle'

// Logo: kalkan içinde < > (lucide'de kalkan+kod ikonu olmadığı için inline SVG)
function Logo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M10 9.5 7.5 12l2.5 2.5" />
      <path d="M14 9.5 16.5 12 14 14.5" />
    </svg>
  )
}

// Üst menü: her ekranda görünür.
export default function Header({ user, onHome, onLogin, onRegister, onHistory, onProfile, onLogout }) {
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
    <header className="z-40 md:sticky md:top-0 border-b border-border/70 bg-surface/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={onHome}
          className="flex min-h-10 items-center gap-2 rounded-lg font-semibold text-text"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-2 text-white shadow-yumusak">
            <Logo />
          </span>
          <span className="text-xl font-bold tracking-tight text-text">
            CodeGuard<span className="text-ai-text">.</span>
          </span>
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
              <button
                type="button"
                onClick={onProfile}
                title="Profilim"
                aria-label={`Profilim (${user.ad})`}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-2 text-sm font-semibold text-white shadow-yumusak hover:ring-2 hover:ring-ai-border"
              >
                {basHarfler}
              </button>
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
                className="min-h-10 rounded-xl bg-accent px-4 text-sm font-semibold text-white shadow-yumusak transition-colors hover:bg-accent-2"
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
