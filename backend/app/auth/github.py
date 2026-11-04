"""GitHub ile giriş (OAuth 2.0, "Authorization Code" akışı).

  Frontend (açılır pencere)            Backend (bu dosya)                     GitHub
  ─────────────────────────            ──────────────────                     ──────
  /auth/github/login'i açar  ──────►   state üretir, çereze yazar  ──────►   izin ekranı
                                                                              │ kullanıcı onaylar
                             ◄──────   /auth/github/callback?code&state ◄─────┘
                                       1. state'i çerezle karşılaştırır (CSRF önlemi)
                                       2. code → GitHub access token (client_secret ile, sunucuda)
                                       3. GitHub'dan kullanıcı + doğrulanmış e-posta
                                       4. kullanıcıyı bulur/oluşturur, CodeGuard JWT üretir
  token'ı postMessage ile alır ◄────   5. küçük bir HTML sayfası token'ı ana pencereye iletir

GitHub'ın access token'ı yalnızca kimlik bilgisini okumak için kullanılır ve saklanmaz.
"""
import secrets
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Cookie
from fastapi.responses import RedirectResponse

from app import ayarlar
from app.auth.kullanicilar import github_ile_bul_veya_olustur
from app.auth.pencere import pencere_yaniti
from app.auth.token import token_uret

router = APIRouter(prefix="/auth/github", tags=["github"])

YETKI_URL = "https://github.com/login/oauth/authorize"
TOKEN_URL = "https://github.com/login/oauth/access_token"
API_URL = "https://api.github.com"
# Yalnızca kimlik: profil + e-posta. Repo erişimi istenmez.
KAPSAM = "read:user user:email"
STATE_CEREZI = "cg_github_state"


@router.get("/login")
def giris():
    state = secrets.token_urlsafe(32)
    parametreler = {
        "client_id": ayarlar.GITHUB_CLIENT_ID,
        "redirect_uri": ayarlar.GITHUB_REDIRECT_URI,
        "scope": KAPSAM,
        "state": state,
        "allow_signup": "true",
    }
    yanit = RedirectResponse(f"{YETKI_URL}?{urlencode(parametreler)}")
    yanit.set_cookie(
        STATE_CEREZI,
        state,
        max_age=600,
        httponly=True,
        secure=ayarlar.CANLI,
        samesite="lax",
        path="/auth/github",
    )
    return yanit


@router.get("/callback")
async def geri_donus(
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    cg_github_state: str | None = Cookie(default=None),
):
    if error:  # kullanıcı GitHub'da "Cancel" dedi
        return _pencere_yaniti(hata="GitHub izni verilmedi.")
    if not code or not state or not cg_github_state or not secrets.compare_digest(state, cg_github_state):
        return _pencere_yaniti(hata="Güvenlik doğrulaması başarısız. Lütfen tekrar dene.")

    try:
        async with httpx.AsyncClient(timeout=10) as istemci:
            gh_token = await _kodu_tokena_cevir(istemci, code)
            basliklar = {"Authorization": f"Bearer {gh_token}", "Accept": "application/vnd.github+json"}
            profil = (await istemci.get(f"{API_URL}/user", headers=basliklar)).raise_for_status().json()
            epostalar = (await istemci.get(f"{API_URL}/user/emails", headers=basliklar)).raise_for_status().json()
    except (httpx.HTTPError, KeyError, ValueError):
        return _pencere_yaniti(hata="GitHub'a ulaşılamadı. Lütfen tekrar dene.")

    # Hesap eşleştirmede yalnızca GitHub'ın DOĞRULANMIŞ birincil e-postası kullanılır
    eposta = next((e["email"] for e in epostalar if e.get("primary") and e.get("verified")), None)

    kullanici = github_ile_bul_veya_olustur(
        github_id=profil["id"],
        kullanici_adi=profil["login"],
        ad=profil.get("name") or "",
        eposta=eposta,
    )
    return _pencere_yaniti(token=token_uret(kullanici["id"]))


async def _kodu_tokena_cevir(istemci: httpx.AsyncClient, code: str) -> str:
    yanit = await istemci.post(
        TOKEN_URL,
        headers={"Accept": "application/json"},
        data={
            "client_id": ayarlar.GITHUB_CLIENT_ID,
            "client_secret": ayarlar.GITHUB_CLIENT_SECRET,
            "code": code,
            "redirect_uri": ayarlar.GITHUB_REDIRECT_URI,
        },
    )
    yanit.raise_for_status()
    veri = yanit.json()
    if "access_token" not in veri:  # örn. bad_verification_code
        raise ValueError(veri.get("error", "token alınamadı"))
    return veri["access_token"]


def _pencere_yaniti(token: str | None = None, hata: str | None = None):
    """Sonucu ana pencereye iletir (ortak sayfa: pencere.py)."""
    return pencere_yaniti("github", STATE_CEREZI, "/auth/github", token=token, hata=hata)
