"""GitHub App ile giriş ve bağlanma (belge 22).

İki kullanım:
- `kur?giris=1`: giriş penceresindeki "GitHub ile giriş / kayıt ol". Yalnızca kimlik; App kurulu değilse
  kurulum istenmez (repo erişimi GitHub sekmesinde ayrıca verilir).
- `kur` (ya da `kur?bilet=`): GitHub sekmesi. Kimliğin yanında App kurulumunu (kullanıcının seçtiği
  repolara salt okunur erişim) da kaydeder; kurulum yoksa kurulum ekranına geçer.
Eski OAuth App girişi (github.py) artık siteden çağrılmıyor (27.11.2026).

  Site (açılır pencere)                Backend (bu dosya)                         GitHub
  ─────────────────────                ──────────────────                         ──────
  [girişliyse önce POST /bilet]
  /auth/github-app/kur?bilet= ───────► imzalı çerez (state + bağlanacak kullanıcı) ─► App yetki ekranı
                                       /callback?code&state  ◄────────────────────────┘
                                       1. state çerezle aynı mı (CSRF)
                                       2. code → kullanıcı token'ı (yalnızca burada, saklanmaz)
                                       3. /user, /user/emails, /user/installations
                                       4a. kurulum var → kullanıcıyı bul/bağla/oluştur, kurulumu kaydet
                                       4b. kurulum yok → çereze "kurulum bekleniyor" yazılır ──► App kurulum ekranı
                                                                                      │ kullanıcı repoları seçer
                                       /callback?code&installation_id  ◄──────────────┘
                                          (GitHub bu dönüşte state göndermez; çerezdeki GitHub
                                           kimliği yeni code'un sahibiyle aynı olmalı)
  token'ı postMessage ile alır ◄────── 5. pencere.py: CodeGuard JWT ana pencereye

Güvenlik:
- URL'deki installation_id'ye güvenilmez (GitHub uyarısı); kurulum kullanıcının kendi token'ıyla
  /user/installations'tan doğrulanır.
- Bağlanacak kullanıcı, sitenin Bearer token'ıyla alınan 5 dakikalık imzalı bir biletle gelir.
"""
import secrets
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Cookie, Depends
from fastapi.responses import HTMLResponse, RedirectResponse

from app import ayarlar
from app.auth.kullanicilar import BaglamaHatasi, github_bagla, github_ile_bul_veya_olustur
from app.auth.oturum import aktif_kullanici
from app.auth.pencere import pencere_yaniti
from app.auth.token import kisa_coz, kisa_imzala, token_uret
from app.github.uygulama import ayarlar_tamam, basliklar

router = APIRouter(prefix="/auth/github-app", tags=["github"])

CEREZ = "cg_ghapp"
CEREZ_YOLU = "/auth/github-app"
BILET_AMACI = "github-bagla"
CEREZ_AMACI = "github-app-akis"


@router.post("/bilet")
def bilet(kullanici: dict = Depends(aktif_kullanici)):
    """Girişli kullanıcı GitHub hesabını bağlarken: açılır pencereye verilecek 5 dakikalık bilet."""
    return {"bilet": kisa_imzala(BILET_AMACI, 5, sub=kullanici["id"])}


@router.get("/kur")
def kur(bilet: str | None = None, giris: bool = False):
    if not ayarlar_tamam():
        return _pencere(hata="GitHub App ayarları eksik (backend/.env). Ayrıntı: docs/github-app.md")
    baglanacak = None
    if bilet:
        yuk = kisa_coz(bilet, BILET_AMACI)
        if not yuk:
            return _pencere(hata="Bağlantı süresi doldu. Lütfen tekrar dene.")
        baglanacak = yuk["sub"]
    state = secrets.token_urlsafe(32)
    parametreler = {
        "client_id": ayarlar.GITHUB_APP_CLIENT_ID,
        "redirect_uri": ayarlar.GITHUB_APP_REDIRECT_URI,
        "state": state,
        "allow_signup": "true",
    }
    yanit = RedirectResponse(f"{ayarlar.GITHUB_WEB_URL}/login/oauth/authorize?{urlencode(parametreler)}")
    _cerez_yaz(yanit, adim="yetki", state=state, kullanici=baglanacak, giris=giris and not baglanacak)
    return yanit


