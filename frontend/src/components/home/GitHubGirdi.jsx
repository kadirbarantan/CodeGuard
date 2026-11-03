// GitHub sekmesi (K17): kullanıcının durumuna göre dört görünüm.
// 1. Giriş yok              → "GitHub ile Bağlan" (giriş + repo erişimi tek adımda)
// 2. E-postayla giriş       → "GitHub Hesabını Bağla"
// 3. GitHub bağlı, erişim yok → "Repolarına erişim ver"
// 4. Hazır                  → repo · dal · onay kutulu ağaç · otomatik bağlam · sınır göstergesi
import { useEffect, useState } from 'react'
import { ExternalLink, GitBranch, Loader2, Lock, ShieldCheck, TriangleAlert } from 'lucide-react'
import GitHubButonu from '../GitHubButonu'
import Secici from './Secici'
import RepoAgaci from './RepoAgaci'
import { MAX_BOYUT, MAX_DOSYA, boyutYaz, haricMi } from './dosyaOlcum'
import {
  githubBaglan,
  githubHesabiBagla,
  githubRepoErisimiVer,
  getGithubRepolari,
  getGithubDallari,
  getGithubAgaci,
  getGithubBaglami,
} from '../../services/api'

// Durum 1–3: bağlanma kartı (diğer girdi kutularıyla aynı kesik çizgili alan)
function BaglanmaKarti({ baslik, aciklama, butonMetni, onBagla, alt }) {
  const [bekliyor, setBekliyor] = useState(false)
  const [hata, setHata] = useState('')

  async function tikla() {
    setHata('')
    setBekliyor(true)
    try {
      await onBagla()
    } catch (e) {
      setHata(e?.message || 'GitHub bağlantısı kurulamadı. Lütfen tekrar dene.')
      setBekliyor(false)
    }
  }

  return (
    <div className="rounded-xl border-2 border-dashed border-border-strong bg-bg px-4 py-10 text-center">
      <GitBranch size={44} className="mx-auto text-accent" aria-hidden="true" />
      <p className="mt-3 text-lg font-semibold">{baslik}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted">{aciklama}</p>
      <GitHubButonu metin={butonMetni} onClick={tikla} bekliyor={bekliyor} className="mx-auto mt-5 w-full max-w-xs" />
      {hata && (
        <p role="alert" className="mt-3 flex items-center justify-center gap-2 text-sm text-bad-text">
          <TriangleAlert size={16} aria-hidden="true" /> {hata}
        </p>
      )}
      <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted">
        <ShieldCheck size={14} className="text-ok-text" aria-hidden="true" />
        Yalnızca seçtiğin repolara, salt okunur erişim.
      </p>
      {alt}
    </div>
  )
}

// Sınır çubuğu: toplam boyut ya da dosya sayısı
function SinirCubugu({ etiket, deger, sinir, yazi }) {
  const oran = Math.min(100, (deger / sinir) * 100)
  const asildi = deger > sinir
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className="text-muted">{etiket}</span>
        <span className={asildi ? 'font-medium text-bad-text' : 'text-text-2'}>{yazi}</span>
      </div>
      <div
        className="mt-1 h-1.5 overflow-hidden rounded-full bg-soft"
        role="progressbar"
        aria-label={etiket}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(oran)}
      >
        <div className={'h-full rounded-full ' + (asildi ? 'bg-bad' : 'bg-accent')} style={{ width: oran + '%' }} />
      </div>
    </div>
  )
}

