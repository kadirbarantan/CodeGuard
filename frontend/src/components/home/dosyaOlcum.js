// Yükleme ölçümü: klasör/zip için dosya sayısı ve boyut hesabı, gereksiz klasörler hariç.
export const MAX_BOYUT = 5 * 1024 * 1024 // 5 MB
export const MAX_DOSYA = 200
const HARIC = ['node_modules', 'bin', 'obj', 'venv', '.git']

// Dosya yolundaki klasörlerden biri hariç listesinde mi?
function haricMi(yol) {
  return yol.split('/').slice(0, -1).some((p) => HARIC.includes(p))
}

// <input type="file"> ile seçilenleri ölç → { ad, sayi, boyut }
export function inputtanOlc(liste) {
  const dosyalar = Array.from(liste)
  if (dosyalar.length === 0) return { ad: '', sayi: 0, boyut: 0 }
  const yol = dosyalar[0].webkitRelativePath
  const gecerli = yol ? dosyalar.filter((f) => !haricMi(f.webkitRelativePath)) : dosyalar
  return {
    ad: yol ? yol.split('/')[0] : dosyalar[0].name,
    sayi: gecerli.length,
    boyut: gecerli.reduce((t, f) => t + f.size, 0),
  }
}

// Sürükle-bırak ile gelen klasör/dosyaları gezerek ölç
async function gez(entry, sonuc, kok) {
  if (entry.isFile) {
    const f = await new Promise((res, rej) => entry.file(res, rej))
    sonuc.sayi++
    sonuc.boyut += f.size
  } else if (kok || !HARIC.includes(entry.name)) {
    const okuyucu = entry.createReader()
    for (;;) {
      const parca = await new Promise((res, rej) => okuyucu.readEntries(res, rej))
      if (parca.length === 0) break
      for (const e of parca) await gez(e, sonuc, false)
    }
  }
}

export async function birakmadanOlc(dataTransfer) {
  // entry'ler await'ten önce, eşzamanlı alınmalı
  const girdiler = Array.from(dataTransfer.items)
    .map((i) => i.webkitGetAsEntry && i.webkitGetAsEntry())
    .filter(Boolean)
  const sonuc = { ad: girdiler.length === 1 ? girdiler[0].name : `${girdiler.length} öğe`, sayi: 0, boyut: 0 }
  for (const g of girdiler) await gez(g, sonuc, true)
  return sonuc
}

// 1,2 MB / 340 KB gibi okunur boyut
export function boyutYaz(b) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}
