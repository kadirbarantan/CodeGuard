"""GitHub App olarak GitHub API'ye istek atmak.

  1. Uygulama JWT'si: App'in özel anahtarıyla (.pem, RS256) imzalanır, en fazla 10 dakika geçerli.
  2. Kurulum token'ı: JWT ile POST /app/installations/{id}/access_tokens → 1 saat geçerli,
     yalnızca kullanıcının erişim verdiği repolara ve yalnızca App'in izinlerine (Contents: okuma) sahip.
     Bellekte saklanır, süresi dolmadan yenilenir. Veritabanına yazılmaz.

Kullanıcının kendi GitHub token'ı burada kullanılmaz; o yalnızca girişte kimliği öğrenmek için (auth/github_app.py).
"""
import time
from pathlib import Path

import httpx
import jwt

from app import ayarlar

API_SURUMU = "2022-11-28"
ZAMAN_ASIMI = httpx.Timeout(15.0, connect=10.0)


class GithubHatasi(Exception):
    """Kullanıcıya gösterilecek Türkçe mesaj + HTTP kodu."""

    def __init__(self, mesaj: str, kod: int = 502):
        super().__init__(mesaj)
        self.mesaj, self.kod = mesaj, kod


class KurulumYok(GithubHatasi):
    """App kurulumu yok ya da kullanıcı App'i GitHub'da kaldırmış (410: site "Repolarına erişim ver"e döner)."""

    def __init__(self):
        super().__init__("Repolarına erişim izni yok ya da GitHub'da kaldırılmış. Tekrar erişim ver.", 410)


ULASILAMADI = "GitHub'a ulaşılamadı. Biraz sonra tekrar dene."


def ayarlar_tamam() -> bool:
    return bool(
        ayarlar.GITHUB_APP_ID
        and ayarlar.GITHUB_APP_SLUG
        and ayarlar.GITHUB_APP_CLIENT_ID
        and ayarlar.GITHUB_APP_CLIENT_SECRET
        and ayarlar.GITHUB_APP_PRIVATE_KEY_PATH
    )


_anahtar_onbellek: tuple[str, str] | None = None  # (yol, içerik)


def _ozel_anahtar() -> str:
    global _anahtar_onbellek
    yol = ayarlar.GITHUB_APP_PRIVATE_KEY_PATH
    if _anahtar_onbellek and _anahtar_onbellek[0] == yol:
        return _anahtar_onbellek[1]
    try:
        icerik = Path(yol).expanduser().read_text(encoding="ascii")
    except (OSError, ValueError) as h:
        raise GithubHatasi("GitHub App özel anahtarı okunamadı (backend/.env: GITHUB_APP_PRIVATE_KEY_PATH).", 503) from h
    _anahtar_onbellek = (yol, icerik)
    return icerik


def uygulama_jwt() -> str:
    simdi = int(time.time())
    # iat 60 sn geriden: bilgisayar saati GitHub'ınkinden biraz ileride olsa da kabul edilsin
    yuk = {"iat": simdi - 60, "exp": simdi + 9 * 60, "iss": str(ayarlar.GITHUB_APP_ID)}
    try:
        return jwt.encode(yuk, _ozel_anahtar(), algorithm="RS256")
    except (ValueError, TypeError) as h:
        raise GithubHatasi("GitHub App özel anahtarı geçersiz; .pem dosyasını kontrol et.", 503) from h


def basliklar(token: str, kabul: str = "application/vnd.github+json") -> dict:
    return {"Authorization": f"Bearer {token}", "Accept": kabul, "X-GitHub-Api-Version": API_SURUMU}


# kurulum_id → (token, geçerlilik sonu, epoch sn)
_kurulum_tokenlari: dict[int, tuple[str, float]] = {}


async def kurulum_tokeni(kurulum_id: int, yenile: bool = False) -> str:
    kayit = _kurulum_tokenlari.get(kurulum_id)
    if kayit and not yenile and kayit[1] - time.time() > 300:
        return kayit[0]
    try:
        async with httpx.AsyncClient(timeout=ZAMAN_ASIMI) as istemci:
            yanit = await istemci.post(
                f"{ayarlar.GITHUB_API_URL}/app/installations/{kurulum_id}/access_tokens",
                headers=basliklar(uygulama_jwt()),
            )
    except httpx.HTTPError as h:
        raise GithubHatasi(ULASILAMADI) from h
    if yanit.status_code in (403, 404):  # kurulum kaldırılmış ya da askıya alınmış
        _kurulum_tokenlari.pop(kurulum_id, None)
        raise KurulumYok()
    if yanit.status_code == 401:
        raise GithubHatasi("GitHub App kimliği doğrulanamadı (App ID ya da .pem yanlış olabilir).", 503)
    if yanit.status_code != 201:
        raise GithubHatasi(ULASILAMADI)
    veri = yanit.json()
    # expires_at: "2026-11-27T15:00:00Z"; ayrıştırmak yerine güvenli bir süre (55 dk) kabul edilir
    _kurulum_tokenlari[kurulum_id] = (veri["token"], time.time() + 55 * 60)
    return veri["token"]


async def kurulum_get(
    kurulum_id: int, yol: str, params: dict | None = None, kabul: str = "application/vnd.github+json"
) -> httpx.Response:
    """Kurulum token'ıyla GET. 401'de token bir kez yenilenir. 404'ü çağıran yorumlar."""
    for deneme in range(2):
        token = await kurulum_tokeni(kurulum_id, yenile=deneme > 0)
        try:
            async with httpx.AsyncClient(timeout=ZAMAN_ASIMI) as istemci:
                yanit = await istemci.get(f"{ayarlar.GITHUB_API_URL}{yol}", params=params, headers=basliklar(token, kabul))
        except httpx.HTTPError as h:
            raise GithubHatasi(ULASILAMADI) from h
        if yanit.status_code != 401:
            break
    if yanit.status_code == 403 and yanit.headers.get("x-ratelimit-remaining") == "0":
        raise GithubHatasi("GitHub istek sınırına ulaşıldı. Birkaç dakika sonra tekrar dene.", 429)
    if yanit.status_code >= 500 or yanit.status_code in (401, 403):
        raise GithubHatasi(ULASILAMADI)
    return yanit
