"""Birim alt grafındaki ajanların araçları (function calling; K9).

K9'daki araç listesinin karşılıkları:
- get_code_map → Planlayıcı haritayı istemin içinde görür (ayrı istek harcamamak için).
- get_source   → `get_source`: Test Yazıcı bir ya da birkaç birimin kaynağını ister (K4 "Uygula").
- write_test   → `write_tests`: bütün dosyalar ve Olası Hata işaretleri tek çağrıda.
- run_tests    → Doğrulayıcı düğümü çalıştırır; ajan değil (doğrulama deterministik olmalı, K9).

Ücretsiz katmanda istek sayısı sınırlı olduğu için araçlar az sayıda çağrıyla iş görecek şekilde tasarlandı:
birden fazla birim tek get_source çağrısında, bütün dosyalar tek write_tests çağrısında.
"""
from __future__ import annotations

from app.motor.llm import Arac

PLAN_ARACI = Arac(
    ad="save_plan",
    aciklama="Test planını kaydeder. Her test edilebilir birim için öncelik ve senaryolar.",
    parametreler={
        "type": "object",
        "properties": {
            "units": {
                "type": "array",
                "description": "Test edilecek birimler, önce en önemlileri.",
                "items": {
                    "type": "object",
                    "properties": {
                        "unit": {"type": "string", "description": "Birim kimliği, haritadaki gibi: app/posts.py::create_post"},
                        "priority": {"type": "integer", "description": "1 en önemli, 3 en az önemli"},
                        "scenarios": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Kısa senaryolar: olağan durum, sınır değerler, her dal ve her hata yolu.",
                        },
                    },
                    "required": ["unit", "scenarios"],
                },
            },
            "order_note": {"type": "string", "description": "Test sırasının tek cümlelik gerekçesi (Türkçe)."},
            "setup_note": {
                "type": "string",
                "description": "Testlerin ortak hazırlığı: paylaşılan durum nasıl temizlenir, hangi taklitler (mock) gerekir.",
            },
        },
        "required": ["units"],
    },
)

KAYNAK_ARACI = Arac(
    ad="get_source",
    aciklama=("Projedeki birimlerin (fonksiyon, metot, sınıf) ya da dosyaların satır numaralı kaynak kodunu verir. "
              "İstemde kaynağı zaten verilmiş birimler için çağırma. Birden fazlasını tek çağrıda iste."),
    parametreler={
        "type": "object",
        "properties": {
            "unit_ids": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Birim kimlikleri (ör. app/posts.py::create_post, app/models/post.py::Post) ya da dosya yolları (ör. app/posts.py)",
            }
        },
        "required": ["unit_ids"],
    },
)

YAZMA_ARACI = Arac(
    ad="write_tests",
    aciklama=(
        "Test dosyalarını tests/ klasörüne kaydeder. Değiştirdiğin her dosyanın TAM içeriğini gönder; göndermediğin "
        "dosyalar olduğu gibi kalır, içeriği boş gönderilen dosya silinir. Kalan bir testin nedeni kodun belgelenen "
        "davranıştan sapmasıysa testi değiştirme, suspected_bugs ile Olası Hata olarak bildir."
    ),
    parametreler={
        "type": "object",
        "properties": {
            "files": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "path": {"type": "string", "description": "tests/test_<modül>.py ya da tests/conftest.py"},
                        "content": {"type": "string", "description": "Dosyanın tam içeriği (pytest)."},
                    },
                    "required": ["path", "content"],
                },
            },
            "suspected_bugs": {
                "type": "array",
                "description": "Kodun hatalı olduğunu düşündüğün için kalan testler (Olası Hata).",
                "items": {
                    "type": "object",
                    "properties": {
                        "test": {"type": "string", "description": "Test fonksiyonunun adı, ör. test_bos_baslik_reddedilir"},
                        "unit": {"type": "string", "description": "Hatalı olduğunu düşündüğün birim, ör. app/posts.py::create_post"},
                        "line": {"type": "integer", "description": "Hatanın görüldüğü kaynak satırı"},
                        "title": {"type": "string", "description": "Kısa başlık (Türkçe)"},
                        "reason": {
                            "type": "string",
                            "description": "İki kısa cümle (Türkçe): belge ne söylüyor, test ne gözledi.",
                        },
                    },
                    "required": ["test", "unit", "reason"],
                },
            },
            "retracted_bugs": {
                "type": "array",
                "description": "Daha önce Olası Hata olarak işaretlediğin ama testin kendisi yanlış çıktığı için geri çektiğin testler.",
                "items": {
                    "type": "object",
                    "properties": {
                        "test": {"type": "string", "description": "Test fonksiyonunun adı"},
                        "reason": {"type": "string", "description": "Testin neden yanlış olduğu (Türkçe, bir cümle)"},
                    },
                    "required": ["test", "reason"],
                },
            },
            "fixed_tests": {
                "type": "array",
                "description": (
                    "Önceki turda kalan ve testin KENDİ hatası yüzünden değiştirdiğin testler (yanlış içe aktarma, yanlış çağrı, "
                    "eksik hazırlık). Gerekçesi yazılmayan değişiklikler geri alınır. Beklentiyi kodun davranışına uydurmak gerekçe sayılmaz."
                ),
                "items": {
                    "type": "object",
                    "properties": {
                        "test": {"type": "string", "description": "Test fonksiyonunun adı"},
                        "reason": {"type": "string", "description": "Testin neden yanlış olduğu (Türkçe, bir cümle)"},
                    },
                    "required": ["test", "reason"],
                },
            },
            "notes": {"type": "string", "description": "Bu turda ne yaptığın, bir iki cümle (Türkçe)."},
        },
        "required": ["files"],
    },
)
