"""Repo okuma işlemleri (kurulum token'ıyla): repolar, dallar, ağaç, dosya içeriği, arşiv.

Uçlar (router.py) ve test başlatma (calistirma/router.py) bu fonksiyonları kullanır.
"""
import re
import tempfile
import time
import zipfile
from pathlib import Path
from urllib.parse import quote

import httpx

from app import ayarlar
from app.calistirma.yukleme import MAX_BOYUT, MAX_DOSYA, SINIR_MESAJI, Sayac, YuklemeHatasi, guvenli_yol
from app.github import baglam as baglam_cozumleyici
from app.github.uygulama import ULASILAMADI, GithubHatasi, basliklar, kurulum_get, kurulum_tokeni

REPO_DESENI = re.compile(r"^[A-Za-z0-9_.-]{1,100}/[A-Za-z0-9_.-]{1,100}$")
# GitHub'ın dil adı → sitedeki dil kodu (Dil seçicisinde ön seçim için)
DILLER = {"Python": "python", "JavaScript": "js", "TypeScript": "js", "Vue": "js", "C#": "csharp", "PHP": "php"}
# Bağlam için içeriği okunan tek dosyanın sınırı (büyük dosyalar import taramasına girmez)
OKUMA_SINIRI = 512 * 1024
# İndirilen arşivin (sıkıştırılmış) sınırı; açıldıktan sonra yine 5 MB / 200 dosya uygulanır
ARSIV_SINIRI = 100 * 1024 * 1024

BULUNAMADI = "Repo ya da dal bulunamadı. Repoya erişim verdiğinden emin ol."


def repo_dogrula(repo: str) -> str:
    if not REPO_DESENI.match(repo or "") or ".." in repo:
        raise GithubHatasi("Geçersiz repo adı.", 400)
    return repo


def dal_dogrula(dal: str) -> str:
    if not dal or len(dal) > 255 or any(c in dal for c in "\x00 ~^:?*[\\") or ".." in dal:
        raise GithubHatasi("Geçersiz dal adı.", 400)
    return dal


async def _json(kurulum_id: int, yol: str, params: dict | None = None):
    yanit = await kurulum_get(kurulum_id, yol, params)
    if yanit.status_code in (404, 409, 422):  # yok, erişim yok ya da boş repo
        raise GithubHatasi(BULUNAMADI, 404)
    if yanit.status_code != 200:
        raise GithubHatasi(ULASILAMADI)
    return yanit.json()


async def repolar(kurulum_id: int) -> list[dict]:
    """→ [{ ad: 'sahip/repo', gizli, dil }] (en son güncellenen ilk)"""
    liste = []
    for sayfa in range(1, 6):  # en fazla 500 repo
        veri = await _json(kurulum_id, "/installation/repositories", {"per_page": 100, "page": sayfa})
        liste += veri.get("repositories", [])
        if len(liste) >= veri.get("total_count", 0) or not veri.get("repositories"):
            break
    liste.sort(key=lambda r: r.get("pushed_at") or "", reverse=True)
    return [{"ad": r["full_name"], "gizli": bool(r.get("private")), "dil": DILLER.get(r.get("language"))} for r in liste]


async def dallar(kurulum_id: int, repo: str) -> list[dict]:
    """→ [{ ad, commit }] (varsayılan dal ilk sırada; commit kısa SHA)"""
    repo = repo_dogrula(repo)
    bilgi = await _json(kurulum_id, f"/repos/{repo}")
    liste = []
    for sayfa in range(1, 4):
        parca = await _json(kurulum_id, f"/repos/{repo}/branches", {"per_page": 100, "page": sayfa})
        liste += parca
        if len(parca) < 100:
            break
    varsayilan = bilgi.get("default_branch")
    liste.sort(key=lambda d: d["name"] != varsayilan)
    return [{"ad": d["name"], "commit": d["commit"]["sha"][:7]} for d in liste]


async def dal_commiti(kurulum_id: int, repo: str, dal: str) -> str:
    """Dalın şu anki commit'inin tam SHA'sı."""
    veri = await _json(kurulum_id, f"/repos/{repo_dogrula(repo)}/git/ref/heads/{quote(dal_dogrula(dal), safe='/')}")
    if (veri.get("object") or {}).get("type") != "commit":
        raise GithubHatasi(BULUNAMADI, 404)
    return veri["object"]["sha"]


async def agac(kurulum_id: int, repo: str, dal: str) -> tuple[str, list[dict]]:
    """→ (commit SHA, [{ yol, boyut, sha }]). Yalnızca dosyalar; sembolik bağlantı ve alt modüller atlanır.
    İçerik indirilmez (Trees API)."""
    commit = await dal_commiti(kurulum_id, repo, dal)
    veri = await _json(kurulum_id, f"/repos/{repo}/git/trees/{commit}", {"recursive": "1"})
    dosyalar = [
        {"yol": d["path"], "boyut": d.get("size", 0), "sha": d["sha"]}
        for d in veri.get("tree", [])
        if d.get("type") == "blob" and d.get("mode") != "120000"
    ]
    return commit, dosyalar


# Dosya içerikleri değişmez (blob SHA'sı içeriğin özeti): kısa süreli bellek önbelleği
_ICERIKLER: dict[str, tuple[str | None, float]] = {}
_ONBELLEK_SURESI = 30 * 60


