import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronRight, FileCode, Folder, FolderOpen } from 'lucide-react'

// Rapor > Kod sekmesindeki dosya gezgini: klasör ağacı ve "Sorunlu dosyalar" listesi.
// Backend dosyaları düz yol listesi olarak gönderir; ağacı burada kurarız.

// Dosyanın kapsanan ve test edilebilir satır sayısı (motor bağımlı satırlar hariç)
export function satirSayilari(d) {
  const { kapsanan, kapsanmayan } = d.satirlar
  return { kapsanan: kapsanan.length, toplam: kapsanan.length + kapsanmayan.length }
}

export function yuzde(kapsanan, toplam) {
  return toplam ? Math.round((kapsanan / toplam) * 100) : 100
}

export function dosyaCoverage(d) {
  const s = satirSayilari(d)
  return yuzde(s.kapsanan, s.toplam)
}

// "app/core/config.py" -> ["app", "app/core"]
function ataKlasorler(yol) {
  const parcalar = yol.split('/').slice(0, -1)
  return parcalar.map((_, i) => parcalar.slice(0, i + 1).join('/'))
}

// Düz yol listesinden ağaç kurar. Klasör coverage'ı satır ağırlıklıdır:
// alt dosyaların kapsanan satır toplamı / test edilebilir satır toplamı.
function agacKur(dosyalar, hatalar) {
  const kok = { ad: '', yol: '', klasorler: {}, dosyalar: [] }
  for (const d of dosyalar) {
    const parcalar = d.yol.split('/')
    let dugum = kok
    parcalar.slice(0, -1).forEach((ad, i) => {
      if (!dugum.klasorler[ad]) {
        dugum.klasorler[ad] = { ad, yol: parcalar.slice(0, i + 1).join('/'), klasorler: {}, dosyalar: [] }
      }
      dugum = dugum.klasorler[ad]
    })
    dugum.dosyalar.push(d)
  }

  function hesapla(k) {
    let kapsanan = 0
    let toplam = 0
    let hata = 0
    for (const alt of Object.values(k.klasorler)) {
      hesapla(alt)
      kapsanan += alt.kapsanan
      toplam += alt.toplam
      hata += alt.hata
    }
    for (const d of k.dosyalar) {
      const s = satirSayilari(d)
      kapsanan += s.kapsanan
      toplam += s.toplam
      hata += hatalar[d.yol]?.length || 0
    }
    Object.assign(k, { kapsanan, toplam, hata })
  }
  hesapla(kok)
  return kok
}

// Açılışta açık gelecek klasörler: içinde hata ya da %100 altı coverage olanlar
function sorunluKlasorler(k, sonuc = new Set()) {
  for (const alt of Object.values(k.klasorler)) {
    if (alt.hata > 0 || alt.kapsanan < alt.toplam) sonuc.add(alt.yol)
    sorunluKlasorler(alt, sonuc)
  }
  return sonuc
}

const alfabetik = (a, b) => a.localeCompare(b, 'tr')

// Tek dosya satırı (ağaçta ve sorunlu listede ortak)
export function DosyaSatiri({ d, etiket, hataSayisi, aktif, girinti = 0, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={aktif ? 'true' : undefined}
      title={d.yol}
      style={{ paddingLeft: 12 + girinti }}
      className={
        'flex min-h-9 w-full items-center gap-2 rounded-lg pr-3 text-left text-sm ' +
        (aktif ? 'bg-ai-bg text-ai-text' : 'text-text-2 hover:bg-soft')
      }
    >
      <FileCode size={15} className="shrink-0 text-muted" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate font-mono">{etiket}</span>
      {hataSayisi > 0 && (
        <span
          className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-bad px-1.5 text-xs font-semibold text-white"
          aria-label={`${hataSayisi} olası hata`}
        >
          {hataSayisi}
        </span>
      )}
      <span className="shrink-0 text-xs">%{dosyaCoverage(d)}</span>
    </button>
  )
}

