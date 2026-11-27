# Sandbox imajları

Kullanıcının kodu backend'in çalıştığı makinede **hiç çalışmaz** (K5). Testler Docker kapsayıcılarında, şu kurallarla çalışır:

| Kural | Neden |
|---|---|
| Dış ağ kapalı (yalnızca test aşamasında; kurulumda paketler için açık) | Kod dışarıya veri gönderemesin, dışarıdan bir şey indiremesin |
| Kaynak kod, testler ve bağımlılıklar salt okunur | Ajan kodu değiştirip testi "geçiremesin" (K6); kod kendi dosyalarını bozamasın |
| Kök dosya sistemi salt okunur, yalnızca `/tmp` ve `/cikti` yazılabilir | Kapsayıcının içine bir şey kurulamasın |
| Root olmayan kullanıcı (1000), Linux yetkileri kapalı | Kapsayıcıdan çıkmaya yönelik saldırılar zorlaşsın |
| CPU 1, bellek 512 MB, en fazla 256 süreç | Sonsuz döngü, bellek şişmesi, fork bombası makineyi kilitlemesin |
| Süre: test başına 10 sn, test aşaması toplam 60 sn | Takılan test bütün sistemi bekletmesin |
| Kurulumda yalnızca hazır paket (wheel) | Paketlerin kendi kurulum kodu (`setup.py`) çalışmasın |

Kurallar kapsayıcı başlatılırken `app/motor/sandbox.py` tarafından uygulanır. Her dilin imajı ayrı bir klasördedir; şimdilik yalnızca `python/` var.

## İmaj nedir, kapsayıcı nedir?

- **İmaj** bir kalıptır: içinde yalnızca dil ve test araçları vardır (Python, pytest, coverage.py, mutmut). Bir kez kurulur.
- **Kapsayıcı** her test için bu kalıptan açılan geçici bir kopyadır. Kullanıcının kodu kapsayıcıya dışarıdan bağlanır, iş bitince kapsayıcı silinir.

## Python imajını kurmak (bir kez, Docker Desktop açıkken)

`backend` klasöründe:

```
docker build -t codeguard-sandbox-python:1 sandbox/python
```

`sandbox/python/araclar.txt` ya da `calistir.py` değişirse imaj yeniden kurulur. Araç sürümleri değişirse etiket artırılır (`:2`) ve `app/motor/sandbox.py`'deki `IMAJ` güncellenir.

## Denemek

```
python araclar/sandbox_dene.py ornekler/blog-api ornekler/blog-api-referans-testler
python araclar/sandbox_dene.py ornekler/blog-api sandbox/python/guvenlik-testleri
```

- İlki örnek projenin referans testlerini çalıştırır: 31 test, 25 geçti, 6 kaldı (bilinen 6 hata, `ornekler/README.md`).
- İkincisi güvenlik kurallarını dener: 8 testin hepsi geçmeli. Biri kalırsa o kural uygulanmıyor demektir.

## Klasörler

```
sandbox/
└── python/
    ├── Dockerfile            imaj tarifi
    ├── araclar.txt           imajdaki test araçları ve sabit sürümleri
    ├── calistir.py           kapsayıcının içinde çalışan betik (kurulum ve test kipleri)
    └── guvenlik-testleri/    sandbox kurallarını doğrulayan testler
```