async def blob_oku(kurulum_id: int, repo: str, sha: str, boyut: int) -> str | None:
    if boyut > OKUMA_SINIRI:
        return None
    if (kayit := _ICERIKLER.get(sha)) and time.time() - kayit[1] < _ONBELLEK_SURESI:
        return kayit[0]
    yanit = await kurulum_get(kurulum_id, f"/repos/{repo}/git/blobs/{sha}", kabul="application/vnd.github.raw+json")
    metin = yanit.content.decode("utf-8", errors="replace") if yanit.status_code == 200 else None
    if len(_ICERIKLER) > 2000:
        _ICERIKLER.clear()
    _ICERIKLER[sha] = (metin, time.time())
    return metin


async def baglam_hesapla(kurulum_id: int, repo: str, dal: str, secilenler: list[str], tur: list[str]) -> dict:
    """Sitedeki "Otomatik eklenen" listesi. Dosyalar GitHub'dan tek tek okunur (yalnızca gerekenler)."""
    _commit, dosyalar = await agac(kurulum_id, repo, dal)
    bilgiler = {d["yol"]: d for d in dosyalar}

    async def oku(yol: str) -> str | None:
        d = bilgiler.get(yol)
        return await blob_oku(kurulum_id, repo, d["sha"], d["boyut"]) if d else None

    return await baglam_cozumleyici.coz(bilgiler, secilenler, tur, oku)


async def _arsivi_indir(kurulum_id: int, repo: str, commit: str, hedef_dosya: Path) -> None:
    """GET /repos/{repo}/zipball/{commit} → GitHub geçici bir indirme adresine yönlendirir."""
    token = await kurulum_tokeni(kurulum_id)
    try:
        # httpx, başka bir sunucuya yönlendirmede Authorization başlığını göndermez
        async with httpx.AsyncClient(timeout=httpx.Timeout(60.0, connect=10.0), follow_redirects=True) as istemci:
            async with istemci.stream(
                "GET", f"{ayarlar.GITHUB_API_URL}/repos/{repo}/zipball/{commit}", headers=basliklar(token)
            ) as yanit:
                if yanit.status_code == 404:
                    raise GithubHatasi(BULUNAMADI, 404)
                if yanit.status_code != 200:
                    raise GithubHatasi(ULASILAMADI)
                boyut = 0
                with open(hedef_dosya, "wb") as cikti:
                    async for parca in yanit.aiter_bytes():
                        boyut += len(parca)
                        if boyut > ARSIV_SINIRI:
                            raise GithubHatasi("Repo arşivi çok büyük (100 MB üstü). Daha küçük bir repo dene.", 413)
                        cikti.write(parca)
    except httpx.HTTPError as h:
        raise GithubHatasi(ULASILAMADI) from h


async def repodan_hazirla(
    kurulum_id: int, repo: str, dal: str, secilenler: list[str], tur: list[str], hedef: Path
) -> dict:
    """Test başlatma: dalın son commit'ini zip arşivi olarak indirir (git clone değil), hedef + bağlam
    dosyalarını `hedef` klasörüne açar. Sonrası dosya yüklemeyle aynıdır.
    Bağlam burada arşivden yeniden hesaplanır; sitenin gönderdiği listeye güvenilmez.
    → { proje, commit, secilenler, baglam }"""
    repo = repo_dogrula(repo)
    commit = await dal_commiti(kurulum_id, repo, dal)
    with tempfile.TemporaryDirectory(prefix="cg-arsiv-") as gecici:
        arsiv = Path(gecici) / "repo.zip"
        await _arsivi_indir(kurulum_id, repo, commit, arsiv)
        try:
            zf = zipfile.ZipFile(arsiv)
        except zipfile.BadZipFile as h:
            raise GithubHatasi("Repo arşivi açılamadı. Lütfen tekrar dene.") from h
        with zf:
            # Arşivdeki her yol "sahip-repo-sha/" ile başlar; o klasör atılır
            uyeler: dict[str, zipfile.ZipInfo] = {}
            for bilgi in zf.infolist():
                if bilgi.is_dir() or (bilgi.external_attr >> 16) & 0o170000 == 0o120000:
                    continue
                parcalar = guvenli_yol(bilgi.filename)
                if parcalar and len(parcalar) > 1:
                    uyeler["/".join(parcalar[1:])] = bilgi

            async def oku(yol: str) -> str | None:
                b = uyeler.get(yol)
                if not b or b.file_size > OKUMA_SINIRI:
                    return None
                return zf.read(b).decode("utf-8", errors="replace")

            hedefler = [s for s in dict.fromkeys(secilenler) if s in uyeler and not baglam_cozumleyici.haric_mi(s)]
            if not hedefler:
                raise GithubHatasi("Seçilen dosyalar bu dalda bulunamadı; dal güncellenmiş olabilir. Seçimi yenile.", 409)
            sonuc = await baglam_cozumleyici.coz(uyeler, hedefler, tur, oku)
            baglam = [b["yol"] for b in sonuc["baglam"]]
            if len(hedefler) + len(baglam) > MAX_DOSYA:
                raise YuklemeHatasi(SINIR_MESAJI, 413)

            sayac = Sayac()
            for yol in [*hedefler, *baglam]:
                parcalar = guvenli_yol(yol)
                if parcalar is None:
                    continue
                if sayac.boyut + uyeler[yol].file_size > MAX_BOYUT:
                    raise YuklemeHatasi(SINIR_MESAJI, 413)
                with zf.open(uyeler[yol]) as icerik:
                    sayac.kopyala(icerik, hedef.joinpath(*parcalar))
    return {"proje": repo.split("/")[1], "commit": commit, "secilenler": hedefler, "baglam": baglam}
