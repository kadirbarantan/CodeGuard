"""Kod Haritası: Python okuyucusu (tree-sitter, K4).

Bir Python dosyasını sözdizimi ağacına çevirir ve her birim (fonksiyon, metot, sınıf) için şunları çıkarır:
imza, satır aralığı, belge metni (docstring), dallar (if/elif/for/while/except/case), hata yolları (raise),
çağrılar, projedeki bağımlılıklar, kullandığı dış modüller.

Kodu çalıştırmaz; yalnızca okur. Sözdizimi hatalı dosyada da okunabilen kısım çıkarılır.
Diğer diller (JS/TS, C#, PHP) aynı çıktı biçimiyle ayrı modüllere eklenecek.
"""
from __future__ import annotations

import ast
import inspect
import re
import sys

import tree_sitter_python
from tree_sitter import Language, Node, Parser

DIL = Language(tree_sitter_python.language())

STANDART_KUTUPHANE = set(sys.stdlib_module_names)

BELGE_EN_FAZLA = 600
KOSUL_EN_FAZLA = 120
_TANIM_TURLERI = {"function_definition", "class_definition", "decorated_definition"}


# ── Yardımcılar ──────────────────────────────────────────────────────────

def _metin(dugum: Node | None) -> str:
    return dugum.text.decode("utf-8", "replace") if dugum is not None else ""


def _tek_satir(metin: str, en_fazla: int = KOSUL_EN_FAZLA) -> str:
    metin = " ".join(metin.split())
    return metin if len(metin) <= en_fazla else metin[: en_fazla - 1] + "…"


def _satir(dugum: Node) -> int:
    return dugum.start_point[0] + 1


def _araligi(dugum: Node) -> list[int]:
    return [dugum.start_point[0] + 1, dugum.end_point[0] + 1]


def _tum_dugumler(dugum: Node):
    for cocuk in dugum.named_children:
        yield cocuk
        yield from _tum_dugumler(cocuk)


def _alt_dugumler(dugum: Node):
    """Bir birimin gövdesindeki düğümler; iç içe tanımlanan fonksiyon ve sınıflara girmez (onlar ayrı birim)."""
    for cocuk in dugum.named_children:
        if cocuk.type in _TANIM_TURLERI:
            continue
        yield cocuk
        yield from _alt_dugumler(cocuk)


def _belge(govde: Node | None) -> str | None:
    """Gövdenin ilk ifadesi bir metinse (docstring) temizlenmiş hâlini döndürür."""
    if govde is None or not govde.named_children:
        return None
    ilk = govde.named_children[0]
    if ilk.type != "expression_statement" or not ilk.named_children or ilk.named_children[0].type != "string":
        return None
    ham = _metin(ilk.named_children[0])
    try:
        metin = ast.literal_eval(ham)
    except (ValueError, SyntaxError):
        metin = ham.strip("\"'")
    if not isinstance(metin, str):
        return None
    metin = inspect.cleandoc(metin)
    return metin if len(metin) <= BELGE_EN_FAZLA else metin[:BELGE_EN_FAZLA] + "…"


def _hata_ozeti(ifade: str) -> str:
    """raise ifadesini kısa açıklamaya çevirir: HTTPException(400, "Boş") → "400 Boş"; ValueError("x") → "ValueError: x"."""
    try:
        agac = ast.parse(ifade, mode="eval").body
    except SyntaxError:
        return _tek_satir(ifade)
    if not isinstance(agac, ast.Call):
        return _tek_satir(ifade)
    def deger(dugum):  # sabitse değeri, değilse kodu (ör. str(hata))
        return dugum.value if isinstance(dugum, ast.Constant) else ast.unparse(dugum)

    ad = ast.unparse(agac.func)
    argumanlar = [deger(a) for a in agac.args]
    anahtarlar = {k.arg: deger(k.value) for k in agac.keywords if k.arg}
    if ad.endswith("HTTPException"):
        kod = argumanlar[0] if argumanlar else anahtarlar.get("status_code", "?")
        aciklama = argumanlar[1] if len(argumanlar) > 1 else anahtarlar.get("detail", "")
        return _tek_satir(f"{kod} {aciklama}".strip())
    mesaj = argumanlar[0] if argumanlar else None
    return _tek_satir(f"{ad}: {mesaj}" if mesaj not in (None, "") else ad)


# ── İçe aktarmalar ───────────────────────────────────────────────────────

def _klasor(yol: str) -> str:
    return yol.rsplit("/", 1)[0] if "/" in yol else ""


