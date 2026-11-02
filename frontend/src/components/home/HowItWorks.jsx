// Nasıl çalışır: 4 numaralı adım kartı.
import { FileUp, SlidersHorizontal, Bot, FileText } from 'lucide-react'

const ADIMLAR = [
  { no: '01', ikon: FileUp, baslik: 'Kodunu yükle ya da URL gir', aciklama: 'Projeni klasör, dosya ya da .zip olarak ekle; ya da canlı sitenin adresini yaz.' },
  { no: '02', ikon: SlidersHorizontal, baslik: 'Test türünü seç', aciklama: 'Alanını ve dilini belirle; birim, arayüz ya da kullanılabilirlik testini seç.' },
  { no: '03', ikon: Bot, baslik: 'Ajanlar test etsin', aciklama: 'Ajanlar testleri yazar, çalıştırır, eksikleri tamamlar; okuma desenini ve renk uyumunu ölçer.' },
  { no: '04', ikon: FileText, baslik: 'Raporunu al', aciklama: 'Kapsama, hatalar, UX bulguları ve üretilen testler tek raporda.' },
]

export default function HowItWorks() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12">
      <h2 className="mb-6 text-center text-2xl font-bold">Nasıl çalışır?</h2>
      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ADIMLAR.map(({ no, ikon: Ikon, baslik, aciklama }) => (
          <li key={no} className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-ai-bg text-accent">
                <Ikon size={20} />
              </span>
              <span className="font-mono text-sm text-muted">{no}</span>
            </div>
            <h3 className="mt-4 font-semibold">{baslik}</h3>
            <p className="mt-1 text-sm text-muted">{aciklama}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
