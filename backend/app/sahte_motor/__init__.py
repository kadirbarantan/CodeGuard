"""Sahte motor (GEÇİCİ, Faz 2).

Gerçek test ajanı (Faz 3–4) yazılana kadar çalıştırmayı taklit eder: sitenin mock modunda gördüğün canlı akış
adımlarını ve raporları backend'den, veritabanı ve WebSocket üzerinden verir. Böylece site–backend bağlantısı
motor yazılmadan uçtan uca denenir. Gerçek motor geldiğinde yalnızca `motor.calistir` değişir; uçlar aynı kalır.

Örnek veriler (`ornek_veri.json`) frontend mock'larından üretilir: `node backend/araclar/ornek_veri_uret.mjs`.
"""
import json
from pathlib import Path

ORNEK = json.loads((Path(__file__).parent / "ornek_veri.json").read_text(encoding="utf-8"))
STRATEJI = ORNEK["strateji"]
