// GitHub ile giriş (gerçek backend): OAuth akışı küçük bir açılır pencerede yürür.
// Ana sayfa yerinde kaldığı için yüklenen dosya ve seçimler kaybolmaz (K12).
//
// Akış:
// 1. Pencere backend'in /auth/github/login adresini açar → backend GitHub'a yönlendirir.
// 2. Kullanıcı GitHub'da izin verir → GitHub backend'in /auth/github/callback adresine döner.
// 3. Backend kullanıcıyı bulur/oluşturur, CodeGuard oturum token'ı üretir ve
//    pencereden bu sayfaya postMessage ile { type: 'codeguard:github', token } gönderir.
// 4. Burada mesajın backend'den geldiği doğrulanır, token ile /auth/me çağrılır.

const MESAJ_TIPI = 'codeguard:github'
const PENCERE_GENISLIK = 520
const PENCERE_YUKSEKLIK = 680

function pencereAc(url) {
  const sol = window.screenX + (window.outerWidth - PENCERE_GENISLIK) / 2
  const ust = window.screenY + (window.outerHeight - PENCERE_YUKSEKLIK) / 2
  return window.open(
    url,
    'codeguard-github',
    `width=${PENCERE_GENISLIK},height=${PENCERE_YUKSEKLIK},left=${sol},top=${ust}`,
  )
}

// Pencereden gelen token'ı bekler. Kullanıcı pencereyi kapatırsa hata verir.
function tokenBekle(pencere, apiOrigin) {
  return new Promise((coz, reddet) => {
    function temizle() {
      window.removeEventListener('message', dinle)
      clearInterval(kapanmaKontrol)
    }

    function dinle(e) {
      // Yalnızca kendi backend'imizden gelen mesajı kabul et
      if (e.origin !== apiOrigin || e.data?.type !== MESAJ_TIPI) return
      temizle()
      if (e.data.token) coz(e.data.token)
      else reddet(new Error(e.data.hata || 'GitHub ile giriş tamamlanamadı.'))
    }

    const kapanmaKontrol = setInterval(() => {
      if (pencere.closed) {
        temizle()
        reddet(new Error('GitHub penceresi kapatıldı.'))
      }
    }, 500)

    window.addEventListener('message', dinle)
  })
}

export async function githubPencereIleGiris(apiUrl) {
  const pencere = pencereAc(apiUrl + '/auth/github/login')
  if (!pencere) {
    throw new Error('Açılır pencere engellendi. Tarayıcında bu site için açılır pencerelere izin ver.')
  }
  const token = await tokenBekle(pencere, new URL(apiUrl).origin)

  const yanit = await fetch(apiUrl + '/auth/me', { headers: { Authorization: 'Bearer ' + token } })
  if (!yanit.ok) throw new Error('Oturum bilgisi alınamadı.')
  const kullanici = await yanit.json()
  return { ...kullanici, token }
}
