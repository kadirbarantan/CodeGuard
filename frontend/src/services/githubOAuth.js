// GitHub ile giriş ve repo erişimi (gerçek backend): GitHub App, açılır pencerede (ortak akış: oauthPencere.js).
// Backend: /auth/github-app/kur, /auth/github-app/callback — ayrıntı docs/github-app.md (belge 22)
import { pencereIleGiris } from './oauthPencere'

// giris: true → yalnızca kimlik (giriş penceresi); repo erişimi (App kurulumu) istenmez.
// bilet: girişli kullanıcının hesabına bağlamak için backend'den alınan kısa ömürlü bilet (GitHub sekmesi).
// İkisi de yoksa: giriş/kayıt + repo erişimi tek adımda (GitHub sekmesi, giriş yokken).
export function githubAppPencere(apiUrl, { bilet, giris = false } = {}) {
  const parametre = bilet ? '?bilet=' + encodeURIComponent(bilet) : giris ? '?giris=1' : ''
  return pencereIleGiris(apiUrl, 'github-app', 'GitHub', '/auth/github-app/kur' + parametre)
}
