// Test sonucu durumları: Geçti · Kaldı · Çalıştırılamadı.
// "Kaldı": test koştu ve beklenen davranış görülmedi; ajan bunu olası hata olarak işaretler (K6).
// "Çalıştırılamadı": test ortam yüzünden hiç koşamadı (dış servise ağ kapalı, süre aşımı vb.).
// Bu bir hata bulgusu değildir: kapsamaya ve olası hatalara sayılmaz.
import { CircleSlash } from 'lucide-react'

export const TEST_DURUMLARI = {
  gecti: { ad: 'Geçti', kucuk: 'geçti', rozet: 'bg-ok-bg text-ok-text', metin: 'text-ok-text' },
  kaldi: { ad: 'Kaldı', kucuk: 'kaldı', rozet: 'bg-bad-bg text-bad-text', metin: 'text-bad-text' },
  calistirilamadi: {
    ad: 'Çalıştırılamadı',
    kucuk: 'çalıştırılamadı',
    rozet: 'bg-soft text-text-2 ring-1 ring-inset ring-border-strong',
    metin: 'text-text-2',
  },
}

export const CALISTIRILAMADI_ACIKLAMA =
  'Çalıştırılamadı: test, ortam yüzünden hiç koşamadı (ör. dış servise ağ kapalı, süre aşımı). Bu bir hata bulgusu değildir; kapsamaya ve olası hatalara sayılmaz.'

// Test dosyalarındaki sonuçların toplamı: { gecti, kaldi, calistirilamadi }
export function testToplami(dosyalar = []) {
  return dosyalar.reduce(
    (t, d) => ({
      gecti: t.gecti + (d.sonuclar?.gecti || 0),
      kaldi: t.kaldi + (d.sonuclar?.kaldi || 0),
      calistirilamadi: t.calistirilamadi + (d.sonuclar?.calistirilamadi || 0),
    }),
    { gecti: 0, kaldi: 0, calistirilamadi: 0 },
  )
}

// Tek bir testin ya da akışın durum rozeti
export function DurumRozeti({ durum }) {
  const d = TEST_DURUMLARI[durum] || TEST_DURUMLARI.gecti
  return (
    <span className={'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ' + d.rozet}>
      {durum === 'calistirilamadi' && <CircleSlash size={12} aria-hidden="true" />}
      {d.ad}
    </span>
  )
}

// "16 geçti · 2 kaldı · 1 çalıştırılamadı" (sıfır olan kaldı / çalıştırılamadı yazılmaz)
export function SonucOzeti({ toplam, className = '' }) {
  const parcalar = Object.entries(TEST_DURUMLARI).filter(([k]) => k === 'gecti' || (toplam?.[k] || 0) > 0)
  return (
    <span className={className}>
      {parcalar.map(([k, d], i) => (
        <span key={k}>
          {i > 0 && <span className="text-muted"> · </span>}
          <span className={d.metin}>
            {toplam?.[k] || 0} {d.kucuk}
          </span>
        </span>
      ))}
    </span>
  )
}
