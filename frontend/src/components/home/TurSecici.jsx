// Test türü: Birim · Arayüz · İkisi · Kullanılabilirlik segment butonları.
// URL ile testte birim testi yapılamaz (kaynak kod gerekir); bu seçenekler pasif olur.
import { turSecilebilir } from '../../config/testStratejileri'

const SECENEKLER = [
  { deger: 'birim', ad: 'Birim', aciklama: 'Fonksiyon ve sınıflar tek tek test edilir.' },
  { deger: 'arayuz', ad: 'Arayüz', aciklama: 'Tarayıcıda tıklama, form ve gezinme akışları test edilir.' },
  { deger: 'ikisi', ad: 'İkisi', aciklama: 'Birim ve arayüz testleri birlikte yapılır.' },
  {
    deger: 'kullanilabilirlik',
    ad: 'Kullanılabilirlik',
    aciklama: 'Sitenin Z / F okuma desenine uygunluğu, renk uyumu ve genel kullanıcı deneyimi (UX) ölçülür.',
  },
]

export default function TurSecici({ tur, kaynak, sadeceBirim, onSec }) {
  const secili = SECENEKLER.find((s) => s.deger === tur)
  return (
    <div>
      <span id="tur-etiket" className="mb-1 block text-sm font-medium text-text-2">Test türü</span>
      <div
        role="radiogroup"
        aria-labelledby="tur-etiket"
        aria-describedby="tur-aciklama"
        className="grid grid-cols-2 gap-1 rounded-lg bg-soft p-1 sm:grid-cols-4"
      >
        {SECENEKLER.map((s) => {
          const seciliMi = tur === s.deger
          const kodGerekir = !turSecilebilir(s.deger, kaynak)
          const pasif = kodGerekir || (sadeceBirim && s.deger !== 'birim')
          return (
            <button
              key={s.deger}
              type="button"
              role="radio"
              aria-checked={seciliMi}
              disabled={pasif}
              title={kodGerekir ? 'Birim testi için kaynak kod gerekir' : undefined}
              onClick={() => onSec(s.deger)}
              className={`min-h-10 rounded-md px-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                seciliMi ? 'bg-surface text-ai-text shadow-sm' : 'text-muted hover:text-text'
              }`}
            >
              {s.ad}
            </button>
          )
        })}
      </div>
      <p id="tur-aciklama" className="mt-1.5 text-xs text-muted">
        {secili?.aciklama}
        {kaynak === 'url' && ' URL ile testte birim testi yapılamaz; kaynak kod gerekir.'}
      </p>
    </div>
  )
}
