// Test konfigürasyonu kartı: yükleme, alan/dil/tür seçimi ve başlat butonu.
import UploadBox from './UploadBox'
import TurSecici from './TurSecici'
import StratejiOnizleme from './StratejiOnizleme'
import { pythonDesteklenir, arayuzDesteklenir } from '../../config/testStratejileri'

// Profil varsayılanından gelen değerin yanında görünen küçük etiket
function ProfilEtiketi() {
  return (
    <span className="ml-2 rounded-full bg-ai-bg px-2 py-0.5 text-xs font-medium text-ai-text">Profilinden</span>
  )
}

const girdiSinifi =
  'min-h-11 w-full rounded-lg border border-border-strong bg-surface px-3 text-sm text-text disabled:opacity-50'

export default function ConfigCard({ config, onChange, user, onStart }) {
  const alan = config.alan
  const sadeceBirim = !arayuzDesteklenir(alan)
  const profil = user?.profilTamam ? user : null
  const arayuzGerek = config.tur === 'arayuz' || config.tur === 'ikisi'

  // Değişikliği uygula, sonra alan kurallarına göre düzelt
  function guncelle(degisim) {
    const c = { ...config, ...degisim }
    if (!pythonDesteklenir(c.alan) && c.dil === 'python') c.dil = 'js'
    if (!arayuzDesteklenir(c.alan) && c.tur !== 'birim') c.tur = 'birim'
    onChange(c)
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4">
      <div className="rounded-2xl border border-border bg-surface p-5 sm:p-8">
        <h2 className="mb-5 text-xl font-semibold">Test Konfigürasyonu</h2>

        <UploadBox dosya={config.dosya} onDosya={(d) => guncelle({ dosya: d })} />

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="alan" className="mb-1 block text-sm font-medium text-text-2">
              Test alanı{profil && profil.meslek === alan && <ProfilEtiketi />}
            </label>
            <select id="alan" value={alan} onChange={(e) => guncelle({ alan: e.target.value })} className={girdiSinifi}>
              <option value="web">Web</option>
              <option value="oyun">Oyun</option>
              <option value="mobil">Mobil</option>
              <option value="genel">Genel</option>
              <option value="diger">Diğer…</option>
            </select>
          </div>
          <div>
            <label htmlFor="dil" className="mb-1 block text-sm font-medium text-text-2">
              Dil{profil && profil.diller.includes(config.dil) && <ProfilEtiketi />}
            </label>
            <select id="dil" value={config.dil} onChange={(e) => guncelle({ dil: e.target.value })} className={girdiSinifi}>
              <option value="python" disabled={!pythonDesteklenir(alan)}>Python</option>
              <option value="csharp">C#</option>
              <option value="js">JavaScript / TypeScript</option>
            </select>
          </div>
          <TurSecici tur={config.tur} sadeceBirim={sadeceBirim} onSec={(tur) => guncelle({ tur })} />
        </div>

        {sadeceBirim && (
          <p className="mt-3 text-sm text-muted">
            Bu alanda birim testi yapılır. Arayüz (E2E) testleri şimdilik yalnızca web arayüzleri için.
          </p>
        )}

        {alan === 'diger' && (
          <div className="mt-4">
            <label htmlFor="digerMetin" className="mb-1 block text-sm font-medium text-text-2">Alanını kısaca yaz</label>
            <input
              id="digerMetin"
              type="text"
              maxLength={100}
              value={config.digerMetin}
              onChange={(e) => guncelle({ digerMetin: e.target.value })}
              className={girdiSinifi}
            />
          </div>
        )}

        {arayuzGerek && (
          <div className="mt-4">
            <label htmlFor="komut" className="mb-1 block text-sm font-medium text-text-2">
              Başlatma komutu (isteğe bağlı, boş bırakırsan otomatik bulunur)
            </label>
            <input
              id="komut"
              type="text"
              placeholder="uvicorn main:app"
              value={config.baslatmaKomutu}
              onChange={(e) => guncelle({ baslatmaKomutu: e.target.value })}
              className={`${girdiSinifi} font-mono`}
            />
          </div>
        )}

        <StratejiOnizleme config={config} />

        <button
          type="button"
          disabled={!config.dosya}
          onClick={() => onStart(config)}
          className="mt-6 min-h-12 w-full rounded-lg bg-accent px-4 font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Otonom Testi Başlat
        </button>
        {!user && (
          <p className="mt-2 text-center text-xs text-muted">Testi başlatmak için giriş yapman istenecek.</p>
        )}
      </div>
    </section>
  )
}
