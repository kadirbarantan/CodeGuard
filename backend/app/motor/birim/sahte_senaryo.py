"""Sahte senaryo: önceden yazılmış ajan yanıtlarını klasörden okur (API anahtarı olmadan uçtan uca deneme).

Klasör düzeni (ör. ornekler/sahte-ajan/blog-api/):

    plan.json                 Planlayıcı'nın save_plan argümanları
    tur1/                     Test Yazıcı'nın 1. yanıtı: içindeki .py dosyaları write_tests ile gönderilir
    tur1-sozdizimi/           sonraki yanıt (ör. sözdizimi hatası için hızlı düzeltme)
    tur2/olasi_hatalar.json   (isteğe bağlı) suspected_bugs listesi
    tur2/notlar.txt           (isteğe bağlı) notes

Yanıtlar klasör adlarının alfabetik sırasıyla verilir; bitince ajan boş bir write_tests alır (ilerleme olmaz,
döngü erken durur). Gerçek bir dil modeli değildir: Doğrulayıcı, hile denetimi, hızlı düzeltme ve rapor
akışının bir anahtar ya da kota harcamadan denenmesi içindir.
"""
from __future__ import annotations

import json
from pathlib import Path

from app.motor.llm import AracCagrisi, Yanit


def senaryo_yukle(klasor: Path | str) -> list[Yanit]:
    klasor = Path(klasor)
    if not klasor.is_dir():
        raise FileNotFoundError(f"Sahte senaryo klasörü bulunamadı: {klasor}")
    yanitlar: list[Yanit] = []
    plan = klasor / "plan.json"
    if plan.is_file():
        yanitlar.append(Yanit(arac_cagrilari=[AracCagrisi("save_plan", json.loads(plan.read_text(encoding="utf-8")))]))
    for alt in sorted(p for p in klasor.iterdir() if p.is_dir()):
        dosyalar = [{"path": f"tests/{f.name}", "content": f.read_text(encoding="utf-8")} for f in sorted(alt.glob("*.py"))]
        arguman: dict = {"files": dosyalar}
        if (alt / "olasi_hatalar.json").is_file():
            arguman["suspected_bugs"] = json.loads((alt / "olasi_hatalar.json").read_text(encoding="utf-8"))
        if (alt / "notlar.txt").is_file():
            arguman["notes"] = (alt / "notlar.txt").read_text(encoding="utf-8").strip()
        yanitlar.append(Yanit(arac_cagrilari=[AracCagrisi("write_tests", arguman)]))
    return yanitlar