def _mutlak_tabanlar(yol: str) -> list[str]:
    """Mutlak import'lar önce proje kökünden, sonra dosyanın üst klasörlerinden çözülür (src/ düzeni için)."""
    tabanlar, klasor = [""], _klasor(yol)
    parcalar = klasor.split("/") if klasor else []
    for n in range(1, len(parcalar) + 1):
        tabanlar.append("/".join(parcalar[:n]))
    return tabanlar


class _Cozucu:
    """Modül adını projedeki dosyaya çevirir: a.b → a/b.py ya da a/b/__init__.py."""

    def __init__(self, dosyalar: set[str]):
        self.dosyalar = dosyalar

    def __call__(self, tabanlar: list[str], parcalar: list[str]) -> str | None:
        for taban in tabanlar:
            yol = "/".join(p for p in [taban, *parcalar] if p)
            for aday in (yol + ".py", yol + "/__init__.py"):
                if aday in self.dosyalar:
                    return aday
        return None


def importlari_oku(kok: Node, yol: str, cozucu: _Cozucu) -> tuple[list[dict], dict[str, dict]]:
    """Dosyadaki import'lar (liste) ve kodda kullanılan adların nereden geldiği (tablo).

    tablo[ad] = {"dosya": yerel dosya ya da None, "ad": modüldeki asıl ad ya da None (ad bir modülse),
                 "modul": modül adı, "goreli": bool, "parcalar": [...], "tabanlar": [...]}
    """
    liste, tablo = [], {}
    for dugum in _tum_dugumler(kok):
        if dugum.type == "import_statement":
            for ad_dugumu in dugum.named_children:
                if ad_dugumu.type == "aliased_import":
                    modul, takma = _metin(ad_dugumu.child_by_field_name("name")), _metin(ad_dugumu.child_by_field_name("alias"))
                else:
                    modul, takma = _metin(ad_dugumu), None
                tabanlar, parcalar = _mutlak_tabanlar(yol), modul.split(".")
                liste.append({"modul": modul, "adlar": [], "satir": _satir(dugum), "yerel": cozucu(tabanlar, parcalar)})
                # "import a.b.c" kodda "a" adını tanımlar; "import a.b as x" ise "x"i
                bagli = parcalar if takma else parcalar[:1]
                tablo[takma or parcalar[0]] = {
                    "dosya": cozucu(tabanlar, bagli), "ad": None, "modul": ".".join(bagli),
                    "goreli": False, "parcalar": bagli, "tabanlar": tabanlar,
                }
        elif dugum.type == "import_from_statement":
            modul_dugumu = dugum.child_by_field_name("module_name")
            modul_metni = _metin(modul_dugumu)
            goreli = modul_dugumu is not None and modul_dugumu.type == "relative_import"
            if goreli:
                nokta = len(modul_metni) - len(modul_metni.lstrip("."))
                taban = _klasor(yol)
                for _ in range(nokta - 1):
                    taban = _klasor(taban)
                tabanlar, parcalar = [taban], [p for p in modul_metni.lstrip(".").split(".") if p]
            else:
                tabanlar, parcalar = _mutlak_tabanlar(yol), modul_metni.split(".")
            modul_dosyasi = cozucu(tabanlar, parcalar)

            adlar = []
            for ad_dugumu in dugum.children_by_field_name("name"):
                if ad_dugumu.type == "aliased_import":
                    asil, takma = _metin(ad_dugumu.child_by_field_name("name")), _metin(ad_dugumu.child_by_field_name("alias"))
                else:
                    asil, takma = _metin(ad_dugumu), None
                adlar.append(asil)
                alt_modul = cozucu(tabanlar, [*parcalar, asil])  # from paket import alt_modul
                if alt_modul:
                    tablo[takma or asil] = {"dosya": alt_modul, "ad": None, "modul": f"{modul_metni}.{asil}",
                                            "goreli": goreli, "parcalar": [*parcalar, asil], "tabanlar": tabanlar}
                else:
                    tablo[takma or asil] = {"dosya": modul_dosyasi, "ad": asil, "modul": modul_metni,
                                            "goreli": goreli, "parcalar": parcalar, "tabanlar": tabanlar}
            if any(c.type == "wildcard_import" for c in dugum.named_children):
                adlar.append("*")
            liste.append({"modul": modul_metni, "adlar": adlar, "satir": _satir(dugum), "yerel": modul_dosyasi})
    return liste, tablo


# ── Birimin içi ──────────────────────────────────────────────────────────

