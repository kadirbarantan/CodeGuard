"""Standardizasyon Katmanı, kod kolu (devamı): kapsama + Kod Haritası → ajana anlamlı geri bildirim (K4 "Doğrula").

Sandbox yalnızca "satır 42 ve 43 çalışmadı" der. Bu modül onu Kod Haritası'yla birleştirir:
"list_posts: satır 42'deki `except ValueError as hata` hiç tetiklenmedi; bu yol 400 döndürüyor".
Ajan bir sonraki turda neyi test etmesi gerektiğini buradan anlar (K6, CoverUp tarzı geri besleme).

Girdiler:
- harita: app.analiz.kod_haritasi.harita_cikar(...)
- ozet:   app.analiz.standart.ozetle(cikti_klasoru) → {"testler": ..., "kapsama": ...}
"""
from __future__ import annotations

# ── Türkçe sayı ekleri ("satır 42'deki", "satır 60'taki") ───────────────

_BIRLER = ["", "bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz"]
_ONLAR = ["", "on", "yirmi", "otuz", "kırk", "elli", "altmış", "yetmiş", "seksen", "doksan"]
_INCE = set("eiöü")
_KALIN = set("aıou")
_SERT = set("fstkçşhp")


def _okunus_son_kelime(n: int) -> str:
    if n % 10:
        return _BIRLER[n % 10]
    if n % 100:
        return _ONLAR[(n % 100) // 10]
    if n % 1000:
        return "yüz"
    return "bin"


def deki(n: int) -> str:
    """42 → "42'deki", 60 → "60'taki", 13 → "13'teki" (sayının okunuşuna göre ünlü ve ünsüz uyumu)."""
    kelime = _okunus_son_kelime(abs(n)) or "sıfır"
    son_unlu = next((h for h in reversed(kelime) if h in _INCE | _KALIN), "e")
    unsuz = "t" if kelime[-1] in _SERT else "d"
    unlu = "e" if son_unlu in _INCE else "a"
    return f"{n}'{unsuz}{unlu}ki"


def _satirlar_metni(satirlar: list[int]) -> str:
    """[42, 43, 44, 50] → "42-44, 50"."""
    parcalar, sirali = [], sorted(set(satirlar))
    i = 0
    while i < len(sirali):
        j = i
        while j + 1 < len(sirali) and sirali[j + 1] == sirali[j] + 1:
            j += 1
        parcalar.append(str(sirali[i]) if i == j else f"{sirali[i]}-{sirali[j]}")
        i = j + 1
    return ", ".join(parcalar)


def _icinde(satir: int, aralik: list[int] | None) -> bool:
    return bool(aralik) and aralik[0] <= satir <= aralik[1]


# ── Eşleştirme ───────────────────────────────────────────────────────────

def _hedefler(gidilmeyen: str) -> list[int]:
    hedefler = []
    for parca in (gidilmeyen or "").split(","):
        try:
            hedefler.append(int(parca.strip()))
        except ValueError:
            continue
    return hedefler


def _hata_notu(birim: dict, satirlar: set[int]) -> str:
    ozetler = [y["ozet"] for y in birim.get("hata_yollari", []) if y["satir"] in satirlar]
    return f" Bu yol şunu döndürüyor/fırlatıyor: {'; '.join(ozetler)}." if ozetler else ""


def _eksik_dal_cumlesi(birim: dict, dal: dict | None, satir: int, hedef: int, tuketilen: set[int]) -> str:
    """coverage'ın "gidilmeyen dal" bilgisini cümleye çevirir. hedef < 0: fonksiyondan çıkış."""
    if hedef < 0:
        hedef_metni = "fonksiyondan çıkış"
    elif tuketilen:
        hedef_metni = f"satır {_satirlar_metni(sorted(tuketilen))}"
    elif any(d["satir"] == hedef and d["tur"] in ("for", "while") for d in birim.get("dallar", [])):
        hedef_metni = f"döngünün sonraki adıma geçmesi, satır {hedef}"
    else:
        hedef_metni = f"satır {hedef}"
    if dal is None:
        return f"Satır {deki(satir)} karar noktasından {hedef_metni} yoluna hiç gidilmedi."
    kosul = f"`{dal['tur']} {dal['kosul']}`"
    dogru_yol = hedef > 0 and _icinde(hedef, dal["govde"])
    if dal["tur"] in ("if", "elif"):
        if dogru_yol:
            return f"Satır {deki(satir)} {kosul} koşulu hiç doğru olmadı; o yol ({hedef_metni}) denenmedi.{_hata_notu(birim, tuketilen)}"
        return f"Satır {deki(satir)} {kosul} koşulu hiç yanlış olmadı; koşulun yanlış olduğu yol ({hedef_metni}) denenmedi.{_hata_notu(birim, tuketilen)}"
    if dal["tur"] in ("for", "while"):
        if dogru_yol:
            return f"Satır {deki(satir)} {kosul} döngüsüne hiç girilmedi; gövdenin çalıştığı durum denenmedi."
        return (f"Satır {deki(satir)} {kosul} döngüsü hiç olağan şekilde bitmedi; her seferinde döngünün içinden çıkıldı. "
                f"Döngünün sonuna gelinen durum (ör. boş koleksiyon ya da aranan bulunamadığında, {hedef_metni}) denenmedi.")
    return f"Satır {deki(satir)} {kosul} noktasından {hedef_metni} yoluna hiç gidilmedi."


def _birim_eksikleri(birim: dict, kapsanmayan: set[int], kapsanan: set[int], eksik_dallar: list[dict]) -> dict | None:
    bas, son = birim["satirlar"]
    govde = birim.get("govde_satirlari") or birim["satirlar"]
    kendi_kapsanmayan = {s for s in kapsanmayan if bas <= s <= son}
    kendi_eksik = [d for d in eksik_dallar if bas <= d["satir"] <= son]
    if not kendi_kapsanmayan and not kendi_eksik:
        return None

    maddeler = []
    calisan_govde = [s for s in kapsanan if govde[0] <= s <= govde[1]]
    if not calisan_govde and kendi_kapsanmayan:
        maddeler.append({
            "tur": "hic_calismadi",
            "satirlar": sorted(kendi_kapsanmayan),
            "aciklama": f"Hiç çağrılmadı; gövdesi (satır {_satirlar_metni(sorted(kendi_kapsanmayan))}) hiç çalışmadı.",
        })
        return {"maddeler": maddeler, "hic_calismadi": True}

    dallar = sorted(birim.get("dallar", []), key=lambda d: (d["govde"][1] - d["govde"][0], -d["satir"]))
    kalan = set(kendi_kapsanmayan)

    # 1) coverage'ın bildirdiği gidilmeyen dallar
    for eksik in sorted(kendi_eksik, key=lambda d: d["satir"]):
        dal = next((d for d in birim.get("dallar", []) if d["satir"] == eksik["satir"]), None)
        for hedef in _hedefler(eksik["gidilmeyen"]):
            tuketilen = set()
            if hedef > 0 and hedef in kalan:  # hedeften başlayan çalışmamış satır dizisi bu yola aittir
                s = hedef
                while s in kalan:
                    tuketilen.add(s)
                    s += 1
                kalan -= tuketilen
            maddeler.append({
                "tur": "dal",
                "satir": eksik["satir"],
                "dal_turu": dal["tur"] if dal else None,
                "hedef": hedef,
                "satirlar": sorted(tuketilen),
                "aciklama": _eksik_dal_cumlesi(birim, dal, eksik["satir"], hedef, tuketilen),
            })

    # 2) kalan çalışmamış satırlar: en içteki dalın gövdesine (ya da else bloğuna) bağla
    gruplar: dict[tuple, set[int]] = {}
    for s in sorted(kalan):
        dal = next((d for d in dallar if _icinde(s, d["govde"]) or s == d["satir"] and d["tur"] in ("except", "case")), None)
        if dal is not None:
            gruplar.setdefault(("govde", dal["satir"]), set()).add(s)
            continue
        dal = next((d for d in dallar if _icinde(s, d.get("degilse"))), None)
        if dal is not None:
            gruplar.setdefault(("degilse", dal["satir"]), set()).add(s)
            continue
        gruplar.setdefault(("diger", 0), set()).add(s)

    for (yer, dal_satiri), satirlar in sorted(gruplar.items(), key=lambda g: min(g[1])):
        metin = _satirlar_metni(sorted(satirlar))
        dal = next((d for d in birim.get("dallar", []) if d["satir"] == dal_satiri), None)
        if yer == "diger" or dal is None:
            aciklama = f"Satır {metin} çalışmadı.{_hata_notu(birim, satirlar)}"
        elif yer == "degilse":
            aciklama = f"Satır {deki(dal_satiri)} `{dal['tur']} {dal['kosul']}` koşulunun yanlış olduğu else bloğu (satır {metin}) hiç çalışmadı.{_hata_notu(birim, satirlar)}"
        elif dal["tur"] == "except":
            aciklama = f"Satır {deki(dal_satiri)} `except {dal['kosul']}` hiç tetiklenmedi (satır {metin} çalışmadı).{_hata_notu(birim, satirlar)}"
        elif dal["tur"] == "case":
            aciklama = f"Satır {deki(dal_satiri)} `case {dal['kosul']}` deseni hiç eşleşmedi (satır {metin} çalışmadı).{_hata_notu(birim, satirlar)}"
        elif dal["tur"] in ("for", "while"):
            aciklama = f"Satır {deki(dal_satiri)} `{dal['tur']} {dal['kosul']}` döngüsünün gövdesi (satır {metin}) hiç çalışmadı.{_hata_notu(birim, satirlar)}"
        else:
            aciklama = f"Satır {deki(dal_satiri)} `{dal['tur']} {dal['kosul']}` koşulu hiç doğru olmadı (satır {metin} çalışmadı).{_hata_notu(birim, satirlar)}"
        maddeler.append({"tur": "satirlar" if yer == "diger" else "dal", "satir": dal_satiri or min(satirlar),
                         "dal_turu": dal["tur"] if dal else None, "satirlar": sorted(satirlar), "aciklama": aciklama})

    maddeler.sort(key=lambda m: m.get("satir") or 0)
    return {"maddeler": maddeler, "hic_calismadi": False}


def kapsama_geri_bildirimi(harita: dict, ozet: dict) -> dict:
    """Sandbox sonucunu ve Kod Haritası'nı birleştirip ajan için birim bazında geri bildirim üretir."""
    testler, kapsama = ozet.get("testler"), ozet.get("kapsama")
    sonuc = {
        "testler": None,
        "kalan_testler": [],
        "kapsama": None,
        "eksikler": [],
        "harita_disi": [],
    }
    if testler:
        sonuc["testler"] = {k: testler[k] for k in ("toplam", "gecti", "kaldi", "hata", "atlandi")}
        sonuc["kalan_testler"] = [{"ad": t["ad"], "durum": t["durum"], "mesaj": t["mesaj"]} for t in testler["basarisizlar"]]
    if not kapsama:
        return sonuc
    sonuc["kapsama"] = {"satir_yuzde": kapsama["satir_yuzde"], "dal_yuzde": kapsama["dal_yuzde"]}

    birimler_dosyada: dict[str, list[dict]] = {}
    for birim in harita["birimler"]:
        if birim["tur"] != "sinif" and birim.get("hedef", True):
            birimler_dosyada.setdefault(birim["dosya"], []).append(birim)

    for dosya in kapsama["dosyalar"]:
        kapsanmayan = set(dosya["kapsanmayan_satirlar"])
        kapsanan = set(dosya.get("kapsanan_satirlar", []))
        if not kapsanmayan and not dosya["eksik_dallar"]:
            continue
        birimler = birimler_dosyada.get(dosya["yol"], [])
        # İç içe birimlerde satır en içteki birime aittir: önce küçük birimler
        birimler = sorted(birimler, key=lambda b: b["satirlar"][1] - b["satirlar"][0])
        atanan: set[int] = set()
        atanan_dal: set[int] = set()
        for birim in birimler:
            bas, son = birim["satirlar"]
            kendi = {s for s in kapsanmayan - atanan if bas <= s <= son}
            dallar = [d for d in dosya["eksik_dallar"] if bas <= d["satir"] <= son and d["satir"] not in atanan_dal]
            sonuc_birim = _birim_eksikleri(birim, kendi, kapsanan, dallar)
            atanan |= kendi
            atanan_dal |= {d["satir"] for d in dallar}
            if sonuc_birim:
                sonuc["eksikler"].append({
                    "birim": birim["id"],
                    "imza": birim["imza"],
                    "risk": birim.get("risk"),
                    "belge": birim.get("belge"),
                    **sonuc_birim,
                })
        disarida = sorted(kapsanmayan - atanan)
        if disarida:
            sonuc["harita_disi"].append({
                "dosya": dosya["yol"],
                "satirlar": disarida,
                "aciklama": f"Modül düzeyinde satır {_satirlar_metni(disarida)} çalışmadı (fonksiyon dışındaki kod).",
            })
    sonuc["eksikler"].sort(key=lambda e: e["birim"])
    return sonuc


def geri_bildirim_metni(gb: dict, belgeler: bool = False) -> str:
    """Ajanın istemine girecek kısa metin."""
    satirlar = []
    t = gb.get("testler")
    if t:
        parca = [f"{t['toplam']} test", f"{t['gecti']} geçti", f"{t['kaldi']} kaldı"]
        if t["hata"]:
            parca.append(f"{t['hata']} hata")
        satirlar.append("Testler: " + ", ".join(parca) + ".")
        for kalan in gb["kalan_testler"]:
            satirlar.append(f"- {kalan['durum'].upper()} {kalan['ad']}: {kalan['mesaj'].splitlines()[0] if kalan['mesaj'] else ''}")
    k = gb.get("kapsama")
    if k:
        satirlar.append(f"Kapsama: satır %{k['satir_yuzde']}, dal %{k['dal_yuzde']}.")
    if gb.get("eksikler") or gb.get("harita_disi"):
        satirlar.append("Test edilmeyen yerler:")
        for e in gb["eksikler"]:
            satirlar.append(f"- {e['birim']} | {e['imza']}")
            if belgeler and e.get("belge"):
                satirlar.append(f"  Belge: {' '.join(e['belge'].split())}")
            for m in e["maddeler"]:
                satirlar.append(f"  * {m['aciklama']}")
        for h in gb.get("harita_disi", []):
            satirlar.append(f"- {h['dosya']}: {h['aciklama']}")
    return "\n".join(satirlar)
