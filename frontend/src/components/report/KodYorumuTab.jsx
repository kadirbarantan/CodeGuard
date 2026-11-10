// "Kod Yorumu" sekmesi: Kod Haritası'ndaki her birim (fonksiyon, sınıf, metot) için ne yaptığı,
// ne kadar riskli olduğu ve neden, kaç dalı / hata yolu olduğu ve testlerin onu ne kadar kapsadığı.
// Dal, hata yolu ve bağımlılık tree-sitter'dan (deterministik); açıklama ve risk gerekçesi LLM'den gelir.
import { useState } from 'react'
import { Code2, FileCode, GitBranch, Info, ListOrdered, Network, ShieldAlert, TriangleAlert } from 'lucide-react'
import { birimKapsamasi } from '../../mock/kodYorumu'

const RISK = {
  yuksek: { ad: 'Yüksek risk', kisa: 'Yüksek', sinif: 'bg-bad-bg text-bad-text', kutu: 'border-bad/40 bg-bad-bg text-bad-text' },
  orta: { ad: 'Orta risk', kisa: 'Orta', sinif: 'bg-warn/10 text-warn', kutu: 'border-warn/40 bg-warn/10 text-warn' },
  dusuk: { ad: 'Düşük risk', kisa: 'Düşük', sinif: 'bg-soft text-text-2', kutu: 'border-border bg-soft text-text-2' },
}

const kutu = 'rounded-xl border border-border bg-bg p-4'

function Sayac({ etiket, deger, vurgu }) {
  return (
    <div className={kutu}>
      <p className="text-sm text-muted">{etiket}</p>
      <p className={'mt-1 text-2xl font-semibold ' + (vurgu || 'text-text')}>{deger}</p>
    </div>
  )
}

function BirimKarti({ birim, dosya, onKoddaGoster }) {
  const r = RISK[birim.risk]
  const kapsama = birimKapsamasi(birim, dosya)
  const [bas, son] = birim.satir
  return (
    <li className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <span className="rounded-md bg-soft px-1.5 py-0.5 text-xs text-text-2">{birim.tur}</span>
        <code className="font-mono text-sm font-semibold text-text">{birim.imza}</code>
        <span className="text-xs text-muted">
          satır {bas}–{son}
        </span>
        <span className="ml-auto flex items-center gap-2">
          {kapsama != null && (
            <span className={'text-xs font-medium ' + (kapsama === 100 ? 'text-ok-text' : 'text-text-2')}>%{kapsama} kapsandı</span>
          )}
          <span className={'rounded-full px-2 py-0.5 text-xs font-semibold ' + r.sinif}>{r.ad}</span>
        </span>
      </div>

      <p className="mt-2 text-sm text-text-2">{birim.aciklama}</p>

      <ul className="mt-2.5 flex flex-wrap gap-1.5 text-xs text-text-2" aria-label="Kod Haritası bilgileri">
        <li className="flex items-center gap-1 rounded-md border border-border px-2 py-0.5">
          <GitBranch size={12} aria-hidden="true" /> {birim.dallar} dal
        </li>
        {birim.hataYollari.length > 0 && (
          <li className="flex items-center gap-1 rounded-md border border-border px-2 py-0.5">
            <TriangleAlert size={12} aria-hidden="true" /> Hata yolu: {birim.hataYollari.join(', ')}
          </li>
        )}
        {birim.bagimliliklar.length > 0 && (
          <li className="flex items-center gap-1 rounded-md border border-border px-2 py-0.5">
            <Network size={12} aria-hidden="true" /> Bağımlılık: <span className="font-mono">{birim.bagimliliklar.join(', ')}</span>
          </li>
        )}
        <li className="rounded-md border border-border px-2 py-0.5">{birim.testSayisi} test</li>
      </ul>

      {birim.riskNedeni && (
        <p className={'mt-3 flex gap-2 rounded-lg border px-3 py-2 text-sm ' + r.kutu}>
          <ShieldAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            <span className="font-semibold">Neden {r.kisa.toLocaleLowerCase('tr')} risk: </span>
            {birim.riskNedeni}
          </span>
        </p>
      )}

      <button
        type="button"
        onClick={() => onKoddaGoster({ dosya: dosya.yol, satir: bas })}
        className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg border border-border-strong bg-surface px-3 text-sm font-medium text-text hover:bg-soft"
      >
        <Code2 size={16} aria-hidden="true" /> Kodda göster
      </button>
    </li>
  )
}

