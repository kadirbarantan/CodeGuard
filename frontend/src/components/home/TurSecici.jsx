// Test türü: Birim · Arayüz · İkisi · Kullanılabilirlik · Erişilebilirlik segment butonları.
// Kartın genişliğine göre 2, 3 ya da 5 sütun (container query).
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
  {
    deger: 'erisilebilirlik',
    ad: 'Erişilebilirlik',
    aciklama:
      'Site WCAG 2.2 AA ölçütlerine göre denetlenir: renk kontrastı, klavyeyle gezinme, alternatif metin, form etiketleri ve ekran okuyucu uyumu.',
  },
]

export default function TurSecici({ tur, kaynak, sadeceBirim, onSec }) {
  const secili = SECENEKLER.find((s) => s.deger === tur)
  return (
    <div className="@container">
      <span id="tur-etiket" className="mb-1 block text-sm font-medium text-text-2">Test türü</span>
      <div
        role="radiogroup"
        aria-labelledby="tur-etiket"
        aria-describedby="tur-aciklama"
        className="grid grid-cols-2 gap-1 rounded-lg bg-soft p-1 @md:grid-cols-3 @2xl:grid-cols-5"
      >
        {SECENEKLER.map((s, i) => {
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
              className={`${i === SECENEKLER.length - 1 ? 'col-span-2 @md:col-span-1 ' : ''}min-h-10 rounded-md px-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
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
