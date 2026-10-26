// Test türü: Birim · Arayüz · İkisi şeklinde 3'lü segment buton.
const SECENEKLER = [
  { deger: 'birim', ad: 'Birim' },
  { deger: 'arayuz', ad: 'Arayüz' },
  { deger: 'ikisi', ad: 'İkisi' },
]

export default function TurSecici({ tur, sadeceBirim, onSec }) {
  return (
    <div>
      <span id="tur-etiket" className="mb-1 block text-sm font-medium text-text-2">Test türü</span>
      <div role="radiogroup" aria-labelledby="tur-etiket" className="flex gap-1 rounded-lg bg-soft p-1">
        {SECENEKLER.map((s) => {
          const secili = tur === s.deger
          const pasif = sadeceBirim && s.deger !== 'birim'
          return (
            <button
              key={s.deger}
              type="button"
              role="radio"
              aria-checked={secili}
              disabled={pasif}
              onClick={() => onSec(s.deger)}
              className={`min-h-10 flex-1 rounded-md text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                secili ? 'bg-surface text-ai-text shadow-sm' : 'text-muted hover:text-text'
              }`}
            >
              {s.ad}
            </button>
          )
        })}
      </div>
    </div>
  )
}
