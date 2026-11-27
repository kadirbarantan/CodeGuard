"""Kullanıcı deposu (PostgreSQL, tablo: kullanicilar — bkz. app/modeller.py).

Fonksiyonlar sözlük döner; github.py, google.py ve oturum.py veritabanını bilmek zorunda kalmaz.
Her fonksiyon kendi kısa veritabanı oturumunu açar.
"""
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.db import oturum_ac
from app.modeller import Kullanici


def _sozluk(k: Kullanici) -> dict:
    return {
        "id": k.id,
        "ad": k.ad,
        "eposta": k.eposta,
        "sifre_hash": k.sifre_hash,
        "github_id": k.github_id,
        "github_kullanici_adi": k.github_kullanici_adi,
        "github_kurulum_id": k.github_kurulum_id,
        "google_id": k.google_id,
        "google_eposta": k.google_eposta,
        "profil": k.profil,
    }


def _eposta_ile(db, eposta: str) -> Kullanici | None:
    return db.scalar(select(Kullanici).where(Kullanici.eposta == eposta.strip().lower()))


def id_ile_bul(kullanici_id: str) -> dict | None:
    with oturum_ac() as db:
        k = db.get(Kullanici, kullanici_id)
        return _sozluk(k) if k else None


def eposta_ile_bul(eposta: str) -> dict | None:
    with oturum_ac() as db:
        k = _eposta_ile(db, eposta)
        return _sozluk(k) if k else None


def eposta_ile_olustur(ad: str, eposta: str, sifre_hash: str) -> dict | None:
    """E-posta + şifreyle kayıt. Bu e-postayla hesap zaten varsa None döner."""
    with oturum_ac() as db:
        if _eposta_ile(db, eposta):
            return None
        k = Kullanici(ad=ad.strip(), eposta=eposta.strip().lower(), sifre_hash=sifre_hash)
        db.add(k)
        try:
            db.commit()
        except IntegrityError:  # aynı anda iki kayıt isteği
            return None
        return _sozluk(k)


def github_ile_bul_veya_olustur(
    github_id: int, kullanici_adi: str, ad: str, eposta: str | None, kurulum_id: int | None = None, github_app: bool = False
) -> dict:
    """1) Bu GitHub hesabı daha önce bağlandıysa o kullanıcı.
    2) Değilse, GitHub'ın DOĞRULANMIŞ e-postası mevcut bir hesapla eşleşiyorsa o hesaba bağlanır.
    3) Hiçbiri yoksa yeni hesap açılır (şifresiz; yalnızca GitHub ile giriş yapar).
    github_app: GitHub App ile gelindi; kurulum_id GitHub'ın o anki bilgisidir (None: kurulum yok) ve kaydedilir."""
    with oturum_ac() as db:
        k = db.scalar(select(Kullanici).where(Kullanici.github_id == github_id))
        if not k and eposta:
            k = _eposta_ile(db, eposta)
        if k:
            k.github_id = github_id
            k.github_kullanici_adi = kullanici_adi
            if github_app:
                k.github_kurulum_id = kurulum_id
        else:
            k = Kullanici(
                ad=ad or kullanici_adi,
                # E-postasını gizleyen GitHub kullanıcıları için GitHub'ın no-reply adresi
                eposta=(eposta or f"{github_id}+{kullanici_adi}@users.noreply.github.com").lower(),
                github_id=github_id,
                github_kullanici_adi=kullanici_adi,
                github_kurulum_id=kurulum_id,
            )
            db.add(k)
        db.commit()
        return _sozluk(k)


class BaglamaHatasi(ValueError):
    """GitHub hesabı bu kullanıcıya bağlanamıyor; mesaj kullanıcıya gösterilir."""


def github_bagla(kullanici_id: str, github_id: int, kullanici_adi: str, kurulum_id: int) -> dict:
    """Giriş yapmış kullanıcının hesabına GitHub hesabını ve App kurulumunu bağlar (GitHub sekmesi, durum 2–3)."""
    with oturum_ac() as db:
        k = db.get(Kullanici, kullanici_id)
        if not k:
            raise BaglamaHatasi("Oturum bulunamadı. Lütfen tekrar giriş yap.")
        if k.github_id and k.github_id != github_id:
            raise BaglamaHatasi(
                f"Hesabına başka bir GitHub hesabı bağlı (@{k.github_kullanici_adi}). GitHub'da o hesapla giriş yapıp tekrar dene."
            )
        baska = db.scalar(select(Kullanici).where(Kullanici.github_id == github_id, Kullanici.id != kullanici_id))
        if baska:
            raise BaglamaHatasi("Bu GitHub hesabı başka bir CodeGuard hesabına bağlı. O hesapla GitHub ile giriş yap.")
        k.github_id = github_id
        k.github_kullanici_adi = kullanici_adi
        k.github_kurulum_id = kurulum_id
        db.commit()
        return _sozluk(k)


def github_kurulumu_sil(kullanici_id: str) -> None:
    """Kullanıcı App'i GitHub'da kaldırdıysa: repo erişimi yok sayılır (GitHub hesabı bağlı kalır)."""
    with oturum_ac() as db:
        k = db.get(Kullanici, kullanici_id)
        if k and k.github_kurulum_id:
            k.github_kurulum_id = None
            db.commit()


def google_ile_bul_veya_olustur(google_id: str, ad: str, eposta: str) -> dict:
    """eposta: Google'ın DOĞRULADIĞI e-posta (google.py email_verified'ı kontrol eder).
    1) Bu Google hesabı (google_id = id_token "sub") daha önce bağlandıysa o kullanıcı.
    2) Değilse e-posta mevcut bir hesapla eşleşiyorsa (GitHub ile açılmış hesap dahil) o hesaba bağlanır.
    3) Hiçbiri yoksa yeni hesap açılır (şifresiz; yalnızca Google ile giriş yapar)."""
    with oturum_ac() as db:
        k = db.scalar(select(Kullanici).where(Kullanici.google_id == google_id)) or _eposta_ile(db, eposta)
        if k:
            k.google_id = google_id
            k.google_eposta = eposta
        else:
            k = Kullanici(
                ad=ad or eposta.split("@")[0],
                eposta=eposta.lower(),
                google_id=google_id,
                google_eposta=eposta,
            )
            db.add(k)
        db.commit()
        return _sozluk(k)


def profil_guncelle(kullanici_id: str, profil: dict) -> dict | None:
    with oturum_ac() as db:
        k = db.get(Kullanici, kullanici_id)
        if not k:
            return None
        k.profil = profil
        if profil.get("ad"):
            k.ad = profil["ad"]
        db.commit()
        return _sozluk(k)


def disari_ver(k: dict) -> dict:
    """Frontend'in beklediği biçim (services/api.js ile aynı alanlar). Şifre özeti ve kimlikler dışarı verilmez."""
    profil = k.get("profil") or {}
    return {
        "ad": profil.get("ad") or k["ad"],
        "eposta": k["eposta"],
        **profil,
        "profilTamam": bool(profil),
        # repoErisimi: GitHub App kurulumu var mı (GitHub sekmesinin durum 3 / 4 ayrımı)
        "github": {"kullaniciAdi": k["github_kullanici_adi"], "repoErisimi": bool(k.get("github_kurulum_id"))}
        if k.get("github_id")
        else None,
        "google": {"eposta": k["google_eposta"]} if k.get("google_id") else None,
    }