@router.get("/callback")
async def geri_donus(
    code: str | None = None,
    state: str | None = None,
    installation_id: str | None = None,
    setup_action: str | None = None,
    error: str | None = None,
    cg_ghapp: str | None = Cookie(default=None),
):
    akis = kisa_coz(cg_ghapp, CEREZ_AMACI)
    if error:  # kullanıcı GitHub'da "Cancel" dedi
        return _pencere(hata="GitHub izni verilmedi.")
    if not akis:
        if setup_action in ("install", "update"):
            # GitHub ayarlarından repo listesi değiştirildi (bizim pencere açılmadan): yapılacak bir şey yok
            return _bilgi_sayfasi("GitHub ayarların kaydedildi. Bu pencereyi kapatıp CodeGuard'a dönebilirsin.")
        return _pencere(hata="Güvenlik doğrulaması başarısız. Lütfen tekrar dene.")
    if not code:
        return _pencere(hata="GitHub'dan dönüş eksik. Lütfen tekrar dene.")

    if akis["adim"] == "yetki":
        if not state or not secrets.compare_digest(state, akis.get("state") or ""):
            return _pencere(hata="Güvenlik doğrulaması başarısız. Lütfen tekrar dene.")
    elif akis["adim"] != "kurulum":
        return _pencere(hata="Güvenlik doğrulaması başarısız. Lütfen tekrar dene.")

    try:
        async with httpx.AsyncClient(timeout=10) as istemci:
            gh_token = await _kodu_tokena_cevir(istemci, code)
            b = basliklar(gh_token)
            profil = (await istemci.get(f"{ayarlar.GITHUB_API_URL}/user", headers=b)).raise_for_status().json()
            epostalar = (await istemci.get(f"{ayarlar.GITHUB_API_URL}/user/emails", headers=b)).raise_for_status().json()
            kurulumlar = (
                (await istemci.get(f"{ayarlar.GITHUB_API_URL}/user/installations", headers=b, params={"per_page": 100}))
                .raise_for_status()
                .json()
                .get("installations", [])
            )
    except (httpx.HTTPError, KeyError, ValueError):
        return _pencere(hata="GitHub'a ulaşılamadı. Lütfen tekrar dene.")

    # Kurulum adımından dönüldüyse code'un sahibi ilk adımdaki GitHub hesabı olmalı
    if akis["adim"] == "kurulum" and akis.get("gh") != profil["id"]:
        return _pencere(hata="Güvenlik doğrulaması başarısız. Lütfen tekrar dene.")

    kurulum = _kurulum_sec(kurulumlar, profil["login"], installation_id)
    if not kurulum and not akis.get("giris"):
        if akis["adim"] == "kurulum":
            return _pencere(hata="Repo erişimi verilmedi. GitHub'da en az bir repo seçip kurulumu tamamla.")
        # Henüz kurulum yok: App'in kurulum ekranına geç (repoları kullanıcı seçer)
        yanit = RedirectResponse(f"{ayarlar.GITHUB_WEB_URL}/apps/{ayarlar.GITHUB_APP_SLUG}/installations/new")
        _cerez_yaz(yanit, adim="kurulum", gh=profil["id"], kullanici=akis.get("kullanici"))
        return yanit

    if akis.get("kullanici"):  # e-postayla girmiş kullanıcının hesabına bağla
        try:
            kullanici = github_bagla(akis["kullanici"], profil["id"], profil["login"], kurulum)
        except BaglamaHatasi as h:
            return _pencere(hata=str(h))
    else:
        # Hesap eşleştirmede yalnızca GitHub'ın DOĞRULANMIŞ birincil e-postası kullanılır
        eposta = next((e["email"] for e in epostalar if e.get("primary") and e.get("verified")), None)
        kullanici = github_ile_bul_veya_olustur(
            github_id=profil["id"],
            kullanici_adi=profil["login"],
            ad=profil.get("name") or "",
            eposta=eposta,
            kurulum_id=kurulum,
            github_app=True,
        )
    return _pencere(token=token_uret(kullanici["id"]))


def _kurulum_sec(kurulumlar: list[dict], login: str, istenen: str | None) -> int | None:
    """Kullanıcının erişebildiği kurulumlardan biri: URL'deki (doğrulanmış) → kendi hesabındaki → ilk."""
    kimlikler = [k["id"] for k in kurulumlar if k.get("id")]
    if istenen and istenen.isdigit() and int(istenen) in kimlikler:
        return int(istenen)
    kendi = next((k["id"] for k in kurulumlar if (k.get("account") or {}).get("login") == login), None)
    return kendi or (kimlikler[0] if kimlikler else None)


async def _kodu_tokena_cevir(istemci: httpx.AsyncClient, code: str) -> str:
    yanit = await istemci.post(
        f"{ayarlar.GITHUB_WEB_URL}/login/oauth/access_token",
        headers={"Accept": "application/json"},
        data={
            "client_id": ayarlar.GITHUB_APP_CLIENT_ID,
            "client_secret": ayarlar.GITHUB_APP_CLIENT_SECRET,
            "code": code,
            "redirect_uri": ayarlar.GITHUB_APP_REDIRECT_URI,
        },
    )
    yanit.raise_for_status()
    veri = yanit.json()
    if "access_token" not in veri:  # örn. bad_verification_code
        raise ValueError(veri.get("error", "token alınamadı"))
    return veri["access_token"]


def _cerez_yaz(yanit, **veri) -> None:
    yanit.set_cookie(
        CEREZ,
        kisa_imzala(CEREZ_AMACI, 20, **veri),
        max_age=20 * 60,
        httponly=True,
        secure=ayarlar.CANLI,
        samesite="lax",
        path=CEREZ_YOLU,
    )


def _pencere(token: str | None = None, hata: str | None = None):
    return pencere_yaniti("github-app", CEREZ, CEREZ_YOLU, token=token, hata=hata)


def _bilgi_sayfasi(metin: str) -> HTMLResponse:
    return HTMLResponse(
        f'<!doctype html><html lang="tr"><meta charset="utf-8"><title>CodeGuard</title>'
        f'<body style="font-family:system-ui;padding:24px;color:#0F172A"><p>{metin}</p></body></html>',
        headers={"Cache-Control": "no-store"},
    )
