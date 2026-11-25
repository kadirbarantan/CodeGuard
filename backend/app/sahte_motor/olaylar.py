"""Canlı akış adımları: frontend/src/mock/runEvents.js'in Python karşılığı (aynı metinler, aynı metrikler).

Seçilen test türlerine, alana, dile ve kaynağa göre adım listesi üretir.
Birden fazla test grubu seçiliyse adımlar tek akışta birleşir; her adımda `grup` alanı olur.
"""
from urllib.parse import urlsplit

from app.sahte_motor import STRATEJI

DIL_ARACLARI = STRATEJI["DIL_ARACLARI"]
ALAN_STRATEJI = STRATEJI["ALAN_STRATEJI"]
ERISIM_STATIK = STRATEJI["ERISIM_STATIK"]
MOTOR = STRATEJI["MOTOR"]


def url_adi(url: str) -> str:
    """"https://ornek.com/yol" → "ornek.com" (testStratejileri.js urlAdi)."""
    return urlsplit(url).netloc or url


def strateji(secim: dict) -> dict:
    """Hangi test grupları çalışacak (testStratejileri.js stratejiOlustur'un ihtiyaç duyulan kısmı)."""
    tur, alan, dil = secim["tur"], secim["alan"], secim.get("dil")
    url_modu = secim["kaynak"] == "url"
    birim = not url_modu and "birim" in tur
    arayuz = "arayuz" in tur and alan not in ("oyun", "mobil")
    return {
        "birim": birim,
        "arayuz": arayuz,
        "ux": "kullanilabilirlik" in tur,
        "erisim": "erisilebilirlik" in tur,
        "motor": MOTOR.get(alan, {}).get(dil) if birim else None,
        "kod_adi": " + ".join(ad for var, ad in ((birim, "Birim"), (arayuz, "Arayüz")) if var),
    }


def _adim(agent, kind, message, round_, max_rounds, metrics):
    return {"type": "agent_step", "agent": agent, "kind": kind, "message": message, "round": round_, "maxRounds": max_rounds, "metrics": metrics}


def _ux_olaylari(secim):
    hedef = url_adi(secim["url"]) if secim["kaynak"] == "url" else "Uygulama"
    u = lambda ux, desen, renk, bulgu: {"ux": ux, "desen": desen, "renk": renk, "bulgu": bulgu}  # noqa: E731
    return [
        _adim("Tarayıcı Ajanı", "Tarayıcı", f"{hedef} açıldı; 6 sayfa masaüstü ve mobil genişlikte gezildi, 12 ekran görüntüsü alındı.", 1, 1, u(None, None, None, 0)),
        _adim("Planlayıcı Ajan", "LLM", "Değerlendirme planı hazır: okuma deseni, renk uyumu, görsel hiyerarşi, mobil uyum.", 1, 1, u(None, None, None, 0)),
        _adim("Okuma Deseni Analizi", "Analiz", 'Ana sayfa Z desenine %78 uyumlu; "Kayıt ol" butonu desenin bitiş noktasının dışında kalıyor.', 1, 1, u(None, 78, None, 1)),
        _adim("Okuma Deseni Analizi", "Analiz", "Yazı listesi ve detay sayfası F desenine uygun; fiyatlar sayfasında başlıklar sağa yaslı.", 1, 1, u(None, 74, None, 2)),
        _adim("Renk Uyumu", "Analiz", "5 renkli palet çıkarıldı; turuncu üç farklı anlamda kullanılıyor.", 1, 1, u(None, 74, 81, 3)),
        _adim("UX Değerlendirme Ajanı", "LLM", "Ekran görüntüleri görsel hiyerarşi ve tutarlılık ilkelerine göre incelendi; 2 yeni bulgu.", 1, 1, u(None, 74, 81, 6)),
        _adim("İçgörü Ajanı", "LLM", "Bulgular önem sırasına konuyor, her biri için öneri yazılıyor.", 1, 1, u(72, 74, 81, 6)),
    ]


