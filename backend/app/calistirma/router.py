"""Test çalıştırma uçları (bkz. docs/api-sozlesmesi.md bölüm 2).

- POST /runs                 başlat (multipart: secim + dosyalar) → 201 { runId }
- POST /runs/{id}/durdur     durdur
- GET  /runs                 geçmiş listesi
- GET  /runs/{id}/rapor      rapor
- GET  /runs/{id}/dosya      Kod sekmesindeki dosyanın içeriği
- GET  /runs/{id}/kalite     kalite skoru (hesaplanıyorsa null)
Canlı akış (WebSocket) ayrı dosyada: canli.py.
"""
import shutil
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import ayarlar
from app.auth.oturum import aktif_kullanici
from app.calistirma import kayit
from app.calistirma.secim import SecimHatasi, secimi_coz
from app.calistirma.yukleme import YuklemeHatasi, kaydet
from app.db import get_db
from app.modeller import Calistirma
from app.sahte_motor import motor
from app.sahte_motor.olaylar import url_adi
from app.sahte_motor.rapor import dosya_kaynagi

router = APIRouter(prefix="/runs", tags=["çalıştırma"])


def _sahibinin(db: Session, run_id: str, kullanici: dict) -> Calistirma:
    """Çalıştırma yoksa ya da başkasınınsa 404 (başkasının çalıştırmasının varlığı da sezdirilmez)."""
    c = db.get(Calistirma, run_id)
    if not c or c.kullanici_id != kullanici["id"]:
        raise HTTPException(404, "Test bulunamadı.")
    return c


@router.post("", status_code=201)
async def baslat(
    secim: str = Form(...),
    # Swagger dosya seçilmeyince boş metin gönderir; metinler yok sayılır
    dosyalar: list[UploadFile | str] = File(default=[]),
    kullanici: dict = Depends(aktif_kullanici),
):
    try:
        s = secimi_coz(secim)
    except SecimHatasi as h:
        raise HTTPException(400, str(h)) from h

    dosyalar = [d for d in dosyalar if not isinstance(d, str)]
    run_id = str(uuid.uuid4())
    if s.kaynak == "url":
        proje = url_adi(s.url)
    elif s.ornek:
        proje = s.ornek
    else:
        if not dosyalar:
            raise HTTPException(400, "Test için kod yükle ya da örnek projeyi seç.")
        hedef = ayarlar.YUKLEME_KLASORU / run_id / "kaynak"
        try:
            proje = await run_in_threadpool(kaydet, [(d.filename or "", d.file) for d in dosyalar], hedef)
        except YuklemeHatasi as h:
            shutil.rmtree(hedef.parent, ignore_errors=True)
            raise HTTPException(h.kod, h.mesaj) from h

    await run_in_threadpool(kayit.olustur, run_id, kullanici["id"], proje, s.model_dump())
    motor.baslat(run_id)
    return {"runId": run_id}


@router.post("/{run_id}/durdur")
def durdur(run_id: str, kullanici: dict = Depends(aktif_kullanici), db: Session = Depends(get_db)):
    _sahibinin(db, run_id, kullanici)
    kayit.durum_degistir(run_id, "durduruldu", yalnizca={"bekliyor", "calisiyor"})
    return {"ok": True}


@router.get("")
def gecmis(kullanici: dict = Depends(aktif_kullanici), db: Session = Depends(get_db)):
    """Geçmiş Testlerim (en yeni ilk, en fazla 50). Biçim: frontend/src/mock/history.js."""
    kayitlar = db.scalars(
        select(Calistirma).where(Calistirma.kullanici_id == kullanici["id"]).order_by(Calistirma.olusturma.desc()).limit(50)
    ).all()
    liste = []
    for c in kayitlar:
        s, o = c.secim, c.ozet or {}
        liste.append(
            {
                "runId": c.id,
                "proje": c.proje,
                "kaynak": s.get("kaynak", "kod"),
                "url": s.get("url", ""),
                "durum": c.durum,
                "alan": s.get("alan"),
                "dil": s.get("dil"),
                "tur": s.get("tur", []),
                "coverage": o.get("coverage"),
                "uxSkor": o.get("uxSkor"),
                "erisimSkor": o.get("erisimSkor"),
                "tarih": kayit.tarih_yaz(c.olusturma),
                **({"hata": c.hata} if c.hata else {}),
            }
        )
    return liste


@router.get("/{run_id}/rapor")
def rapor(run_id: str, kullanici: dict = Depends(aktif_kullanici), db: Session = Depends(get_db)):
    c = _sahibinin(db, run_id, kullanici)
    if c.durum in ("kurulumHatasi", "hata"):
        raise HTTPException(409, c.hata or "Test tamamlanamadı.")
    if not c.rapor:
        raise HTTPException(409, "Test henüz bitmedi.")
    return c.rapor.veri


@router.get("/{run_id}/dosya")
def dosya(run_id: str, yol: str, kullanici: dict = Depends(aktif_kullanici), db: Session = Depends(get_db)):
    _sahibinin(db, run_id, kullanici)
    kod = dosya_kaynagi(yol)
    if kod is None:
        raise HTTPException(404, "Dosya bulunamadı.")
    return {"yol": yol, "kod": kod}


@router.get("/{run_id}/kalite")
def kalite(run_id: str, kullanici: dict = Depends(aktif_kullanici), db: Session = Depends(get_db)):
    c = _sahibinin(db, run_id, kullanici)
    return {"kaliteSkoru": c.rapor.kalite_skoru if c.rapor else None}
