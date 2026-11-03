// Bağlam Çözümleyici (mock). Faz 2'de backend'in analiz düğümünde, repo arşivi indirildikten sonra
// tree-sitter ile çalışacak; kurallar aynı. LLM kullanılmaz (K9: deterministik).
//
// Hedef: kullanıcının seçtiği dosyalar (testler bunlara yazılır, coverage bunlarda ölçülür).
// Bağlam: hedefin çalışması için gereken dosyalar (otomatik eklenir, test edilmez).
import { haricMi } from '../components/home/dosyaOlcum'
import { arayuzVar, uxVar } from '../config/testStratejileri'

// Adım 1: her zaman eklenen manifest ve ayar dosyaları
const SABIT = [
  /(^|\/)requirements\.txt$/,
  /(^|\/)pyproject\.toml$/,
  /(^|\/)setup\.cfg$/,
  /(^|\/)conftest\.py$/,
  /(^|\/)pytest\.ini$/,
  /(^|\/)package(-lock)?\.json$/,
  /(^|\/)tsconfig\.json$/,
  /(^|\/)(vite|jest|babel)\.config\.\w+$/,
  /(^|\/)composer\.(json|lock)$/,
  /(^|\/)phpunit\.xml$/,
  /\.sln$/,
  /(^|\/)Directory\.Build\.props$/,
]

const klasor = (yol) => yol.split('/').slice(0, -1).join('/')

// C#: dosyanın ait olduğu proje klasörü (içinde .csproj olan en yakın üst klasör)
function csprojKlasoru(yol, csprojKlasorleri) {
  let k = klasor(yol)
  while (k) {
    if (csprojKlasorleri.has(k)) return k
    k = klasor(k)
  }
  return csprojKlasorleri.has('') ? '' : null
}

// → { baglam: [{ yol, neden }], tumRepo }
export function baglamCozumle(repo, hedefler, tur) {
  const dosyalar = repo.agac.filter((d) => !haricMi(d.yol))
  const hedefSet = new Set(hedefler)
  const baglam = new Map() // yol → neden
  const ekle = (yol, neden) => {
    if (!hedefSet.has(yol) && !baglam.has(yol) && dosyalar.some((d) => d.yol === yol)) baglam.set(yol, neden)
  }

  // Arayüz ve kullanılabilirlik testinde uygulamanın tamamı ayağa kalkmalı
  if (arayuzVar(tur) || uxVar(tur)) {
    for (const d of dosyalar) ekle(d.yol, 'Arayüz testi için uygulamanın tamamı gerekir')
    return { baglam: [...baglam].map(([yol, neden]) => ({ yol, neden })), tumRepo: true }
  }

  // Adım 1: sabit liste
  for (const d of dosyalar) {
    if (SABIT.some((r) => r.test(d.yol))) ekle(d.yol, 'Manifest / ayar dosyası')
  }

  // Adım 2: import grafiği, geçişli (yeni dosya kalmayana kadar)
  const kuyruk = [...hedefler]
  const gezildi = new Set()
  while (kuyruk.length) {
    const yol = kuyruk.shift()
    if (gezildi.has(yol)) continue
    gezildi.add(yol)
    for (const hedef of repo.importlar?.[yol] || []) {
      ekle(hedef, `${yol.split('/').pop()} import ediyor`)
      kuyruk.push(hedef)
    }
  }

  // Python: paket yolundaki __init__.py dosyaları
  const pyDosyalari = [...hedefler, ...baglam.keys()].filter((y) => y.endsWith('.py'))
  for (const y of pyDosyalari) {
    let k = klasor(y)
    while (k) {
      ekle(k + '/__init__.py', 'Python paketi (__init__.py)')
      k = klasor(k)
    }
  }

  // C#: derleme birimi projedir → hedefin projesinin tamamı + proje referansları
  const csprojKlasorleri = new Set(dosyalar.filter((d) => d.yol.endsWith('.csproj')).map((d) => klasor(d.yol)))
  const projeler = new Set()
  for (const y of hedefler.filter((h) => h.endsWith('.cs') || h.endsWith('.cshtml'))) {
    const p = csprojKlasoru(y, csprojKlasorleri)
    if (p !== null) projeler.add(p)
  }
  for (const p of [...projeler]) {
    for (const ref of repo.projeReferanslari?.[p] || []) projeler.add(ref)
  }
  for (const p of projeler) {
    const neden = hedefler.some((h) => csprojKlasoru(h, csprojKlasorleri) === p) ? 'Aynı C# projesi' : 'Proje referansı'
    for (const d of dosyalar) {
      if (csprojKlasoru(d.yol, csprojKlasorleri) === p) ekle(d.yol, neden)
    }
  }

  const sirali = [...baglam].map(([yol, neden]) => ({ yol, neden })).sort((a, b) => a.yol.localeCompare(b.yol, 'tr'))
  return { baglam: sirali, tumRepo: false }
}