def _erisim_olaylari(secim):
    url_modu = secim["kaynak"] == "url"
    hedef = url_adi(secim["url"]) if url_modu else "Uygulama"
    e = lambda uyum, lh, ihlal, kritik: {"uyum": uyum, "lighthouse": lh, "ihlal": ihlal, "kritik": kritik}  # noqa: E731
    statik = None if url_modu else ERISIM_STATIK.get(secim.get("dil") or "")
    o = []
    if statik:
        o.append(_adim("Statik Tarayıcı", f"Analiz · {statik}", "Şablonlarda 14 alternatif metinsiz görsel ve 5 etiketsiz form alanı bulundu.", 1, 1, e(None, None, 2, 0)))
    acilis = f"{hedef} açıldı" if url_modu else "Uygulama başlatıldı"
    o += [
        _adim("Tarayıcı Ajanı", "Tarayıcı", f"{acilis}; 6 sayfa masaüstü ve mobil genişlikte gezildi.", 1, 1, e(None, None, 2 if statik else 0, 0)),
        _adim("WCAG Tarayıcı", "Analiz · axe-core", "6 sayfada 6 tür ihlal bulundu; 7 metin kontrast sınırının altında.", 1, 1, e(None, None, 6, 0)),
        _adim("Lighthouse", "Analiz", "Erişilebilirlik puanı 74 / 100.", 1, 1, e(None, 74, 6, 0)),
        _adim("Klavye Testi", "Tarayıcı · Playwright", "Mobil menüye klavyeyle ulaşılamıyor; /register'deki tarih seçicide klavye tuzağı var; odak hiçbir sayfada görünmüyor.", 1, 1, e(None, 74, 8, 2)),
        _adim("Erişilebilirlik Ağacı", "Analiz", "4 ikon düğmesinin adı yok; /pricing'de başlık seviyesi atlanıyor.", 1, 1, e(None, 74, 9, 2)),
        _adim("Görme Simülasyonu", "Tarayıcı · Chromium", "Döteranopi ve protanopi simülasyonunda /pricing'deki var / yok noktaları ayırt edilemiyor; 320 px genişlikte blog yazısı yatay kaydırma istiyor.", 1, 1, e(None, 74, 11, 2)),
        _adim("Form, Medya ve Hareket", "Tarayıcı · Playwright", "/register formu yanlış gönderildi: hata ekran okuyucuya duyurulmuyor. Tanıtım videosunda altyazı yok; ana sayfadaki kaydırıcı durdurulamıyor.", 1, 1, e(None, 74, 14, 2)),
        _adim("Anlam Kontrolü", "LLM · Gemini", '9 görselin alternatif metni görseli anlatmıyor ("banner-final.png", "resim"); "Hata oluştu" mesajı neyin yanlış olduğunu söylemiyor.', 1, 1, e(None, 74, 16, 2)),
        _adim(
            "İçgörü Ajanı",
            "LLM",
            "İhlaller WCAG maddelerine ve engel gruplarına göre gruplanıyor, düzeltme önerileri yazılıyor."
            if url_modu
            else "İhlaller WCAG maddelerine ve engel gruplarına göre gruplanıp koddaki yerlerine bağlanıyor, düzeltme önerileri yazılıyor.",
            1,
            1,
            e(46, 74, 16, 2),
        ),
    ]
    return o


