import { useEffect, useState } from 'react'
import { getQualityScore } from '../../services/api'

// Özet kutuları: etkileşim kapsamı, üretilen test, olası hata, kalite skoru.
export default function SummaryCards({ report }) {
  const [kalite, setKalite] = useState(report.kaliteSkoru)

  // Kalite skoru sonradan gelir (mutasyon testi); bileşen kalkarsa yok say
  // Kalite skoru kaynak kod üzerinde mutasyon testiyle ölçülür; URL ile testte yoktur
  const kaliteVar = report.kaynak !== 'url'

  useEffect(() => {
    if (!kaliteVar || report.kaliteSkoru != null) return
    let iptal = false
    getQualityScore(report.runId).then((s) => {
      if (!iptal) setKalite(s.kaliteSkoru)
    })
    return () => {
      iptal = true
    }
  }, [report.runId, report.kaliteSkoru, kaliteVar])

  const toplamTest = report.testSayisi.birim + report.testSayisi.arayuz
  const kutu = 'rounded-xl border border-border bg-bg p-4'
  const etiket = 'text-sm text-muted'

  return (
    <div className="grid flex-1 gap-3 sm:grid-cols-2">
      {report.tur !== 'birim' && (
        <div className={kutu}>
          <p className={etiket}>Etkileşim kapsamı</p>
          <p className="mt-1 text-2xl font-semibold text-text">
            {report.etkilesim.kapsanan} / {report.etkilesim.toplam}
          </p>
        </div>
      )}
      <div className={kutu}>
        <p className={etiket}>Üretilen test</p>
        <p className="mt-1 text-2xl font-semibold text-text">{toplamTest}</p>
        <p className="text-xs text-muted">
          {kaliteVar ? `${report.testSayisi.birim} birim · ${report.testSayisi.arayuz} arayüz` : `${report.testSayisi.arayuz} arayüz`}
        </p>
      </div>
      <div className={kutu}>
        <p className={etiket}>Olası hata</p>
        <p className="mt-1 text-2xl font-semibold text-bad-text">{report.olasiHatalar.length}</p>
      </div>
      {kaliteVar && (
      <div className={kutu}>
        <p className={etiket}>Kalite skoru</p>
        {kalite == null ? (
          <p className="mt-1 text-lg font-medium text-ai-text">Hesaplanıyor…</p>
        ) : (
          <p className="mt-1 text-2xl font-semibold text-text">%{kalite}</p>
        )}
      </div>
      )}
    </div>
  )
}
