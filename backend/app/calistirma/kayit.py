"""Çalıştırma kayıtları: veritabanı işlemleri (sahte motor ve uçlar ortak kullanır)."""
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update

from app.db import oturum_ac
from app.modeller import Calistirma, Olay, Rapor

# Bitmiş sayılan durumlar (canlı akış bu durumlarda kapanır)
BITTI = {"tamamlandi", "durduruldu", "kurulumHatasi", "hata"}
# Türkiye saati (2016'dan beri sabit UTC+3); Windows'ta saat dilimi veritabanı gerektirmez
TR = timezone(timedelta(hours=3))


def tarih_yaz(an: datetime | None) -> str:
    return (an or datetime.now(timezone.utc)).astimezone(TR).strftime("%d.%m.%Y")


def olustur(run_id: str, kullanici_id: str, proje: str, secim: dict) -> None:
    with oturum_ac() as db:
        db.add(Calistirma(id=run_id, kullanici_id=kullanici_id, proje=proje[:200], secim=secim, durum="bekliyor"))
        db.commit()


def bilgi(run_id: str) -> dict | None:
    with oturum_ac() as db:
        c = db.get(Calistirma, run_id)
        if not c:
            return None
        return {"id": c.id, "proje": c.proje, "secim": c.secim, "durum": c.durum, "hata": c.hata, "tarih": tarih_yaz(c.olusturma)}


def durum_oku(run_id: str) -> str | None:
    with oturum_ac() as db:
        return db.scalar(select(Calistirma.durum).where(Calistirma.id == run_id))


def durum_degistir(run_id: str, yeni: str, *, yalnizca: set[str] | None = None, hata: str | None = None) -> bool:
    """Durumu değiştirir. `yalnizca` verilirse yalnızca o durumlardaysa değiştirir (yarış durumlarına karşı)."""
    with oturum_ac() as db:
        sorgu = update(Calistirma).where(Calistirma.id == run_id)
        if yalnizca:
            sorgu = sorgu.where(Calistirma.durum.in_(yalnizca))
        degerler = {"durum": yeni}
        if yeni in BITTI:
            degerler["bitis"] = datetime.now(timezone.utc)
        if hata:
            degerler["hata"] = hata
        sonuc = db.execute(sorgu.values(**degerler))
        db.commit()
        return sonuc.rowcount > 0


def olay_ekle(run_id: str, sira: int, veri: dict) -> None:
    with oturum_ac() as db:
        db.add(Olay(calistirma_id=run_id, sira=sira, veri=veri))
        db.commit()


def olaylar_ve_durum(run_id: str, son_sira: int) -> tuple[list[dict], str | None, str | None]:
    """Önce durum, sonra olaylar okunur: durum "bitti" ise okunan olaylar eksiksizdir."""
    with oturum_ac() as db:
        c = db.get(Calistirma, run_id)
        if not c:
            return [], None, None
        durum, hata = c.durum, c.hata
        olaylar = db.scalars(select(Olay.veri).where(Olay.calistirma_id == run_id, Olay.sira > son_sira).order_by(Olay.sira)).all()
        return list(olaylar), durum, hata


def bitir(run_id: str, rapor: dict, ozet: dict) -> bool:
    """Rapor kaydedilir ve durum "tamamlandi" olur (bu arada durdurulduysa hiçbir şey yapılmaz)."""
    with oturum_ac() as db:
        c = db.get(Calistirma, run_id)
        if not c or c.durum != "calisiyor":
            return False
        db.add(Rapor(calistirma_id=run_id, veri=rapor))
        c.ozet, c.durum, c.bitis = ozet, "tamamlandi", datetime.now(timezone.utc)
        db.commit()
        return True


def kalite_kaydet(run_id: str, skor: int) -> None:
    with oturum_ac() as db:
        db.execute(update(Rapor).where(Rapor.calistirma_id == run_id).values(kalite_skoru=skor))
        db.commit()


def yarim_kalanlari_kapat() -> int:
    """Sunucu yeniden başlayınca çalışır durumda kalan testler hata olarak kapatılır."""
    with oturum_ac() as db:
        sonuc = db.execute(
            update(Calistirma)
            .where(Calistirma.durum.in_(["bekliyor", "calisiyor"]))
            .values(durum="hata", hata="Sunucu yeniden başladığı için test yarıda kaldı. Testi yeniden başlat.", bitis=datetime.now(timezone.utc))
        )
        db.commit()
        return sonuc.rowcount
