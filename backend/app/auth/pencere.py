"""OAuth açılır penceresinin son sayfası (GitHub ve Google için ortak).

Sonucu ana pencereye postMessage ile YALNIZCA FRONTEND_URL'e iletir, state çerezini siler ve kapanır.
Mesaj: { type: "codeguard:<saglayici>", token, hata }
"""
import json

from fastapi.responses import HTMLResponse

from app import ayarlar


def pencere_yaniti(
    saglayici: str,
    cerez: str,
    cerez_yolu: str,
    token: str | None = None,
    hata: str | None = None,
) -> HTMLResponse:
    mesaj = {"type": f"codeguard:{saglayici}", "token": token, "hata": hata}
    # </script> kaçışı: JSON metni script etiketini kapatamasın
    mesaj_js = json.dumps(mesaj).replace("</", "<\\/")
    hedef_js = json.dumps(ayarlar.FRONTEND_URL).replace("</", "<\\/")
    html = f"""<!doctype html>
<html lang="tr"><meta charset="utf-8"><title>CodeGuard</title>
<body style="font-family:system-ui;padding:24px;color:#0F172A">
<p>{"Giriş tamamlandı, bu pencere kapanıyor…" if token else "Giriş tamamlanamadı. Bu pencereyi kapatabilirsin."}</p>
<script>
  if (window.opener) window.opener.postMessage({mesaj_js}, {hedef_js});
  window.close();
</script>
</body></html>"""
    yanit = HTMLResponse(html, headers={"Cache-Control": "no-store"})
    yanit.delete_cookie(cerez, path=cerez_yolu)
    return yanit
