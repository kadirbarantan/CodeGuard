// Test türü: Birim · Arayüz · Kullanılabilirlik · Erişilebilirlik segment butonları; birden fazlası seçilebilir.
// Varsayılan seçim yoktur: kullanıcı ne test edileceğini kendisi seçer.
// Kartın genişliğine göre 2 ya da 4 sütun (container query).
// URL ile testte birim testi yapılamaz (kaynak kod gerekir); Oyun ve Mobilde yalnızca birim testi.
import { Check } from 'lucide-react'
import { TUR_SIRASI, turAdi, turListesi, turSecilebilir } from '../../config/testStratejileri'

const SECENEKLER = {
  birim: { ad: 'Birim', aciklama: 'Fonksiyon ve sınıflar tek tek test edilir.' },
  arayuz: { ad: 'Arayüz', aciklama: 'Tarayıcıda tıklama, form ve gezinme akışları test edilir.' },
  kullanilabilirlik: {
    ad: 'Kullanılabilirlik',
    aciklama: 'Sitenin Z / F okuma desenine uygunluğu, renk uyumu ve genel kullanıcı deneyimi (UX) ölçülür.',
  },
  erisilebilirlik: {
    ad: 'Erişilebilirlik',
    aciklama:
      'Site WCAG 2.2 AA ölçütlerine göre denetlenir: renk kontrastı, klavyeyle gezinme, alternatif metin, form etiketleri ve ekran okuyucu uyumu.',
  },
}

export default function TurSecici({ tur, kaynak, sadeceBirim, onSec }) {
  const secili = turListesi(tur)

  function degistir(t) {
    onSec(secili.includes(t) ? secili.filter((x) => x !== t) : [...secili, t])
  }

  // Alttaki açıklama: hiç seçim yoksa yönlendirme, tek seçimde o türün açıklaması, çoklu seçimde birlikte yapılacağı
  const aciklama =
    secili.length === 0
      ? 'Bir ya da birden fazla test türü seç.'
      : secili.length === 1
        ? SECENEKLER[secili[0]].aciklama
        : `${turAdi(secili)} tek testte yapılır.${secili.length >= 3 ? ' Uygulama bir kez başlatılır ama test daha uzun sürer.' : ''}`

  return (
    <div className="@container">
      <span id="tur-etiket" className="mb-1 block text-sm font-medium text-text-2">
        Test türü <span className="font-normal text-muted">· birden fazla seçebilirsin</span>
      </span>
      <div
        role="group"
        aria-labelledby="tur-etiket"
        aria-describedby="tur-aciklama"
        className="grid grid-cols-2 gap-1 rounded-lg bg-soft p-1 @md:grid-cols-4"
      >
        {TUR_SIRASI.map((t) => {
          const s = SECENEKLER[t]
          const seciliMi = secili.includes(t)
          const kodGerekir = !turSecilebilir(t, kaynak)
          const pasif = kodGerekir || (sadeceBirim && t !== 'birim')
          return (
            <button
              key={t}
              type="button"
              role="checkbox"
              aria-checked={seciliMi}
              disabled={pasif}
              title={kodGerekir ? 'Birim testi için kaynak kod gerekir' : pasif ? 'Bu alanda yalnızca birim testi yapılır' : undefined}
              onClick={() => degistir(t)}
              className={`flex min-h-10 items-center justify-center gap-1.5 rounded-md px-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                seciliMi ? 'bg-surface text-ai-text shadow-sm' : 'text-muted hover:text-text'
              }`}
            >
              {seciliMi && <Check size={14} strokeWidth={3} aria-hidden="true" />}
              {s.ad}
            </button>
          )
        })}
      </div>
      <p id="tur-aciklama" className="mt-1.5 text-xs text-muted" aria-live="polite">
        {aciklama}
        {kaynak === 'url' && ' URL ile testte birim testi yapılamaz; kaynak kod gerekir.'}
      </p>
    </div>
  )
}
