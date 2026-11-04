"""Google ile giriş (OpenID Connect, "Authorization Code" akışı + PKCE).

  Frontend (açılır pencere)            Backend (bu dosya)                         Google
  ─────────────────────────            ──────────────────                         ──────
  /auth/google/login'i açar  ──────►   state + PKCE + nonce üretir,     ──────►   hesap seçimi / izin
                                       çereze yazar, yönlendirir                  │ kullanıcı onaylar
                             ◄──────   /auth/google/callback?code&state ◄─────────┘
                                       1. state'i çerezle karşılaştırır (CSRF önlemi)
                                       2. code + code_verifier → id_token (client_secret ile, sunucuda)
                                       3. id_token'ın imzasını Google anahtarlarıyla doğrular;
                                          iss, aud, exp ve nonce'u kontrol eder
                                       4. kullanıcıyı bulur/bağlar/oluşturur, CodeGuard JWT üretir
  token'ı postMessage ile alır ◄────   5. küçük bir HTML sayfası token'ı ana pencereye iletir

Google'ın token'ları yalnızca kimliği doğrulamak için kullanılır ve saklanmaz.
"""
import asyncio
import base64
import hashlib
import secrets
from urllib.parse import urlencode

import httpx
import jwt
from fastapi import APIRouter, Cookie
from fastapi.responses import RedirectResponse

from app import ayarlar
from app.auth.kullanicilar import google_ile_bul_veya_olustur
from app.auth.pencere import pencere_yaniti
from app.auth.token import token_uret

router = APIRouter(prefix="/auth/google", tags=["google"])

YETKI_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
ANAHTAR_URL = "https://www.googleapis.com/oauth2/v3/certs"
GECERLI_ISS = ["https://accounts.google.com", "accounts.google.com"]
# Yalnızca kimlik: OpenID + e-posta + ad. Drive, Gmail vb. istenmez.
KAPSAM = "openid email profile"
STATE_CEREZI = "cg_google_state"
CEREZ_YOLU = "/auth/google"

# Google'ın imza anahtarları (JWKS). PyJWKClient anahtarları önbellekte tutar.
_anahtarlar = jwt.PyJWKClient(ANAHTAR_URL, cache_keys=True)


def _pkce_challenge(verifier: str) -> str:
    ozet = hashlib.sha256(verifier.encode("ascii")).digest()
    return base64.urlsafe_b64encode(ozet).rstrip(b"=").decode("ascii")


@router.get("/login")
def giris():
    state = secrets.token_urlsafe(32)
    verifier = secrets.token_urlsafe(64)  # 86 karakter (PKCE: 43–128)
    nonce = secrets.token_urlsafe(32)
    parametreler = {
        "client_id": ayarlar.GOOGLE_CLIENT_ID,
        "redirect_uri": ayarlar.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": KAPSAM,
        "state": state,
        "nonce": nonce,
        "code_challenge": _pkce_challenge(verifier),
        "code_challenge_method": "S256",
        "prompt": "select_account",
    }
    yanit = RedirectResponse(f"{YETKI_URL}?{urlencode(parametreler)}")
    # Üç değer tek httpOnly çerezde; token_urlsafe "." içermez
    yanit.set_cookie(
        STATE_CEREZI,
        f"{state}.{verifier}.{nonce}",
        max_age=600,
        httponly=True,
        secure=ayarlar.CANLI,
        samesite="lax",
        path=CEREZ_YOLU,
    )
    return yanit


@router.get("/callback")
async def geri_donus(
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    cg_google_state: str | None = Cookie(default=None),
):
    if error:  # kullanıcı Google'da vazgeçti
        return _pencere_yaniti(hata="Google izni verilmedi.")

    parcalar = (cg_google_state or "").split(".")
    if not code or not state or len(parcalar) != 3 or not secrets.compare_digest(state, parcalar[0]):
        return _pencere_yaniti(hata="Güvenlik doğrulaması başarısız. Lütfen tekrar dene.")
    _, verifier, nonce = parcalar

    try:
        async with httpx.AsyncClient(timeout=10) as istemci:
            id_token = await _kodu_id_tokena_cevir(istemci, code, verifier)
        # İmza doğrulaması anahtar indirebilir (eşzamanlı); olay döngüsünü bekletmesin
        bilgi = await asyncio.to_thread(_id_token_dogrula, id_token, nonce)
    except (httpx.HTTPError, jwt.PyJWTError, KeyError, ValueError):
        return _pencere_yaniti(hata="Google ile giriş doğrulanamadı. Lütfen tekrar dene.")

    eposta = bilgi.get("email")
    # Hesap eşleştirme ve yeni hesap için Google'ın DOĞRULADIĞI e-posta şart
    if not eposta or bilgi.get("email_verified") is not True:
        return _pencere_yaniti(hata="Google hesabının e-postası doğrulanmamış.")

    kullanici = google_ile_bul_veya_olustur(
        google_id=bilgi["sub"],
        ad=bilgi.get("name") or "",
        eposta=eposta,
    )
    return _pencere_yaniti(token=token_uret(kullanici["id"]))


async def _kodu_id_tokena_cevir(istemci: httpx.AsyncClient, code: str, verifier: str) -> str:
    yanit = await istemci.post(
        TOKEN_URL,
        data={
            "client_id": ayarlar.GOOGLE_CLIENT_ID,
            "client_secret": ayarlar.GOOGLE_CLIENT_SECRET,
            "code": code,
            "code_verifier": verifier,
            "grant_type": "authorization_code",
            "redirect_uri": ayarlar.GOOGLE_REDIRECT_URI,
        },
    )
    yanit.raise_for_status()  # örn. invalid_grant → 400
    veri = yanit.json()
    if "id_token" not in veri:
        raise ValueError(veri.get("error", "id_token alınamadı"))
    return veri["id_token"]


def _id_token_dogrula(id_token: str, nonce: str) -> dict:
    """İmza (Google JWKS), yayıncı, hedef kitle, süre ve nonce kontrolü. Geçersizse hata fırlatır."""
    anahtar = _anahtarlar.get_signing_key_from_jwt(id_token)
    bilgi = jwt.decode(
        id_token,
        anahtar.key,
        algorithms=["RS256"],
        audience=ayarlar.GOOGLE_CLIENT_ID,
        issuer=GECERLI_ISS,
        options={"require": ["exp", "iat", "iss", "aud", "sub"]},
        leeway=60,
    )
    if not secrets.compare_digest(str(bilgi.get("nonce", "")), nonce):
        raise jwt.InvalidTokenError("nonce eşleşmedi")
    return bilgi


def _pencere_yaniti(token: str | None = None, hata: str | None = None):
    return pencere_yaniti("google", STATE_CEREZI, CEREZ_YOLU, token=token, hata=hata)
