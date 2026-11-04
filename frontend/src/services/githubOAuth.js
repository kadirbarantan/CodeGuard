// GitHub ile giriş (gerçek backend): OAuth akışı açılır pencerede yürür (ortak akış: oauthPencere.js).
// Backend: /auth/github/login, /auth/github/callback — ayrıntı docs/github-oauth.md
import { pencereIleGiris } from './oauthPencere'

export function githubPencereIleGiris(apiUrl) {
  return pencereIleGiris(apiUrl, 'github', 'GitHub')
}
