"""Canlı akış: WS /runs/{run_id}/olaylar

1. İstemci bağlanır ve ilk mesaj olarak { "token": "…" } gönderir (tarayıcı WebSocket'e başlık ekleyemez).
   İsteğe bağlı "sonSira": kaldığı yerden devam için son aldığı olayın sırası.
2. Sunucu o ana kadarki olayları, sonra yenilerini gönderir (olaylar veritabanında; sayfa yenilenince baştan oynar).
3. Test bitince son mesaj gelir ve bağlantı kapanır:
   { "type": "done", "runId" } · { "type": "durduruldu" } · { "type": "hata", "durum", "mesaj" }
Kapatma kodları: 4400 ilk mesaj gelmedi / bozuk · 4401 giriş geçersiz · 4404 test yok ya da başkasının.
"""
import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.auth.token import token_coz
from app.calistirma import kayit
from app.db import oturum_ac
from app.modeller import Calistirma

router = APIRouter(tags=["çalıştırma"])

YOKLAMA_SN = 0.4  # yeni olay var mı diye veritabanına bakma aralığı


def _sahibi_mi(run_id: str, kullanici_id: str) -> bool:
    with oturum_ac() as db:
        c = db.get(Calistirma, run_id)
        return bool(c and c.kullanici_id == kullanici_id)


@router.websocket("/runs/{run_id}/olaylar")
async def canli_akis(ws: WebSocket, run_id: str):
    await ws.accept()
    try:
        ilk = await asyncio.wait_for(ws.receive_json(), timeout=10)
        kullanici_id = token_coz(str(ilk.get("token", "")))
        son = int(ilk.get("sonSira", -1))
    except (asyncio.TimeoutError, ValueError, TypeError, AttributeError):
        await ws.close(code=4400)
        return
    except WebSocketDisconnect:
        return
    if not kullanici_id:
        await ws.close(code=4401)
        return
    if not await asyncio.to_thread(_sahibi_mi, run_id, kullanici_id):
        await ws.close(code=4404)
        return

    try:
        while True:
            olaylar, durum, hata = await asyncio.to_thread(kayit.olaylar_ve_durum, run_id, son)
            for olay in olaylar:
                await ws.send_json(olay)
                son = olay["sira"]
            if durum in kayit.BITTI and not olaylar:
                if durum == "tamamlandi":
                    await ws.send_json({"type": "done", "runId": run_id})
                elif durum == "durduruldu":
                    await ws.send_json({"type": "durduruldu"})
                else:
                    await ws.send_json({"type": "hata", "durum": durum, "mesaj": hata or "Test tamamlanamadı."})
                await ws.close()
                return
            # Beklerken istemciyi de dinle: sekme kapandıysa ya da sunucu kapanıyorsa döngüden hemen çık
            # (yoksa sunucu kapanırken bu bağlantıyı bekleyip takılabilir)
            try:
                mesaj = await asyncio.wait_for(ws.receive(), timeout=YOKLAMA_SN)
                if mesaj.get("type") == "websocket.disconnect":
                    return
            except asyncio.TimeoutError:
                pass
    except (WebSocketDisconnect, RuntimeError):
        return
