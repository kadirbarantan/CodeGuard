import { useState } from 'react'
import { Moon, Sun } from 'lucide-react'

// Gece/gündüz düğmesi. Tercih localStorage'da 'tema' anahtarıyla saklanır.
export default function ThemeToggle() {
  // İlk değer, index.html'deki script'in html'e yazdığı duruma göre
  const [koyu, setKoyu] = useState(
    () => document.documentElement.getAttribute('data-theme') === 'dark',
  )

  function degistir() {
    const yeni = !koyu
    if (yeni) document.documentElement.setAttribute('data-theme', 'dark')
    else document.documentElement.removeAttribute('data-theme')
    localStorage.setItem('tema', yeni ? 'dark' : 'light')
    setKoyu(yeni)
  }

  return (
    <button
      type="button"
      onClick={degistir}
      aria-label={koyu ? 'Gündüz moduna geç' : 'Gece moduna geç'}
      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border-strong bg-surface text-text-2 transition-colors hover:bg-soft"
    >
      {koyu ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
