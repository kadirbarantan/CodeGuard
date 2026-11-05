// Test konfigürasyonu kartı: girdi (kod ya da URL), alan/dil/tür seçimi ve başlat butonu.
import { Info, Play } from 'lucide-react'
import GirdiSecici, { GirdiSekmeleri } from './GirdiSecici'
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
  'min-h-11 w-full rounded-xl border border-border-strong bg-surface px-3 text-sm text-text shadow-sm outline-none focus:border-accent focus:ring-2 focus:ring-ai-border disabled:opacity-50'

// Test alanı seçenekleri: şimdilik yalnızca Web aktif, diğerleri gelecek çalışma
const ALAN_SECENEKLERI = Object.entries(ALANLAR).map(([deger, a]) => ({
  deger,
  ad: deger === 'diger' ? 'Diğer…' : a.ad,
  pasif: !alanAktif(deger),
  rozet: alanAktif(deger) ? null : 'Yakında',
  ipucu: GELISTIRILIYOR_NOTU,
}))

// onGirisYapildi / onKullaniciGuncelle / onGirisAc: GitHub sekmesindeki bağlanma adımları için (App'ten)
export default function ConfigCard({ config, onChange, user, onStart, onGirisYapildi, onKullaniciGuncelle, onGirisAc }) {
  const alan = config.alan
  const urlModu = config.kaynak === 'url'
  const sadeceBirim = !arayuzDesteklenir(alan)
  const profil = user?.profilTamam ? user : null
  const komutGerek = !urlModu && (arayuzVar(config.tur) || uxVar(config.tur))
  const g = config.github
  // GitHub: en az bir dosya seçili, bağlam hesaplanmış ve sınır aşılmamış olmalı
  const githubHazir = Boolean(user?.github?.repoErisimi && g?.secilenler?.length && !g.hesaplaniyor && !g.sinirAsildi)
  const hazir = urlModu ? urlGecerli(config.url) : config.kaynak === 'github' ? githubHazir : Boolean(config.dosya)

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

  // GitHub sekmesi seçimi: ardışık güncellemeler (repo → dal → bağlam) birbirini ezmesin diye fonksiyonel güncelleme
  function githubGuncelle(degisim) {
    onChange((c) => ({ ...c, github: { ...(c.github || {}), ...degisim } }))
  }

  return (
    <section id="test-baslat" className="mx-auto w-full max-w-7xl scroll-mt-24 px-4 sm:px-6">
      <div className="rounded-3xl border border-border bg-surface shadow-kart">
        {/* Pencere başlığı: kart bir geliştirici aracı penceresi gibi; sağda girdi sekmeleri */}
        <div className="flex flex-col gap-3 rounded-t-3xl border-b border-border bg-soft/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5" aria-hidden="true">
              <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
              <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
              <span className="h-3 w-3 rounded-full bg-[#28c840]" />
            </span>
            <span className="h-4 w-px bg-border-strong" aria-hidden="true" />
            <h2 className="text-base font-bold text-text">Test Konfigürasyonu</h2>
          </div>
          <GirdiSekmeleri kaynak={config.kaynak} onKaynak={(kaynak) => guncelle({ kaynak })} />
        </div>

        <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-12 lg:p-7">
          {/* Sol (ana iş): kod girdisi ve test ayarları tek alanda, altında Başlat */}
          <div className="min-w-0 space-y-5 lg:col-span-8">
            <div className="space-y-5 rounded-2xl border-2 border-ai-border bg-gradient-to-b from-ai-bg/60 to-surface p-4 sm:p-5">
            <GirdiSecici
              kaynak={config.kaynak}
              dosya={config.dosya}
              url={config.url}
              onDosya={(d) => guncelle({ dosya: d })}
              onUrl={(url) => guncelle({ url })}
              github={config.github}
              githubProps={{
                user,
                tur: config.tur,
                onGithub: githubGuncelle,
                onGirisYapildi,
                onKullaniciGuncelle,
                onGirisAc,
              }}
            />

            <div className="space-y-4 border-t border-ai-border pt-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Secici
                  etiket={<>Test alanı{profil && profil.meslek === alan && <ProfilEtiketi />}</>}
                  deger={alan}
                  secenekler={ALAN_SECENEKLERI}
                  onSec={(a) => guncelle({ alan: a })}
                />
                {urlModu ? (
                  <div>
                    <span className="mb-1 block text-sm font-medium text-text-2">Dil</span>
                    <p className="flex min-h-11 items-center rounded-xl border border-dashed border-border-strong px-3 text-sm text-muted">
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
              <p className="flex gap-2.5 rounded-xl border border-ai-border bg-ai-bg px-3 py-2.5 text-sm text-text-2">
                <Info size={16} className="mt-0.5 shrink-0 text-ai-text" aria-hidden="true" />
                <span>
                  <strong className="font-semibold text-ai-text">Şu an web odaklı ilerliyoruz.</strong>{' '}
                  {config.dil === 'php' && !urlModu
                    ? 'PHP desteği web projeleri (Laravel, Symfony ya da saf PHP) için tasarlandı.'
                    : 'C#, Python, JS/TS ve yeni eklenen PHP; web projeleri için test edilir.'}{' '}
                  Oyun, Mobil ve Genel alanları geliştirme aşamasında.
                </span>
              </p>

              <TurSecici tur={config.tur} kaynak={config.kaynak} sadeceBirim={sadeceBirim} onSec={(tur) => guncelle({ tur })} />

              {alan === 'diger' && (
                <div>
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
                <div>
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
            </div>
            </div>

            {/* Başlat: ayarların hemen altında, sabit yerinde */}
            <div>
              <button
                type="button"
                disabled={!hazir}
                onClick={() => onStart(config)}
                className="flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-accent to-accent-2 px-4 py-3.5 text-lg font-bold text-white shadow-kart transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:from-soft disabled:to-soft disabled:text-muted"
              >
                <Play size={18} className="fill-current" aria-hidden="true" />
                Testi Başlat
              </button>
              {(!hazir || !user) && (
                <p className="mt-2 text-center text-xs text-muted">
                  {!hazir
                    ? urlModu
                      ? 'Başlatmak için sitenin adresini gir.'
                      : config.kaynak === 'github'
                        ? 'Başlatmak için repodan en az bir dosya seç.'
                        : 'Başlatmak için önce kodunu ekle.'
                    : 'Testi başlatmak için giriş yapman istenecek.'}
                </p>
              )}
            </div>
          </div>

          {/* Sağ (ikincil): seçime göre değişen plan önizlemesi; geniş ekranda kaydırırken yanında kalır */}
          <aside className="min-w-0 lg:col-span-4">
            <div className="lg:sticky lg:top-24">
              <StratejiOnizleme config={config} sade />
            </div>
          </aside>
        </div>
      </div>
    </section>
  )
}
