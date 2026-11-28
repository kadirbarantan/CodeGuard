# Sahte ajan senaryosu: blog-api

Gerçek bir dil modeli değildir. Ajanın yanıtları önceden yazılmıştır; birim ajanının akışını **API anahtarı ve kota
harcamadan** denemek içindir:

```
python araclar/ajan_dene.py ornekler/blog-api --sahte
```

Denenenler: plan → test yazımı → sandbox → geri bildirim → Olası Hata işaretleme → son 3 kez çalıştırma.
Bilerek konan sorunlar:

- `tur1/test_slug.py`: sözdizimi hatası → Test Yazıcı içinde hızlı düzeltme (`tur1-sozdizimi/`).
- `tur1/test_users.py`: olmayan bir fonksiyonu içe aktarıyor → pytest toplama hatası → hızlı düzeltme (`tur1-toplama/`).
- `tur1/test_models.py`: yalnızca `assert True` içeren bir test → hile denetimi reddeder.
- `tur2/`: kalan testler Olası Hata olarak işaretlenir, kapsanmayan dallar için testler eklenir.

Klasörler ad sırasıyla okunur (`app/motor/birim/sahte_senaryo.py`). Yanıtlar bitince ajan değişiklik yapmaz; döngü durur.
