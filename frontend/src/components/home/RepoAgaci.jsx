// GitHub reposunun klasör ağacı: onay kutularıyla test edilecek dosya ve klasörler seçilir.
// Seçilen dosyalar "hedef"; Bağlam Çözümleyici'nin eklediği dosyalar gri "otomatik" etiketiyle görünür.
import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronRight, FileCode, Folder, FolderOpen } from 'lucide-react'
import { boyutYaz } from './dosyaOlcum'

const alfabetik = (a, b) => a.localeCompare(b, 'tr')

// Düz yol listesinden ağaç: { ad, yol, klasorler: {}, dosyalar: [], tumDosyalar: [yol] }
function agacKur(dosyalar) {
  const kok = { ad: '', yol: '', klasorler: {}, dosyalar: [], tumDosyalar: [] }
  for (const d of dosyalar) {
    const parcalar = d.yol.split('/')
    let dugum = kok
    kok.tumDosyalar.push(d.yol)
    parcalar.slice(0, -1).forEach((ad, i) => {
      if (!dugum.klasorler[ad]) {
        dugum.klasorler[ad] = { ad, yol: parcalar.slice(0, i + 1).join('/'), klasorler: {}, dosyalar: [], tumDosyalar: [] }
      }
      dugum = dugum.klasorler[ad]
      dugum.tumDosyalar.push(d.yol)
    })
    dugum.dosyalar.push(d)
  }
  return kok
}

// Kısmi seçimde "-" görünen onay kutusu
function OnayKutusu({ durum, etiket, onChange }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = durum === 'kismi'
  }, [durum])
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={durum === 'tam'}
      onChange={onChange}
      aria-label={etiket}
      className="h-4 w-4 shrink-0 cursor-pointer accent-[var(--accent)]"
    />
  )
}

export default function RepoAgaci({ dosyalar, secilenler, baglam, onDegis }) {
  const kok = useMemo(() => agacKur(dosyalar), [dosyalar])
  // Açılışta üst düzey klasörler açık
  const [acik, setAcik] = useState(() => new Set(Object.keys(kok.klasorler)))
  const secili = useMemo(() => new Set(secilenler), [secilenler])
  const boyutlar = useMemo(() => Object.fromEntries(dosyalar.map((d) => [d.yol, d.boyut])), [dosyalar])

  function klasorDurumu(k) {
    const n = k.tumDosyalar.filter((y) => secili.has(y)).length
    return n === 0 ? 'yok' : n === k.tumDosyalar.length ? 'tam' : 'kismi'
  }

  // Klasör: tamamı seçiliyse hepsini kaldır, değilse hepsini seç
  function klasorDegistir(k) {
    const yeni = new Set(secili)
    if (klasorDurumu(k) === 'tam') k.tumDosyalar.forEach((y) => yeni.delete(y))
    else k.tumDosyalar.forEach((y) => yeni.add(y))
    onDegis([...yeni])
  }

  function dosyaDegistir(yol) {
    const yeni = new Set(secili)
    if (yeni.has(yol)) yeni.delete(yol)
    else yeni.add(yol)
    onDegis([...yeni])
  }

  function acKapat(yol) {
    setAcik((o) => {
      const y = new Set(o)
      if (y.has(yol)) y.delete(yol)
      else y.add(yol)
      return y
    })
  }

  function satirlar(k, derinlik) {
    const sonuc = []
    const girinti = { paddingLeft: 4 + derinlik * 18 }
    for (const alt of Object.values(k.klasorler).sort((a, b) => alfabetik(a.ad, b.ad))) {
      const acikMi = acik.has(alt.yol)
      const durum = klasorDurumu(alt)
      sonuc.push(
        <li key={'k:' + alt.yol} style={girinti} className="flex min-h-9 items-center gap-1.5 rounded-lg pr-3 hover:bg-soft">
          <button
            type="button"
            onClick={() => acKapat(alt.yol)}
            aria-expanded={acikMi}
            aria-label={`${alt.ad} klasörünü ${acikMi ? 'kapat' : 'aç'}`}
            className="flex h-7 w-6 shrink-0 items-center justify-center rounded text-muted"
          >
            <ChevronRight size={14} aria-hidden="true" className={'transition-transform ' + (acikMi ? 'rotate-90' : '')} />
          </button>
          <OnayKutusu durum={durum} etiket={`${alt.yol}/ klasörünü seç`} onChange={() => klasorDegistir(alt)} />
          <button type="button" onClick={() => acKapat(alt.yol)} tabIndex={-1} className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-sm text-text">
            {acikMi ? (
              <FolderOpen size={15} className="shrink-0 text-ai-text" aria-hidden="true" />
            ) : (
              <Folder size={15} className="shrink-0 text-ai-text" aria-hidden="true" />
            )}
            <span className="truncate font-mono font-medium">{alt.ad}/</span>
          </button>
          <span className="shrink-0 text-xs text-muted">{alt.tumDosyalar.length} dosya</span>
        </li>,
      )
      if (acikMi) sonuc.push(...satirlar(alt, derinlik + 1))
    }
    for (const d of [...k.dosyalar].sort((a, b) => alfabetik(a.yol, b.yol))) {
      const neden = baglam?.get(d.yol)
      sonuc.push(
        <li key={'d:' + d.yol} style={{ paddingLeft: 4 + derinlik * 18 + 30 }} className="rounded-lg pr-3 hover:bg-soft">
          <label className="flex min-h-9 cursor-pointer items-center gap-2 text-sm">
            <OnayKutusu durum={secili.has(d.yol) ? 'tam' : 'yok'} etiket={`${d.yol} dosyasını seç`} onChange={() => dosyaDegistir(d.yol)} />
            <FileCode size={15} className="shrink-0 text-muted" aria-hidden="true" />
            <span className={'min-w-0 flex-1 truncate font-mono ' + (secili.has(d.yol) ? 'text-text' : 'text-text-2')}>
              {d.yol.split('/').pop()}
            </span>
            {neden && (
              <span title={neden} className="shrink-0 rounded-full bg-soft px-2 py-0.5 text-[11px] font-medium text-muted ring-1 ring-border-strong">
                otomatik
              </span>
            )}
            <span className="shrink-0 text-xs text-muted">{boyutYaz(boyutlar[d.yol])}</span>
          </label>
        </li>,
      )
    }
    return sonuc
  }

  return (
    <ul className="space-y-0.5" aria-label="Repo dosya ağacı">
      {satirlar(kok, 0)}
    </ul>
  )
}
