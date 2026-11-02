// Test konfigürasyonu kartı: girdi (kod ya da URL), alan/dil/tür seçimi ve başlat butonu.
import { Info } from 'lucide-react'
import GirdiSecici from './GirdiSecici'
import Secici from './Secici'
import TurSecici from './TurSecici'
import StratejiOnizleme from './StratejiOnizleme'
import {
  ALANLAR,
  GELISTIRILIYOR_NOTU,
  alanAktif,
  arayuzVar,
  arayuzDesteklenir,
  pythonDesteklenir,
  turSecilebilir,
  urlGecerli,
  uxVar,
} from '../../config/testStratejileri'

// Profil varsayılanından gelen değerin yanında görünen küçük etiket
function ProfilEtiketi() {
  return (
    <span className="ml-2 rounded-full bg-ai-bg px-2 py-0.5 text-xs font-medium text-ai-text">Profilinden</span>
  )
}

const girdiSinifi =
  'min-h-11 w-full rounded-lg border border-border-strong bg-surface px-3 text-sm text-text disabled:opacity-50'

// Test alanı seçenekleri: şimdilik yalnızca Web aktif, diğerleri gelecek çalışma
const ALAN_SECENEKLERI = Object.entries(ALANLAR).map(([deger, a]) => ({
  deger,
  ad: deger === 'diger' ? 'Diğer…' : a.ad,
  pasif: !alanAktif(deger),
  rozet: alanAktif(deger) ? null : 'Yakında',
  ipucu: GELISTIRILIYOR_NOTU,
}))

export default function ConfigCard({ config, onChange, user, onStart }) {
  const alan = config.alan
  const urlModu = config.kaynak === 'url'
  const sadeceBirim = !arayuzDesteklenir(alan)
  const profil = user?.profilTamam ? user : null
  const komutGerek = !urlModu && (arayuzVar(config.tur) || uxVar(config.tur))
  const hazir = urlModu ? urlGecerli(config.url) : Boolean(config.dosya)

  const dilSecenekleri = [
    { deger: 'python', ad: 'Python', pasif: !pythonDesteklenir(alan) },
    { deger: 'csharp', ad: 'C#' },
    { deger: 'js', ad: 'JavaScript / TypeScript' },
    { deger: 'php', ad: 'PHP', rozet: 'Yeni' },
  ]

  // Değişikliği uygula, sonra alan ve girdi kurallarına göre düzelt
  function guncelle(degisim) {
    const c = { ...config, ...degisim }
    if (!alanAktif(c.alan)) c.alan = 'web'
    if (!pythonDesteklenir(c.alan) && c.dil === 'python') c.dil = 'js'
    if (!arayuzDesteklenir(c.alan) && c.tur !== 'birim') c.tur = 'birim'
    if (!turSecilebilir(c.tur, c.kaynak)) c.tur = 'arayuz'
    onChange(c)
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4">
      <div className="rounded-2xl border border-border bg-surface p-5 sm:p-8">
        <h2 className="mb-5 text-xl font-semibold">Test Konfigürasyonu</h2>

        <GirdiSecici
          kaynak={config.kaynak}
          dosya={config.dosya}
          url={config.url}
          onKaynak={(kaynak) => guncelle({ kaynak })}
          onDosya={(d) => guncelle({ dosya: d })}
          onUrl={(url) => guncelle({ url })}
        />

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Secici
            etiket={<>Test alanı{profil && profil.meslek === alan && <ProfilEtiketi />}</>}
            deger={alan}
            secenekler={ALAN_SECENEKLERI}
            onSec={(a) => guncelle({ alan: a })}
          />
          {urlModu ? (
            <div>
              <span className="mb-1 block text-sm font-medium text-text-2">Dil</span>
              <p className="flex min-h-11 items-center rounded-lg border border-dashed border-border-strong px-3 text-sm text-muted">
                Canlı site test edileceği için dil seçimi gerekmez
              </p>
            </div>
          ) : (
            <Secici
              etiket={<>Dil{profil && profil.diller.includes(config.dil) && <ProfilEtiketi />}</>}
              deger={config.dil}
              secenekler={dilSecenekleri}
              onSec={(dil) => guncelle({ dil })}
            />
          )}
        </div>

        {/* Bilgi notu: şimdilik web odaklıyız (PHP de bu yüzden eklendi) */}
        <p className="mt-3 flex gap-2.5 rounded-lg border border-ai-border bg-ai-bg px-3 py-2.5 text-sm text-text-2">
          <Info size={16} className="mt-0.5 shrink-0 text-ai-text" aria-hidden="true" />
          <span>
            <strong className="font-semibold text-ai-text">Şu an web odaklı ilerliyoruz.</strong>{' '}
            {config.dil === 'php' && !urlModu
              ? 'PHP desteği web projeleri (Laravel, Symfony ya da saf PHP) için tasarlandı.'
              : 'C#, Python, JS/TS ve yeni eklenen PHP; web projeleri için test edilir.'}{' '}
            Oyun, Mobil ve Genel alanları geliştirme aşamasında.
          </span>
        </p>

        <div className="mt-5">
          <TurSecici tur={config.tur} kaynak={config.kaynak} sadeceBirim={sadeceBirim} onSec={(tur) => guncelle({ tur })} />
        </div>

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

        {komutGerek && (
          <div className="mt-4">
            <label htmlFor="komut" className="mb-1 block text-sm font-medium text-text-2">
              Başlatma komutu (isteğe bağlı, boş bırakırsan otomatik bulunur)
            </label>
            <input
              id="komut"
              type="text"
              placeholder={config.dil === 'php' ? 'php artisan serve' : 'uvicorn main:app'}
              value={config.baslatmaKomutu}
              onChange={(e) => guncelle({ baslatmaKomutu: e.target.value })}
              className={`${girdiSinifi} font-mono`}
            />
          </div>
        )}

        <StratejiOnizleme config={config} />

        <button
          type="button"
          disabled={!hazir}
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
