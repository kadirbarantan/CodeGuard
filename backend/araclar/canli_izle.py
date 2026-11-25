"""Bir testin canlı akışını terminalde izler (Swagger WebSocket deneyemediği için).

Kullanım (backend klasöründe, .venv açıkken):
    python araclar/canli_izle.py <runId> <token>
runId: POST /runs yanıtı · token: /auth/giris ya da /auth/kayit yanıtı
"""
import asyncio
import json
import sys

import websockets  # uvicorn[standard] ile birlikte kurulur


async def izle(run_id: str, token: str, adres: str = "ws://localhost:8000") -> None:
    async with websockets.connect(f"{adres}/runs/{run_id}/olaylar") as ws:
        await ws.send(json.dumps({"token": token}))
        async for mesaj in ws:
            o = json.loads(mesaj)
            if o.get("type") == "agent_step":
                grup = f" [{o['grup']}]" if o.get("grup") else ""
                print(f"{o['sira']:>2}. {o['agent']}{grup} · {o['kind']} — {o['message']}")
            else:
                print("SON:", o)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    try:
        asyncio.run(izle(sys.argv[1], sys.argv[2]))
    except websockets.ConnectionClosed as h:
        print(f"Bağlantı kapandı (kod {h.rcvd.code if h.rcvd else '?'}): 4401 giriş geçersiz, 4404 test bulunamadı.")