// Durum 4: repo, dal ve dosya seçimi
function RepoSecimi({ github, tur, kullaniciAdi, onGithub }) {
  const [repolar, setRepolar] = useState(null)
  const [dallar, setDallar] = useState([])
  const [agac, setAgac] = useState(null)
  const g = github || {}

  // Erişim verilen repolar
  useEffect(() => {
    let iptal = false
    getGithubRepolari().then((r) => !iptal && setRepolar(r))
    return () => {
      iptal = true
    }
  }, [])

  // Repo seçilince dallar; dal yoksa varsayılan dal (ilk sıradaki, genelde main)
  useEffect(() => {
    if (!g.repo) return
    let iptal = false
    getGithubDallari(g.repo).then((d) => {
      if (iptal) return
      setDallar(d)
      if (!g.dal && d[0]) onGithub({ dal: d[0].ad, commit: d[0].commit })
    })
    return () => {
      iptal = true
    }
  }, [g.repo]) // eslint-disable-line react-hooks/exhaustive-deps

  // Repo/dal seçilince ağaç (yalnızca yollar ve boyutlar; içerik indirilmez)
  useEffect(() => {
    if (!g.repo || !g.dal) return
    let iptal = false
    setAgac(null)
    getGithubAgaci(g.repo, g.dal).then((a) => !iptal && setAgac(a.filter((d) => !haricMi(d.yol))))
    return () => {
      iptal = true
    }
  }, [g.repo, g.dal])

  // Seçim ya da test türü değişince bağlamı yeniden hesapla (Bağlam Çözümleyici)
  const secilenler = g.secilenler || []
  const secimAnahtari = secilenler.join('|')
  useEffect(() => {
    if (!g.repo || !g.dal || !agac) return
    if (secilenler.length === 0) {
      onGithub({ baglam: [], tumRepo: false, hesaplaniyor: false })
      return
    }
    let iptal = false
    onGithub({ hesaplaniyor: true })
    getGithubBaglami(g.repo, g.dal, secilenler, tur).then(({ baglam, tumRepo }) => {
      if (!iptal) onGithub({ baglam, tumRepo, hesaplaniyor: false })
    })
    return () => {
      iptal = true
    }
  }, [g.repo, g.dal, agac, secimAnahtari, tur]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sınır durumu konfigürasyona yazılır: aşılırsa "Testi Başlat" pasif olur
  const boyutHaritasi = Object.fromEntries((agac || []).map((d) => [d.yol, d.boyut]))
  const toplam = [...secilenler, ...(g.baglam || []).map((b) => b.yol)].reduce((t, y) => t + (boyutHaritasi[y] || 0), 0)
  const asildiMi = secilenler.length + (g.baglam || []).length > MAX_DOSYA || toplam > MAX_BOYUT
  useEffect(() => {
    if (Boolean(g.sinirAsildi) !== asildiMi) onGithub({ sinirAsildi: asildiMi })
  }, [asildiMi]) // eslint-disable-line react-hooks/exhaustive-deps

  function repoSec(ad) {
    if (ad === g.repo) return
    setDallar([])
    setAgac(null)
    onGithub({ repo: ad, dal: null, commit: null, secilenler: [], baglam: [], tumRepo: false })
  }

  function dalSec(ad) {
    const d = dallar.find((x) => x.ad === ad)
    onGithub({ dal: ad, commit: d?.commit || null, secilenler: [], baglam: [], tumRepo: false })
  }

  if (!repolar) {
    return (
      <p className="flex items-center gap-2 py-6 text-sm text-muted">
        <Loader2 size={16} className="animate-spin" aria-hidden="true" /> Repoların getiriliyor…
      </p>
    )
  }

  const boyutlar = Object.fromEntries((agac || []).map((d) => [d.yol, d.boyut]))
  const baglam = g.baglam || []
  const hedefBoyut = secilenler.reduce((t, y) => t + (boyutlar[y] || 0), 0)
  const baglamBoyut = baglam.reduce((t, b) => t + (boyutlar[b.yol] || 0), 0)
  const toplamSayi = secilenler.length + baglam.length
  const toplamBoyut = hedefBoyut + baglamBoyut
  const sinirAsildi = toplamSayi > MAX_DOSYA || toplamBoyut > MAX_BOYUT

  return (
    <div className="rounded-xl border border-border-strong bg-bg p-4 sm:p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <Secici
          etiket="Repo"
          deger={g.repo || null}
          yerTutucu="Repo seç"
          secenekler={repolar.map((r) => ({ deger: r.ad, ad: r.ad, rozet: r.gizli ? 'Gizli' : null }))}
          onSec={repoSec}
        />
        <Secici
          etiket="Dal"
          deger={g.dal || null}
          yerTutucu={g.repo ? 'Yükleniyor…' : 'Önce repo seç'}
          devreDisi={!g.repo || dallar.length === 0}
          secenekler={dallar.map((d) => ({ deger: d.ad, ad: `${d.ad} @ ${d.commit}` }))}
          onSec={dalSec}
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <Lock size={12} aria-hidden="true" /> Salt okunur erişim · @{kullaniciAdi}
        </span>
        <a
          href="https://github.com/settings/installations"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 font-medium text-ai-text hover:underline"
        >
          Repo listesini düzenle <ExternalLink size={12} aria-hidden="true" />
        </a>
      </div>

      {g.repo && (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-text-2">Test edilecek dosya ve klasörler</span>
            {secilenler.length > 0 && (
              <button
                type="button"
                onClick={() => onGithub({ secilenler: [] })}
                className="min-h-8 rounded-md px-2 text-xs font-medium text-ai-text hover:bg-ai-bg"
              >
                Seçimi temizle
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto rounded-lg border border-border bg-surface p-1.5">
            {agac ? (
              <RepoAgaci
                key={g.repo + '@' + g.dal}
                dosyalar={agac}
                secilenler={secilenler}
                baglam={g.tumRepo ? null : new Map(baglam.map((b) => [b.yol, b.neden]))}
                onDegis={(s) => onGithub({ secilenler: s })}
              />
            ) : (
              <p className="flex items-center gap-2 p-3 text-sm text-muted">
                <Loader2 size={16} className="animate-spin" aria-hidden="true" /> Dosya ağacı getiriliyor…
              </p>
            )}
          </div>

          {/* Özet: hedef, otomatik bağlam ve sınır */}
          <div className="mt-3 space-y-3 rounded-lg border border-border bg-surface p-3" aria-live="polite">
            {secilenler.length === 0 ? (
              <p className="text-sm text-muted">Test etmek istediğin dosya ya da klasörleri seç.</p>
            ) : (
              <>
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <p>
                    <span className="font-medium text-text">Hedef:</span>{' '}
                    <span className="text-text-2">
                      {secilenler.length} dosya · {boyutYaz(hedefBoyut)}
                    </span>
                    <span className="block text-xs text-muted">Testler bunlara yazılır, coverage bunlarda ölçülür.</span>
                  </p>
                  <p>
                    <span className="font-medium text-text">Otomatik eklenen:</span>{' '}
                    <span className="text-text-2">
                      {g.hesaplaniyor ? 'hesaplanıyor…' : `${baglam.length} dosya · ${boyutYaz(baglamBoyut)}`}
                    </span>
                    <span className="block text-xs text-muted">
                      {g.tumRepo
                        ? 'Arayüz testinde uygulamanın tamamı gerekir; tüm repo eklendi.'
                        : 'Çalışması için gereken manifestler ve import edilen dosyalar.'}
                    </span>
                  </p>
                </div>
                {!g.tumRepo && baglam.length > 0 && !g.hesaplaniyor && (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-xs font-medium text-ai-text">Neden eklendiklerini göster</summary>
                    <ul className="mt-2 space-y-1">
                      {baglam.map((b) => (
                        <li key={b.yol} className="flex flex-wrap gap-x-2 text-xs">
                          <span className="font-mono text-text-2">{b.yol}</span>
                          <span className="text-muted">— {b.neden}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <SinirCubugu etiket="Toplam boyut" deger={toplamBoyut} sinir={MAX_BOYUT} yazi={`${boyutYaz(toplamBoyut)} / 5 MB`} />
                  <SinirCubugu etiket="Dosya sayısı" deger={toplamSayi} sinir={MAX_DOSYA} yazi={`${toplamSayi} / ${MAX_DOSYA}`} />
                </div>
                {sinirAsildi && (
                  <p role="alert" className="flex items-start gap-2 text-sm text-bad-text">
                    <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                    Sınır aşıldı. Daha az dosya seç{g.tumRepo ? ' ya da Birim testini dene (yalnızca gereken dosyalar eklenir)' : ''}.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// GitHub sekmesi: duruma göre bağlanma kartı ya da repo seçimi
export default function GitHubGirdi({ user, github, tur, onGithub, onGirisYapildi, onKullaniciGuncelle, onGirisAc }) {
  // 1. Giriş yok
  if (!user) {
    return (
      <BaglanmaKarti
        baslik="GitHub reponu bağla"
        aciklama="Test etmek istediğin dosya ve klasörleri doğrudan GitHub'dan seç."
        butonMetni="GitHub ile Bağlan"
        onBagla={async () => onGirisYapildi(await githubBaglan())}
        alt={
          <p className="mt-2 text-xs text-muted">
            E-postayla hesabın var mı?{' '}
            <button type="button" onClick={onGirisAc} className="font-medium text-ai-text hover:underline">
              Giriş yap
            </button>
          </p>
        }
      />
    )
  }
  // 2. E-postayla giriş yapmış, GitHub bağlı değil
  if (!user.github) {
    return (
      <BaglanmaKarti
        baslik="GitHub hesabını bağla"
        aciklama="Hesabın e-postayla açık. Repolarından dosya seçebilmek için GitHub hesabını bağla."
        butonMetni="GitHub Hesabını Bağla"
        onBagla={async () => onKullaniciGuncelle(await githubHesabiBagla())}
      />
    )
  }
  // 3. GitHub bağlı, repolara erişim verilmemiş
  if (!user.github.repoErisimi) {
    return (
      <BaglanmaKarti
        baslik="Repolarına erişim ver"
        aciklama={`GitHub hesabın bağlı (@${user.github.kullaniciAdi}). Hangi repoların test edilebileceğini GitHub'da sen seçersin.`}
        butonMetni="Repolarına erişim ver"
        onBagla={async () => onKullaniciGuncelle(await githubRepoErisimiVer(user.github))}
      />
    )
  }
  // 4. Hazır
  return <RepoSecimi github={github} tur={tur} kullaniciAdi={user.github.kullaniciAdi} onGithub={onGithub} />
}
