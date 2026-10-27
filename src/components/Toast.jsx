import { useEffect } from 'react'
import { Info } from 'lucide-react'

// Sağ altta kısa süre görünen bildirim. message boşsa görünmez.
export default function Toast({ message, onClose, sure = 3000 }) {
  useEffect(() => {
    if (!message) return
    const z = setTimeout(onClose, sure)
    return () => clearTimeout(z)
  }, [message, onClose, sure])

  if (!message) return null
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 left-4 z-50 flex items-start gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text shadow-xl sm:left-auto sm:max-w-sm"
    >
      <Info size={18} className="mt-0.5 shrink-0 text-ai-text" />
      {message}
    </div>
  )
}
