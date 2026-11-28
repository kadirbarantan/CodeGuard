"""Gemini bağlantısını dener (Faz 4). backend klasöründe, .venv açıkken:

    python araclar/gemini_dene.py              # anahtar, model ve araç çağırma (1 istek)
    python araclar/gemini_dene.py --modeller   # bu anahtarın kullanabildiği modeller
    python araclar/gemini_dene.py --model gemini-3.8-flash

Anahtar backend/.env'deki GEMINI_API_KEY'den okunur ve hiçbir yere yazdırılmaz.
"""
import argparse
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))  # backend/ klasörü

from app import ayarlar  # noqa: E402
from app.motor.llm import Arac, GeminiSaglayici, LLMHatasi, LLMIstemcisi  # noqa: E402

SELAMLA = Arac(
    ad="selamla",
    aciklama="Bağlantı denemesi: verilen adı selamlar.",
    parametreler={"type": "object", "properties": {"ad": {"type": "string"}}, "required": ["ad"]},
)


def anahtar_bilgisi(anahtar: str) -> str:
    if not anahtar:
        return "yok"
    bicim = "eski biçim (AIza…)" if anahtar.startswith("AIza") else "yeni biçim (AQ.…)" if anahtar.startswith("AQ.") else "bilinmeyen biçim"
    return f"var ({len(anahtar)} karakter, {bicim})"


def main() -> int:
    ayristirici = argparse.ArgumentParser(description="Gemini bağlantısını dener.")
    ayristirici.add_argument("--model", help=f"denenecek model (varsayılan .env: {ayarlar.GEMINI_MODEL})")
    ayristirici.add_argument("--modeller", action="store_true", help="bu anahtarın kullanabildiği modelleri listele")
    secenek = ayristirici.parse_args()

    model = secenek.model or ayarlar.GEMINI_MODEL
    print(f"GEMINI_API_KEY: {anahtar_bilgisi(ayarlar.GEMINI_API_KEY)}")
    print(f"Model: {model}")
    try:
        saglayici = GeminiSaglayici(model, ayarlar.GEMINI_API_KEY, dusunme=ayarlar.GEMINI_DUSUNME)
        if secenek.modeller:
            modeller = saglayici.modeller()
            print(f"\nİçerik üretebilen {len(modeller)} model:")
            for m in modeller:
                print(f"  {m['ad']:40} {m['aciklama']}")
            return 0
        istemci = LLMIstemcisi(saglayici, dakika_istek=0)
        konusma = istemci.konusma("Bağlantı denemesi", "Kısa ve doğru yanıt ver.", [SELAMLA])
        baslangic = time.monotonic()
        yanit = konusma.gonder("CodeGuard bağlantı denemesi: selamla aracını ad='CodeGuard' ile çağır.", zorunlu=["selamla"])
        sure = time.monotonic() - baslangic
    except LLMHatasi as hata:
        print(f"\nBağlantı kurulamadı: {hata}", file=sys.stderr)
        return 2

    cagri = next((c for c in yanit.arac_cagrilari if c.ad == "selamla"), None)
    if cagri is None:
        print(f"\nModel yanıt verdi ama aracı çağırmadı (bitiş: {yanit.bitis_nedeni}). Metin: {yanit.metin[:200]!r}")
        return 1
    print(f"\nBağlantı tamam: {model} aracı çağırdı → selamla({cagri.argumanlar})")
    print(f"1 istek · giriş {yanit.giris_token}, çıkış {yanit.cikis_token}, düşünme {yanit.dusunme_token} token · {sure:.1f} sn")
    return 0


if __name__ == "__main__":
    sys.exit(main())
