"""Sahte motorun çalıştırma döngüsü.

    bekliyor → calisiyor → (adımlar, ~1,3 sn arayla, veritabanına) → rapor → tamamlandi
                         ↘ durduruldu (kullanıcı Durdur'a bastı)   ↘ hata

Gerçek motor (Faz 3–4) aynı sırayla aynı kayıt fonksiyonlarını çağıracak; uçlar ve site değişmeyecek.
"""
import asyncio
import logging

from app import ayarlar
from app.calistirma import kayit
from app.sahte_motor.olaylar import olaylari_olustur
from app.sahte_motor.rapor import gecmis_ozeti, rapor_olustur

log = logging.getLogger("codeguard.sahte_motor")

# Çalışan görevler (asyncio görevleri referans tutulmazsa çöp toplayıcı tarafından silinebilir)
_gorevler: set[asyncio.Task] = set()


def baslat(run_id: str) -> None:
    gorev = asyncio.create_task(calistir(run_id))
    _gorevler.add(gorev)
    gorev.add_done_callback(_gorevler.discard)


async def calistir(run_id: str) -> None:
    adim_sn = ayarlar.SAHTE_MOTOR_ADIM_SN
    try:
        b = await asyncio.to_thread(kayit.bilgi, run_id)
        if not b or not await asyncio.to_thread(kayit.durum_degistir, run_id, "calisiyor", yalnizca={"bekliyor"}):
            return
        for sira, olay in enumerate(olaylari_olustur(b["secim"])):
            await asyncio.sleep(adim_sn)
            if await asyncio.to_thread(kayit.durum_oku, run_id) != "calisiyor":
                return  # durduruldu
            await asyncio.to_thread(kayit.olay_ekle, run_id, sira, {**olay, "sira": sira})

        rapor = rapor_olustur(b["secim"], run_id, b["proje"], b["tarih"])
        ozet = gecmis_ozeti(rapor)
        if not await asyncio.to_thread(kayit.bitir, run_id, rapor, ozet):
            return
        # Kalite skoru (mutasyon testi) rapordan sonra gelir; yalnızca kaynak kodun kapsaması varsa
        if ozet["coverage"] is not None:
            await asyncio.sleep(adim_sn * 2.5)
            await asyncio.to_thread(kayit.kalite_kaydet, run_id, 81)
    except asyncio.CancelledError:
        raise
    except Exception:
        log.exception("Sahte motor hatası (run %s)", run_id)
        await asyncio.to_thread(kayit.durum_degistir, run_id, "hata", yalnizca={"bekliyor", "calisiyor"}, hata="Beklenmeyen bir hata oluştu.")