export default function KodYorumuTab({ report, onKoddaGoster }) {
  const [filtre, setFiltre] = useState('hepsi')
  const y = report.kodYorumu
  if (!y) return <p className="text-sm text-muted">Bu test için kod yorumu yok.</p>

  // Rapordaki satır kapsamasını birimlerle eşleştirmek için dosyaları yola göre bul
  const raporDosyasi = Object.fromEntries((report.dosyalar || []).map((d) => [d.yol, d]))
  const tumBirimler = y.dosyalar.flatMap((d) => d.birimler)
  const say = (risk) => tumBirimler.filter((b) => b.risk === risk).length
  const filtreler = [
    ['hepsi', 'Tümü', tumBirimler.length],
    ['yuksek', 'Yüksek', say('yuksek')],
    ['orta', 'Orta', say('orta')],
    ['dusuk', 'Düşük', say('dusuk')],
  ]
  const gorunenDosyalar = y.dosyalar
    .map((d) => ({ ...d, birimler: filtre === 'hepsi' ? d.birimler : d.birimler.filter((b) => b.risk === filtre) }))
    .filter((d) => d.birimler.length > 0)

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-ai-bg px-4 py-3 text-sm text-ai-text">
        <p>{y.ozet}</p>
        <p className="mt-2 flex items-start gap-2">
          <ListOrdered size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          {y.testSirasi}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Sayac etiket="Yorumlanan dosya" deger={y.dosyalar.length} />
        <Sayac etiket="Birim" deger={tumBirimler.length} />
        <Sayac etiket="Dal" deger={tumBirimler.reduce((t, b) => t + b.dallar, 0)} />
        <Sayac etiket="Yüksek riskli birim" deger={say('yuksek')} vurgu="text-bad-text" />
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Riske göre süz">
        {filtreler.map(([k, ad, n]) => (
          <button
            key={k}
            type="button"
            aria-pressed={filtre === k}
            onClick={() => setFiltre(k)}
            className={
              'min-h-9 rounded-full border px-3 text-sm font-medium ' +
              (filtre === k ? 'border-accent bg-ai-bg text-ai-text' : 'border-border bg-surface text-text-2 hover:bg-soft')
            }
          >
            {ad} <span className="text-muted">{n}</span>
          </button>
        ))}
      </div>

      {gorunenDosyalar.map((d) => (
        <section key={d.yol} aria-labelledby={'yorum-' + d.yol} className={kutu}>
          <h3 id={'yorum-' + d.yol} className="flex items-center gap-2 font-mono text-sm font-semibold text-text">
            <FileCode size={16} className="shrink-0 text-ai-text" aria-hidden="true" />
            {d.yol}
          </h3>
          <p className="mt-1 text-sm text-text-2">{d.ozet}</p>
          <ul className="mt-3 space-y-3">
            {d.birimler.map((b) => (
              <BirimKarti key={b.ad} birim={b} dosya={raporDosyasi[d.yol] || { yol: d.yol }} onKoddaGoster={onKoddaGoster} />
            ))}
          </ul>
        </section>
      ))}

      {y.digerDil?.length > 0 && (
        <details className="rounded-xl border border-border bg-bg px-4 py-3 text-sm">
          <summary className="cursor-pointer font-medium text-text-2">Yorumlanmayan dosyalar ({y.digerDil.length})</summary>
          <ul className="mt-2 space-y-1">
            {y.digerDil.map((d) => (
              <li key={d.yol} className="text-text-2">
                <span className="font-mono">{d.yol}</span> <span className="text-muted">— {d.neden}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="flex gap-2 border-t border-border pt-4 text-xs text-muted">
        <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
        Dal, hata yolu ve bağımlılıklar Kod Haritası'ndan (tree-sitter) kesin olarak çıkarılır; açıklamalar ve risk gerekçeleri yapay
        zekâ tarafından yazılır. Planlayıcı ajan testlere yüksek riskli birimlerden başlar.
      </p>
    </div>
  )
}
