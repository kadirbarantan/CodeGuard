# Örnek projeler

Hataları önceden bilinen küçük projeler. İki işe yarar:

1. **Sitedeki "Örnek projeyle dene"** (`secim.ornek = "blog-api"`): gerçek motor bu projeyi test eder.
2. **Değerlendirme (K7):** sistemin bilinen hataları bulup bulmadığı ve tek atış LLM ile karşılaştırması bu projelerde ölçülür.

**Önemli:** Ajana yalnızca proje klasörü (`blog-api/`) verilir. Bu README ve `blog-api-referans-testler/` ajana gösterilmez; yoksa cevapları görmüş olur. Proje kodunda da hataları ele veren yorum yoktur.

## blog-api (Python, FastAPI)

Yazılar ve kullanıcılar bellekte tutulan küçük bir blog servisi. Hatalar, fonksiyonların belge metninde (docstring) yazan davranış ile kodun gerçek davranışı arasındaki farklardır. Ajan da "beklenen davranışı" buradan çıkarmak zorunda: tezdeki "oracle sorunu".

### Bilinen hatalar

| # | Yer | Belgelenen davranış | Gerçek davranış | Yakalayan referans testi |
|---|---|---|---|---|
| 1 | `app/posts.py:27` | Yalnızca boşluktan oluşan başlık 400 döner | `"   "` kabul ediliyor, 201 dönüyor (`strip()` yok) | `test_posts.py::test_bosluktan_olusan_baslik_reddedilir` |
| 2 | `app/posts.py:32` | Her yazıya benzersiz kimlik verilir | Kimlik `len(db) + 1`; bir yazı silinince aynı kimlik tekrar veriliyor | `test_posts.py::test_silmeden_sonra_kimlikler_benzersiz_kalir` |
| 3 | `app/pagination.py:16` | Son sayfadan büyük sayfa ValueError fırlatır | Sessizce boş liste dönüyor; bu yüzden `list_posts`'taki 400 yolu hiç çalışmıyor | `test_pagination.py::test_son_sayfadan_sonrasi_hata_verir` |
| 4 | `app/core/security.py:16` | `verify_password` hata fırlatmaz, False döner | 8 karakterden kısa şifrede ValueError fırlatıyor | `test_security.py::test_kisa_sifre_dogrulamada_false_doner` |
| 5 | `app/utils/slug.py:11` | Türkçe harfler Latin karşılıklarına döner (`"Çay Saati"` → `"cay-saati"`) | Türkçe harfler siliniyor (`"ay-saati"`) | `test_slug.py::test_turkce_harfler_latin_karsiliklarina_doner` |
| 6 | `app/core/config.py:15` | `PAGE_SIZE` sayı değilse ya da 1'den küçükse varsayılan (10) | Sayı değilse ValueError, `0` ya da negatifse o değer dönüyor | `test_config.py::test_sayi_olmayan_deger_varsayilana_doner` |

Satır numaraları hatanın görüldüğü satırdır. Kod değişirse bu tablo da güncellenir.

### Referans testler (`blog-api-referans-testler/`)

Elle yazılmış, sonucu bilinen testler. Sandbox'ın doğru çalıştığını göstermek ve ileride ajanın testleriyle karşılaştırmak için:

```
python araclar/sandbox_dene.py ornekler/blog-api ornekler/blog-api-referans-testler
```

Beklenen sonuç: 31 test, 25 geçti, **6 kaldı** (yukarıdaki 6 hata). Kapsama: satır %96,7, dal %90,6.
Kapsanmayan satırlar bilerek bırakıldı (ör. `is_debug`, uzun içerikli `ozet`); ajanın tamamlaması beklenen yerler.

### Henüz olmayanlar

Sitedeki örnek rapordaki (frontend mock) JavaScript ve arayüz hataları bu projede henüz yok. Arayüz testi (Faz 5) için projeye basit bir web arayüzü eklenince onlar da eklenecek.
