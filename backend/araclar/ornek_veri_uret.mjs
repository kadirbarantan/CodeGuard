// Sahte motorun kullandığı örnek verileri frontend'deki mock dosyalarından üretir:
//   backend/app/sahte_motor/ornek_veri.json
// Böylece sahte motor, sitenin mock modunda gösterdiği raporların ve adımların birebir aynısını verir.
// Frontend mock'ları (frontend/src/mock, config/testStratejileri.js) değişince yeniden çalıştırılır.
//
// Çalıştırma (repo kökünde, frontend'de bir kez `npm install` yapılmış olmalı):
//   node backend/araclar/ornek_veri_uret.mjs
import { createRequire } from 'node:module'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const kok = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const frontend = join(kok, 'frontend')
// Vite'ın kendi paketleyicisi (rolldown) frontend/node_modules'tan kullanılır
const { rolldown } = await import(pathToFileURL(createRequire(join(frontend, 'package.json')).resolve('rolldown')).href)

// Mock dosyalarını tek bir modülde topla
const yol = (p) => JSON.stringify(join(frontend, 'src', p))
const giris = `
export * as strateji from ${yol('config/testStratejileri.js')}
export { report } from ${yol('mock/report.js')}
export { uxReport } from ${yol('mock/uxReport.js')}
export { erisimReport, ihlalKaynagi } from ${yol('mock/erisimReport.js')}
export { kodYorumu } from ${yol('mock/kodYorumu.js')}
`
const gecici = mkdtempSync(join(tmpdir(), 'codeguard-'))
const girisDosyasi = join(gecici, 'giris.mjs')
const cikti = join(gecici, 'paket.mjs')
writeFileSync(girisDosyasi, giris)
const paket = await rolldown({
  input: girisDosyasi,
  platform: 'node',
  logLevel: 'silent',
  plugins: [
    {
      // MOTOR sabiti frontend'de dışa aktarılmıyor; yalnızca bu paket için dışa aktarılır
      name: 'motor-disa-aktar',
      transform(kod, id) {
        if (id.endsWith('testStratejileri.js')) return kod.replace(/^const MOTOR =/m, 'export const MOTOR =')
      },
    },
  ],
})
await paket.write({ file: cikti, format: 'esm' })
const m = await import(pathToFileURL(cikti).href)
rmSync(gecici, { recursive: true, force: true })

const s = m.strateji
const DILLER = ['python', 'js', 'csharp', 'php']
const veri = {
  _aciklama: 'OTOMATİK ÜRETİLDİ: node backend/araclar/ornek_veri_uret.mjs. Elle düzenleme; kaynağı frontend/src/mock.',
  strateji: {
    TURLER: s.TURLER,
    TUR_SIRASI: s.TUR_SIRASI,
    DIL_ARACLARI: s.DIL_ARACLARI,
    ALAN_STRATEJI: s.ALAN_STRATEJI,
    ERISIM_STATIK: s.ERISIM_STATIK,
    MOTOR: s.MOTOR,
  },
  rapor: m.report,
  uxRapor: m.uxReport,
  // İhlallerin koddaki yeri dile göre değişir (Python şablonu, JSX, Razor …): her dil için önceden hesaplanır
  erisimRapor: { ...m.erisimReport, ihlaller: m.erisimReport.ihlaller.map(({ kaynak, ...i }) => i) },
  erisimKaynaklari: Object.fromEntries(
    DILLER.map((dil) => [dil, m.erisimReport.ihlaller.map((i) => (i.kaynak ? m.ihlalKaynagi(i.kaynak, dil) : null))]),
  ),
  kodYorumu: m.kodYorumu,
}
const hedef = join(kok, 'backend', 'app', 'sahte_motor', 'ornek_veri.json')
writeFileSync(hedef, JSON.stringify(veri, null, 1) + '\n')
console.log('Yazıldı:', hedef)