def _dallar(govde: Node) -> list[dict]:
    """Karar noktaları. "govde": koşul doğruyken (ya da döngüye girilince, hata yakalanınca) çalışan satırlar."""
    dallar = []
    for d in _alt_dugumler(govde):
        if d.type in ("if_statement", "elif_clause"):
            dal = {
                "satir": _satir(d), "tur": "if" if d.type == "if_statement" else "elif",
                "kosul": _tek_satir(_metin(d.child_by_field_name("condition"))),
                "govde": _araligi(d.child_by_field_name("consequence")),
            }
            # else bloğu zincirin son if/elif'ine aittir: koşul yanlışken çalışan satırlar
            sonraki = d.next_named_sibling if d.type == "elif_clause" else None
            alternatifler = d.children_by_field_name("alternative") if d.type == "if_statement" else []
            if d.type == "if_statement" and alternatifler and alternatifler[0].type == "else_clause":
                sonraki = alternatifler[0]
            if sonraki is not None and sonraki.type == "else_clause":
                blok = sonraki.child_by_field_name("body") or next((c for c in sonraki.named_children if c.type == "block"), None)
                if blok is not None:
                    dal["degilse"] = _araligi(blok)
            dallar.append(dal)
        elif d.type == "for_statement":
            kosul = f"{_metin(d.child_by_field_name('left'))} in {_metin(d.child_by_field_name('right'))}"
            dallar.append({"satir": _satir(d), "tur": "for", "kosul": _tek_satir(kosul),
                           "govde": _araligi(d.child_by_field_name("body"))})
        elif d.type == "while_statement":
            dallar.append({"satir": _satir(d), "tur": "while", "kosul": _tek_satir(_metin(d.child_by_field_name("condition"))),
                           "govde": _araligi(d.child_by_field_name("body"))})
        elif d.type in ("except_clause", "case_clause"):
            blok = next((c for c in d.named_children if c.type == "block"), None)
            baslik = " ".join(_metin(c) for c in d.named_children if c.type != "block")
            dallar.append({
                "satir": _satir(d), "tur": "except" if d.type == "except_clause" else "case",
                "kosul": _tek_satir(baslik) or "tüm hatalar",
                "govde": _araligi(blok) if blok is not None else _araligi(d),
            })
    return dallar


def _hata_yollari(govde: Node) -> list[dict]:
    yollar = []
    for d in _alt_dugumler(govde):
        if d.type == "raise_statement":
            ifade = _metin(d.named_children[0]) if d.named_children else ""
            yollar.append({
                "satir": _satir(d),
                "ifade": _tek_satir(ifade) if ifade else "raise",
                "ozet": _hata_ozeti(ifade) if ifade else "yakalanan hata yeniden fırlatılıyor",
            })
    return yollar


def _cagrilar(govde: Node) -> list[str]:
    adlar = []
    for d in _alt_dugumler(govde):
        if d.type == "call":
            fonksiyon = d.child_by_field_name("function")
            if fonksiyon is not None and fonksiyon.type in ("identifier", "attribute"):
                ad = _tek_satir(_metin(fonksiyon), 80)
                if ad not in adlar:
                    adlar.append(ad)
    return adlar


def _imza(tanim: Node, sinif_mi: bool) -> str:
    ad = _metin(tanim.child_by_field_name("name"))
    if sinif_mi:
        ust = tanim.child_by_field_name("superclasses")
        return f"class {ad}{_tek_satir(_metin(ust), 200) if ust is not None else ''}"
    parametreler = _tek_satir(_metin(tanim.child_by_field_name("parameters")), 200)
    parametreler = re.sub(r",?\s*\)$", ")", re.sub(r"^\(\s+", "(", parametreler))  # çok satırlı yazımı toparla
    donus = tanim.child_by_field_name("return_type")
    on_ek = "async " if any(c.type == "async" for c in tanim.children) else ""
    return f"{on_ek}{ad}{parametreler}" + (f" -> {_tek_satir(_metin(donus), 80)}" if donus is not None else "")


# ── Dosya ────────────────────────────────────────────────────────────────

