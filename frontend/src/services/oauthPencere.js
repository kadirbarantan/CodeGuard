// OAuth ile giriş (gerçek backend), GitHub ve Google için ortak: akış küçük bir açılır pencerede yürür.
// Ana sayfa yerinde kaldığı için yüklenen dosya ve seçimler kaybolmaz (K12).
//
// Akış:
// 1. Pencere backend'in /auth/<saglayici>/login adresini açar → backend sağlayıcıya yönlendirir.
// 2. Kullanıcı izin verir → sağlayıcı backend'in /auth/<saglayici>/callback adresine döner.
// 3. Backend kullanıcıyı bulur/oluşturur, CodeGuard oturum token'ı üretir ve
//    pencereden bu sayfaya postMessage ile { type: 'codeguard:<saglayici>', token } gönderir.
// 4. Burada mesajın backend'den geldiği doğrulanır, token ile /auth/me çağrılır.

const PENCERE_GENISLIK = 520
const PENCERE_YUKSEKLIK = 680

function pencereAc(url, ad) {
  const sol = window.screenX + (window.outerWidth - PENCERE_GENISLIK) / 2
  const ust = window.screenY + (window.outerHeight - PENCERE_YUKSEKLIK) / 2
  return window.open(url, ad, `width=${PENCERE_GENISLIK},height=${PENCERE_YUKSEKLIK},left=${sol},top=${ust}`)
}

// Pencereden gelen token'ı bekler. Kullanıcı pencereyi kapatırsa hata verir.
function tokenBekle(pencere, apiOrigin, mesajTipi, etiket) {
  return new Promise((coz, reddet) => {
    function temizle() {
      window.removeEventListener('message', dinle)
      clearInterval(kapanmaKontrol)
    }

    function dinle(e) {
      // Yalnızca kendi backend'imizden gelen mesajı kabul et
      if (e.origin !== apiOrigin || e.data?.type !== mesajTipi) return
      temizle()
      if (e.data.token) coz(e.data.token)
      else reddet(new Error(e.data.hata || `${etiket} ile giriş tamamlanamadı.`))
    }

    const kapanmaKontrol = setInterval(() => {
      if (pencere.closed) {
        temizle()
        reddet(new Error(`${etiket} penceresi kapatıldı.`))
      }
    }, 500)

    window.addEventListener('message', dinle)
  })
}

// saglayici: 'github' | 'google' (backend yolu ve mesaj tipi), etiket: kullanıcıya görünen ad
export async function pencereIleGiris(apiUrl, saglayici, etiket) {
  const pencere = pencereAc(`${apiUrl}/auth/${saglayici}/login`, `codeguard-${saglayici}`)
  if (!pencere) {
    throw new Error('Açılır pencere engellendi. Tarayıcında bu site için açılır pencerelere izin ver.')
  }
  const token = await tokenBekle(pencere, new URL(apiUrl).origin, `codeguard:${saglayici}`, etiket)

  const yanit = await fetch(apiUrl + '/auth/me', { headers: { Authorization: 'Bearer ' + token } })
  if (!yanit.ok) throw new Error('Oturum bilgisi alınamadı.')
  const kullanici = await yanit.json()
  return { ...kullanici, token }
}
