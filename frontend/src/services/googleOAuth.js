// Google ile giriş (gerçek backend): OpenID Connect akışı açılır pencerede yürür (ortak akış: oauthPencere.js).
// Backend: /auth/google/login, /auth/google/callback — ayrıntı docs/google-oauth.md
import { pencereIleGiris } from './oauthPencere'

export function googlePencereIleGiris(apiUrl) {
  return pencereIleGiris(apiUrl, 'google', 'Google')
}