class PythonDosyasi:
    """Tek bir Python dosyasının ham haritası. Bağımlılıklar bütün dosyalar okunduktan sonra çözülür."""

    def __init__(self, yol: str, kaynak: bytes, cozucu: _Cozucu):
        self.yol = yol
        self.cozucu = cozucu
        self.agac = Parser(DIL).parse(kaynak)
        self.kok = self.agac.root_node
        self.satir_sayisi = kaynak.count(b"\n") + (0 if kaynak.endswith(b"\n") or not kaynak else 1)
        self.belge = _belge(self.kok)
        self.importlar, self.ad_tablosu = importlari_oku(self.kok, yol, cozucu)
        self.birimler: list[dict] = []
        self._topla(self.kok, ust=None)

    def _topla(self, dugum: Node, ust: dict | None) -> None:
        for cocuk in dugum.named_children:
            tanim, dekoratorler = cocuk, []
            if cocuk.type == "decorated_definition":
                tanim = cocuk.child_by_field_name("definition")
                dekoratorler = [_tek_satir(_metin(d).lstrip("@")) for d in cocuk.named_children if d.type == "decorator"]
            if tanim is not None and tanim.type in ("function_definition", "class_definition"):
                self._birim_ekle(tanim, cocuk, dekoratorler, ust)
            elif cocuk.type not in _TANIM_TURLERI and ust is None:
                # Modül düzeyindeki if/try blokları içindeki tanımlar da birimdir (ör. if TYPE_CHECKING:)
                self._topla(cocuk, ust)

    def _birim_ekle(self, tanim: Node, kapsayan: Node, dekoratorler: list[str], ust: dict | None) -> None:
        sinif_mi = tanim.type == "class_definition"
        ad = _metin(tanim.child_by_field_name("name"))
        tam_ad = f"{ust['tam_ad']}.{ad}" if ust else ad
        govde = tanim.child_by_field_name("body")
        tur = "sinif" if sinif_mi else ("metot" if ust is not None and ust["tur"] == "sinif" else "fonksiyon")
        birim = {
            "id": f"{self.yol}::{tam_ad}",
            "dosya": self.yol,
            "ad": ad,
            "tam_ad": tam_ad,
            "tur": tur,
            "imza": _imza(tanim, sinif_mi),
            "satirlar": _araligi(kapsayan),
            "govde_satirlari": _araligi(govde) if govde is not None else _araligi(tanim),
            "dekoratorler": dekoratorler,
            "belge": _belge(govde),
        }
        if sinif_mi:
            birim["metotlar"] = []
        else:
            birim["dallar"] = _dallar(govde) if govde is not None else []
            birim["hata_yollari"] = _hata_yollari(govde) if govde is not None else []
            birim["cagrilar"] = _cagrilar(govde) if govde is not None else []
        if tur == "metot":
            ust["metotlar"].append(birim["id"])
        self.birimler.append(birim)
        if govde is not None:
            self._topla(govde, birim)

    def dis_modul(self, cagri: str) -> str | None:
        """Çağrı proje dışındaki bir modüle gidiyorsa modülün kök adı (ör. hashlib.sha256 → hashlib)."""
        kayit = self.ad_tablosu.get(cagri.split(".")[0])
        if kayit is None or kayit["dosya"] is not None or kayit["goreli"]:
            return None
        return kayit["parcalar"][0] if kayit["parcalar"] else None

    def yerel_hedef(self, cagri: str, birim: dict, tanimlar: dict[str, set[str]]) -> str | None:
        """Çağrının projedeki karşılığı (birim id'si); bulunamazsa None."""
        parcalar = cagri.split(".")
        kendi = tanimlar.get(self.yol, set())
        if parcalar[0] in ("self", "cls") and len(parcalar) == 2:
            if birim["tur"] == "metot":
                sinif = birim["tam_ad"].rsplit(".", 1)[0]
                if f"{sinif}.{parcalar[1]}" in kendi:
                    return f"{self.yol}::{sinif}.{parcalar[1]}"
            return None
        if len(parcalar) == 1 and f"{birim['tam_ad']}.{parcalar[0]}" in kendi:  # iç içe tanımlı fonksiyon
            return f"{self.yol}::{birim['tam_ad']}.{parcalar[0]}"
        if ".".join(parcalar) in kendi and parcalar[0] not in self.ad_tablosu:
            return f"{self.yol}::{'.'.join(parcalar)}"
        kayit = self.ad_tablosu.get(parcalar[0])
        if kayit is None:
            return None
        if kayit["ad"] is not None:  # from modul import ad → ad(.alt)
            if kayit["dosya"] is None:
                return None
            ad = ".".join([kayit["ad"], *parcalar[1:]])
            return f"{kayit['dosya']}::{ad}" if ad in tanimlar.get(kayit["dosya"], set()) else None
        # import modul → modul.alt_modul.ad: en uzun modül yolundan başlayarak dene
        for k in range(len(parcalar) - 1, 0, -1):
            dosya = self.cozucu(kayit["tabanlar"], [*kayit["parcalar"], *parcalar[1:k]])
            ad = ".".join(parcalar[k:])
            if dosya and ad in tanimlar.get(dosya, set()):
                return f"{dosya}::{ad}"
        return None
