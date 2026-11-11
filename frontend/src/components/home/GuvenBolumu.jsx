// "Kodun güvende mi?": kullanıcı kodunu yüklemeden önce kodun nerede çalıştığını, kimin gördüğünü
// ve neyin yapay zekâya gittiğini anlatan bölüm. Maddeler tasarım kararlarına dayanır:
// K5 (sandbox), K6 (salt okunur kaynak, hile önleme), K16–K17 (GitHub izinleri, bağlam), K21 (koddaki talimatlar).
import { FileSearch, KeyRound, Lock, MessageSquareWarning, ServerOff, UserRound } from 'lucide-react'

// Hallmark sadeleştirmesi (K25): her kartta tek kısa cümle; bölüm ~170 kelimeden ~110 kelimeye indi.
const MADDELER = [
  {
    ikon: ServerOff,
    baslik: 'Kapalı bir ortamda çalışır',
    metin: 'Testler dış ağa kapalı, her çalıştırmaya özel bir Docker kapsayıcısında koşar; iş bitince ortam silinir.',
  },
  {
    ikon: Lock,
    baslik: 'Kodun değiştirilmez',
    metin: 'Kaynak kod salt okunur bağlanır. Ajan bulduğu hatayı düzeltmez, olası hata olarak raporlar.',
  },
  {
    ikon: FileSearch,
    baslik: 'Yapay zekâya yalnızca gereken gider',
    metin: 'Modele projenin tamamı değil, Kod Haritası ve test edilen birimin kaynağı gönderilir.',
  },
  {
    ikon: KeyRound,
    baslik: "GitHub'a salt okunur erişim",
    metin: 'Yalnızca seçtiğin repolar okunur, giriş anahtarı saklanmaz; izni istediğin an kaldırabilirsin.',
  },
  {
    ikon: MessageSquareWarning,
    baslik: 'Koddaki yorumlar talimat sayılmaz',
    metin: 'Koddaki metinler ajana veri olarak gider. Assert içermeyen ya da hatayı yutan testler reddedilir.',
  },
  {
    ikon: UserRound,
    baslik: 'Raporun yalnızca sende',
    metin: 'Raporların ve içindeki kod yalnızca senin hesabında görünür.',
  },
]

export default function GuvenBolumu() {
  return (
    <section id="kod-guvenligi" aria-labelledby="kod-guvenligi-baslik" className="mx-auto w-full max-w-7xl scroll-mt-24 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h2 id="kod-guvenligi-baslik" className="text-3xl font-extrabold tracking-tight text-text sm:text-4xl">
          Kodun güvende mi?
        </h2>
        <p className="mt-3 text-text-2">Nerede çalışır, neye dokunulur, yapay zekâya ne gider?</p>
      </div>

      <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {MADDELER.map(({ ikon: Ikon, baslik, metin }) => (
          <li key={baslik} className="rounded-3xl border border-border bg-surface p-6 shadow-yumusak">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ai-bg text-ai-text">
              <Ikon size={20} aria-hidden="true" />
            </span>
            <h3 className="mt-4 text-lg font-bold text-text">{baslik}</h3>
            <p className="mt-2 text-sm leading-relaxed text-text-2">{metin}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