// sadeceSorunlu: yalnızca hatası olan ya da %100 altı dosyalar, klasör yapısı korunarak gösterilir
export default function FileTree({ dosyalar, hatalar, aktifYol, arama, sadeceSorunlu = false, onSec }) {
  const kok = useMemo(() => agacKur(dosyalar, hatalar), [dosyalar, hatalar])
  const [acik, setAcik] = useState(() => sorunluKlasorler(kok))

  const listeRef = useRef(null)

  // Seçili dosyanın klasörleri her zaman açık olsun ve dosya listede görünür olsun ("Kodda göster" dahil)
  useEffect(() => {
    if (!aktifYol) return
    setAcik((onceki) => {
      const yeni = new Set(onceki)
      ataKlasorler(aktifYol).forEach((y) => yeni.add(y))
      return yeni
    })
    const z = setTimeout(() => {
      listeRef.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest' })
    }, 0)
    return () => clearTimeout(z)
  }, [aktifYol])

  const q = arama.trim().toLocaleLowerCase('tr')
  const sorunluMu = (d) => (hatalar[d.yol]?.length || 0) > 0 || dosyaCoverage(d) < 100
  const eslesir = (d) =>
    (!q || d.yol.toLocaleLowerCase('tr').includes(q)) && (!sadeceSorunlu || sorunluMu(d))
  const klasorEslesir = (k) => k.dosyalar.some(eslesir) || Object.values(k.klasorler).some(klasorEslesir)

  function degistir(yol) {
    setAcik((onceki) => {
      const yeni = new Set(onceki)
      if (yeni.has(yol)) yeni.delete(yol)
      else yeni.add(yol)
      return yeni
    })
  }

  // Ağacı satır listesine çevirir (önce klasörler, sonra dosyalar; ikisi de alfabetik)
  function satirlar(k, derinlik) {
    const sonuc = []
    const klasorler = Object.values(k.klasorler)
      .filter(klasorEslesir)
      .sort((a, b) => alfabetik(a.ad, b.ad))
    for (const alt of klasorler) {
      const acikMi = q || sadeceSorunlu ? true : acik.has(alt.yol) // arama ya da sorunlu görünümde her şey açık
      sonuc.push(
        <li key={'k:' + alt.yol}>
          <button
            type="button"
            onClick={() => degistir(alt.yol)}
            aria-expanded={acikMi}
            style={{ paddingLeft: 4 + derinlik * 16 }}
            className="flex min-h-9 w-full items-center gap-1.5 rounded-lg pr-3 text-left text-sm text-text hover:bg-soft"
          >
            <ChevronRight
              size={14}
              aria-hidden="true"
              className={'shrink-0 text-muted transition-transform ' + (acikMi ? 'rotate-90' : '')}
            />
            {acikMi ? (
              <FolderOpen size={15} className="shrink-0 text-ai-text" aria-hidden="true" />
            ) : (
              <Folder size={15} className="shrink-0 text-ai-text" aria-hidden="true" />
            )}
            <span className="min-w-0 flex-1 truncate font-mono font-medium">{alt.ad}/</span>
            {alt.hata > 0 && (
              <span
                className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-bad px-1.5 text-xs font-semibold text-white"
                aria-label={`${alt.hata} olası hata`}
              >
                {alt.hata}
              </span>
            )}
            <span className="shrink-0 text-xs text-muted">%{yuzde(alt.kapsanan, alt.toplam)}</span>
          </button>
        </li>,
      )
      if (acikMi) sonuc.push(...satirlar(alt, derinlik + 1))
    }
    const dosyaListesi = k.dosyalar.filter(eslesir).sort((a, b) => alfabetik(a.yol, b.yol))
    for (const d of dosyaListesi) {
      sonuc.push(
        <li key={'d:' + d.yol}>
          <DosyaSatiri
            d={d}
            etiket={d.yol.split('/').pop()}
            hataSayisi={hatalar[d.yol]?.length || 0}
            aktif={d.yol === aktifYol}
            girinti={derinlik * 16 + 6}
            onClick={() => onSec(d.yol)}
          />
        </li>,
      )
    }
    return sonuc
  }

  const liste = satirlar(kok, 0)
  if (liste.length === 0) {
    return (
      <p className="px-3 py-2 text-sm text-muted">
        {sadeceSorunlu && !q ? 'Sorunlu dosya yok.' : 'Eşleşen dosya yok.'}
      </p>
    )
  }
  return (
    <ul ref={listeRef} className="space-y-0.5" aria-label="Dosya ağacı">
      {liste}
    </ul>
  )
}
