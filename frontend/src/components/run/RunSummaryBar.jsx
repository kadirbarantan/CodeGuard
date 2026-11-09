// Çalışma ekranı üst satırı (yapışkan): dosya adı · seçim özeti · tur · Durdur
import { useEffect, useRef, useState } from 'react'
import { ALANLAR, DILLER, TURLER, urlAdi, uxVar } from '../../config/testStratejileri'

export default function RunSummaryBar({ config, round, maxRounds, onStop }) {
  const urlModu = config.kaynak === 'url'
  const alan = config.alan === 'diger' && config.digerMetin.trim() ? config.digerMetin.trim() : ALANLAR[config.alan].ad
  const ozet = [alan, urlModu ? 'URL' : DILLER[config.dil], TURLER[config.tur]].join(' · ')
  const ad = urlModu ? urlAdi(config.url) : config.kaynak === 'github' ? config.github?.repo : config.dosya?.ad
  // Yanlışlıkla durdurmayı önlemek için iki adımlı: önce sor, sonra durdur
  const [soruyor, setSoruyor] = useState(false)
  const vazgecRef = useRef(null)
  useEffect(() => {
    if (soruyor) vazgecRef.current?.focus()
  }, [soruyor])

  return (
    <div className="sticky top-0 z-30 -mx-4 px-4 py-2 md:top-[65px]">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-3xl border border-border bg-surface shadow-yumusak px-5 py-3 shadow-sm">
        <span className="min-w-0 truncate font-mono text-sm font-semibold text-text">{ad}</span>
        <span className="text-muted">·</span>
        <span className="text-sm text-text-2">{ozet}</span>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-3">
          <span className="flex items-center gap-2 whitespace-nowrap text-sm font-medium text-ai-text">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-accent" />
            {uxVar(config.tur) ? 'Analiz ediliyor' : `Tur ${round} / ${maxRounds}`}
          </span>
          {soruyor ? (
            <div role="alertdialog" aria-label="Testi durdurma onayı" className="flex flex-wrap items-center gap-2 rounded-xl border border-bad/50 bg-bad-bg px-3 py-1.5">
              <span className="text-sm font-medium text-bad-text">Testi durdurmak istediğine emin misin?</span>
              <button
                ref={vazgecRef}
                type="button"
                onClick={() => setSoruyor(false)}
                className="min-h-9 rounded-lg border border-border-strong bg-surface px-3 text-sm font-medium text-text hover:bg-soft"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={onStop}
                className="min-h-9 rounded-lg bg-bad px-3 text-sm font-semibold text-white hover:opacity-90"
              >
                Durdur
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setSoruyor(true)}
              className="min-h-10 rounded-lg border border-bad bg-surface px-4 text-sm font-medium text-bad-text hover:bg-bad-bg"
            >
              Durdur
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
