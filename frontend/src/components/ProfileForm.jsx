// Profil formu: ilk girişte "Profilini tamamla", sonra "Profilim" olarak açılır.
// Meslek ve diller, test konfigürasyonunun varsayılanlarını ve test stratejisini belirler.
import { useState } from 'react'
import { updateProfile } from '../services/api'
import { ALANLAR, DILLER } from '../config/testStratejileri'

export default function ProfileForm({ kullanici, onKaydet }) {
  const ilkKez = !kullanici.profilTamam
  const [ad, setAd] = useState(kullanici.ad || '')
  const [meslek, setMeslek] = useState(kullanici.meslek || '')
  const [digerMeslek, setDigerMeslek] = useState(kullanici.digerMeslek || '')
  const [diller, setDiller] = useState(kullanici.diller || [])
  const [hatalar, setHatalar] = useState({})
  const [bekliyor, setBekliyor] = useState(false)

  function dilDegistir(dil) {
    setDiller((d) => (d.includes(dil) ? d.filter((x) => x !== dil) : [...d, dil]))
  }

  function dogrula() {
    const h = {}
    if (!ad.trim()) h.ad = 'Ad Soyad boş bırakılamaz.'
    if (!meslek) h.meslek = 'Bir meslek seç.'
    if (meslek === 'diger' && !digerMeslek.trim()) h.digerMeslek = 'Mesleğini kısaca yaz.'
    if (diller.length === 0) h.diller = 'En az bir dil seç.'
    else if (meslek === 'mobil' && diller.length === 1 && diller[0] === 'python') {
      h.diller = 'Mobil testlerde Python desteklenmiyor; C# ya da JavaScript / TypeScript de seç.'
    }
    return h
  }

  async function gonder(e) {
    e.preventDefault()
    if (bekliyor) return
    const h = dogrula()
    setHatalar(h)
    if (Object.keys(h).length > 0) return
    setBekliyor(true)
    try {
      const profil = { ad: ad.trim(), meslek, digerMeslek: meslek === 'diger' ? digerMeslek.trim() : '', diller }
      onKaydet(await updateProfile(kullanici.eposta, profil))
    } catch {
      setHatalar({ genel: 'Profil kaydedilemedi. Lütfen tekrar dene.' })
      setBekliyor(false)
    }
  }

  const kartSinif = (secili) =>
    'flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm ' +
    (secili ? 'border-accent bg-ai-bg text-ai-text' : 'border-border-strong text-text-2 hover:bg-soft')

  return (
    <form onSubmit={gonder} noValidate className="space-y-5">
      {ilkKez && (
        <p className="text-sm text-text-2">
          Mesleğine ve kullandığın dillere göre test sürecini senin için ayarlayalım. Bu bilgileri daha sonra
          "Profilim"den değiştirebilirsin.
        </p>
      )}

      <div>
        <label htmlFor="profil-ad" className="mb-1 block text-sm font-medium text-text-2">Ad Soyad</label>
        <input
          id="profil-ad"
          type="text"
          value={ad}
          onChange={(e) => setAd(e.target.value)}
          autoComplete="name"
          aria-invalid={hatalar.ad ? 'true' : 'false'}
          className={
            'min-h-10 w-full rounded-lg border bg-surface px-3 text-sm text-text outline-none focus:border-accent ' +
            (hatalar.ad ? 'border-bad' : 'border-border-strong')
          }
        />
        {hatalar.ad && <p role="alert" className="mt-1 text-sm text-bad-text">{hatalar.ad}</p>}
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-text-2">Mesleğin</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {Object.entries(ALANLAR).map(([id, a]) => (
            <label key={id} className={kartSinif(meslek === id)}>
              <input
                type="radio"
                name="meslek"
                value={id}
                checked={meslek === id}
                onChange={() => setMeslek(id)}
                className="accent-[var(--accent)]"
              />
              {a.meslek}
            </label>
          ))}
        </div>
        {hatalar.meslek && <p role="alert" className="mt-1 text-sm text-bad-text">{hatalar.meslek}</p>}
      </fieldset>

      {meslek === 'diger' && (
        <div>
          <label htmlFor="profil-diger" className="mb-1 block text-sm font-medium text-text-2">Mesleğini kısaca yaz</label>
          <input
            id="profil-diger"
            type="text"
            maxLength={100}
            value={digerMeslek}
            onChange={(e) => setDigerMeslek(e.target.value)}
            placeholder="Örn. Gömülü sistem geliştirici"
            className="min-h-10 w-full rounded-lg border border-border-strong bg-surface px-3 text-sm text-text outline-none focus:border-accent"
          />
          {hatalar.digerMeslek && <p role="alert" className="mt-1 text-sm text-bad-text">{hatalar.digerMeslek}</p>}
        </div>
      )}

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-text-2">Kullandığın diller</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Object.entries(DILLER).map(([id, ad]) => (
            <label key={id} className={kartSinif(diller.includes(id))}>
              <input
                type="checkbox"
                checked={diller.includes(id)}
                onChange={() => dilDegistir(id)}
                className="accent-[var(--accent)]"
              />
              {id === 'js' ? 'JS / TS' : ad}
            </label>
          ))}
        </div>
        {hatalar.diller && <p role="alert" className="mt-1 text-sm text-bad-text">{hatalar.diller}</p>}
      </fieldset>

      {hatalar.genel && <p role="alert" className="text-sm text-bad-text">{hatalar.genel}</p>}

      <button
        type="submit"
        disabled={bekliyor}
        className="min-h-10 w-full rounded-lg bg-accent px-4 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {bekliyor ? 'Kaydediliyor…' : ilkKez ? 'Kaydet ve devam et' : 'Kaydet'}
      </button>
    </form>
  )
}
