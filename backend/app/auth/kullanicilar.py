"""Kullanıcı deposu — GEÇİCİ (bellekte).

Faz 2'de PostgreSQL + SQLAlchemy'ye taşınacak. Önerilen tablo alanları:
  users: id, ad, eposta (unique), sifre_hash (GitHub/Google ile gelenlerde NULL),
         github_id (unique, NULL olabilir), github_kullanici_adi,
         google_id (unique, NULL olabilir), google_eposta, olusturma_tarihi
Fonksiyon imzaları aynı kalırsa github.py ve google.py değişmez.
"""
import uuid

_kullanicilar: dict[str, dict] = {}


def id_ile_bul(kullanici_id: str) -> dict | None:
    return _kullanicilar.get(kullanici_id)


def github_ile_bul_veya_olustur(github_id: int, kullanici_adi: str, ad: str, eposta: str | None) -> dict:
    """1) Bu GitHub hesabı daha önce bağlandıysa o kullanıcı.
    2) Değilse, GitHub'ın DOĞRULANMIŞ e-postası mevcut bir hesapla eşleşiyorsa o hesaba bağlanır.
    3) Hiçbiri yoksa yeni hesap açılır (şifresiz; yalnızca GitHub ile giriş yapar)."""
    for k in _kullanicilar.values():
        if k.get("github_id") == github_id:
            k["github_kullanici_adi"] = kullanici_adi
            return k

    if eposta:
        for k in _kullanicilar.values():
            if k["eposta"].lower() == eposta.lower():
                k["github_id"] = github_id
                k["github_kullanici_adi"] = kullanici_adi
                return k

    yeni = {
        "id": str(uuid.uuid4()),
        "ad": ad or kullanici_adi,
        # E-postasını gizleyen GitHub kullanıcıları için GitHub'ın no-reply adresi
        "eposta": eposta or f"{github_id}+{kullanici_adi}@users.noreply.github.com",
        "github_id": github_id,
        "github_kullanici_adi": kullanici_adi,
        "profil": None,
    }
    _kullanicilar[yeni["id"]] = yeni
    return yeni


def google_ile_bul_veya_olustur(google_id: str, ad: str, eposta: str) -> dict:
    """eposta: Google'ın DOĞRULADIĞI e-posta (google.py email_verified'ı kontrol eder).
    1) Bu Google hesabı (google_id = id_token "sub") daha önce bağlandıysa o kullanıcı.
    2) Değilse e-posta mevcut bir hesapla eşleşiyorsa (GitHub ile açılmış hesap dahil) o hesaba bağlanır.
    3) Hiçbiri yoksa yeni hesap açılır (şifresiz; yalnızca Google ile giriş yapar)."""
    for k in _kullanicilar.values():
        if k.get("google_id") == google_id:
            k["google_eposta"] = eposta
            return k

    for k in _kullanicilar.values():
        if k["eposta"].lower() == eposta.lower():
            k["google_id"] = google_id
            k["google_eposta"] = eposta
            return k

    yeni = {
        "id": str(uuid.uuid4()),
        "ad": ad or eposta.split("@")[0],
        "eposta": eposta,
        "google_id": google_id,
        "google_eposta": eposta,
        "profil": None,
    }
    _kullanicilar[yeni["id"]] = yeni
    return yeni


def disari_ver(k: dict) -> dict:
    """Frontend'in beklediği biçim (services/api.js ile aynı alanlar)."""
    profil = k.get("profil") or {}
    return {
        "ad": profil.get("ad") or k["ad"],
        "eposta": k["eposta"],
        **profil,
        "profilTamam": bool(profil),
        "github": {"kullaniciAdi": k["github_kullanici_adi"]} if k.get("github_id") else None,
        "google": {"eposta": k["google_eposta"]} if k.get("google_id") else None,
    }