def _kod_olaylari(secim, st):
    """Birim ve/veya arayüz testleri: ajan döngüsü (en fazla 4 tur)."""
    url_modu = secim["kaynak"] == "url"
    arac = DIL_ARACLARI.get(secim.get("dil") or "", DIL_ARACLARI["python"])
    alan_s = ALAN_STRATEJI[secim["alan"]]
    ui_toplam = 24 if st["arayuz"] else 0
    d = {"cov": 0, "ui": 0, "gecen": 0, "hata": 0, "engel": 0}
    o = []

    def ekle(agent, kind, message, round_):
        m = {"coverage": d["cov"], "uiCovered": d["ui"], "uiTotal": ui_toplam, "passed": d["gecen"], "bugs": d["hata"], "calistirilamadi": d["engel"]}
        o.append(_adim(agent, kind, message, round_, 4, m))

    if not url_modu:
        ekle("Planlayıcı Ajan", "LLM", "Kod Haritası çıkarıldı, 38 birim bulundu.", 1)
    if st["motor"]:
        ekle("Bağımlılık Analizi", "Analiz", f"{st['motor']} kullanan 7 birim ayrıldı; 31 birim test edilebilir.", 1)
    ekle("Planlayıcı Ajan", "LLM", f"Test planı hazır. Odak: {', '.join(alan_s['odak'][:2])}.", 1)

    if st["birim"]:
        api_notu = f", {arac['api']} ile 12 API testi" if secim["alan"] == "web" else ""
        ekle("Test Yazıcı Ajan", "LLM · Tur 1", f"{arac['birim']} ile 46 birim testi{api_notu} yazıldı.", 1)
        d.update(cov=34, gecen=41)
        ekle("Doğrulayıcı · Standardizasyon Katmanı", "Sandbox · Tur 1", f"41/46 test geçti, kapsama %{d['cov']}.", 1)
    if st["arayuz"]:
        acilis = f"{url_adi(secim['url'])} açıldı" if url_modu else "Uygulama başlatıldı"
        ekle("UI Keşif", "Tarayıcı", f"{acilis}; 6 sayfa, {ui_toplam} etkileşim öğesi bulundu.", 2 if st["birim"] else 1)
    if st["birim"]:
        ekle("Test Yazıcı Ajan", "LLM · Tur 2", alan_s["tur2"], 2)
        d.update(cov=71, gecen=44, hata=3)
        ekle("Doğrulayıcı · Standardizasyon Katmanı", "Sandbox · Tur 2", f"Kapsama %{d['cov']}, {d['hata']} olası hata bulundu.", 2)
    if st["arayuz"]:
        ui_arac = "Playwright" if url_modu else arac["arayuz"]
        ekle("UI Test Yazıcı Ajan", "LLM", f"{ui_arac} ile 7 kullanıcı akışı için arayüz testi yazıldı.", 3 if st["birim"] else 2)
        d["ui"] = 22
        d["gecen"] += 5
        d["hata"] += 1
        d["engel"] += 1
        ekle(
            "UI Doğrulayıcı · Standardizasyon Katmanı",
            "Sandbox",
            f"7 akıştan 5'i geçti, 1'i kaldı, 1'i çalıştırılamadı (dış servise ağ kapalı); {d['ui']}/{ui_toplam} öğe kapsandı.",
            3 if st["birim"] else 2,
        )
    if st["birim"]:
        ekle("Test Yazıcı Ajan", "LLM · Tur 3", "Kalan dallar için yeni testler yazıldı.", 3)
        d["cov"] = 94
        d["gecen"] += 2
        d["hata"] += 3
        ekle("Doğrulayıcı · Standardizasyon Katmanı", "Sandbox · Tur 3", f"Kapsama %{d['cov']}, 3 olası hata daha işaretlendi; ilerleme durdu, döngü sonlandı.", 3)
    ekle("İçgörü Ajanı", "LLM", "Kapsanamayan satırlar açıklanıyor, rapor hazırlanıyor.", 4)
    return o


def olaylari_olustur(secim: dict) -> list[dict]:
    """Seçime göre canlı akış adımları (runEvents.js olaylariOlustur)."""
    st = strateji(secim)
    kod_var = st["birim"] or st["arayuz"]
    parcalar = []
    if kod_var:
        parcalar.append(("kod", st["kod_adi"], _kod_olaylari(secim, st)))
    if st["ux"]:
        parcalar.append(("ux", "Kullanılabilirlik", _ux_olaylari(secim)))
    if st["erisim"]:
        parcalar.append(("erisim", "Erişilebilirlik", _erisim_olaylari(secim)))
    if len(parcalar) <= 1:
        return parcalar[0][2] if parcalar else []

    # Birden fazla grup: grup etiketi, birikimli metrikler, tek ortak İçgörü adımı
    sonuc, metrik, tur, gezildi = [], {}, 1, False
    for pid, ad, olaylar in parcalar:
        for o in olaylar:
            metrik = {**metrik, **o["metrics"]}
            if pid == "kod":
                tur = o["round"]
            gezinti = o["agent"] == "Tarayıcı Ajanı"
            if o["agent"] == "İçgörü Ajanı" or (gezinti and gezildi):
                continue
            gezildi = gezildi or gezinti
            sonuc.append({**o, "grup": ad, "metrics": metrik, "round": tur if kod_var else 1, "maxRounds": 4 if kod_var else 1})
    sonuc.append(
        {
            "type": "agent_step",
            "agent": "İçgörü Ajanı",
            "kind": "LLM",
            "grup": "Ortak",
            "message": f"{', '.join(ad for _, ad, _ in parcalar)} sonuçları tek raporda birleştiriliyor.",
            "round": 4 if kod_var else 1,
            "maxRounds": 4 if kod_var else 1,
            "metrics": metrik,
        }
    )
    return sonuc
