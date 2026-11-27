"""Bağlam Çözümleyici, ilk sürüm (belge 08, K17; frontend mock'u: src/mock/baglamCozumleyici.js).

Hedef: kullanıcının seçtiği dosyalar. Testler bunlara yazılır, kapsama bunlarda ölçülür.
Bağlam: hedefin çalışması için gereken dosyalar. Otomatik eklenir, test edilmez.

Kurallar (deterministik, LLM kullanılmaz; K9):
1. Arayüz, kullanılabilirlik ya da erişilebilirlik testi varsa uygulamanın tamamı gerekir → tüm repo.
2. Manifest ve ayar dosyaları (requirements.txt, package.json, composer.json, .sln …): kökte ya da
   hedefin üst klasörlerinde olanlar.
3. İçe aktarma (import) grafiği, geçişli:
   - Python: `ast` ile import / from-import; paket yolundaki __init__.py dosyaları.
   - JS/TS: düzenli ifadeyle import / export from / require / import(); yalnızca göreli yollar ve `@/` (src/).
   - PHP: require/include ve composer.json'daki PSR-4 eşlemesiyle `use`.
4. C#: derleme birimi projedir → hedefin projesinin (en yakın .csproj) tamamı + ProjectReference'lar.

Dosya içeriği `oku(yol)` ile alınır: repo uçlarında GitHub'dan tek tek (blob), test başlatırken
indirilen arşivden. Kadir'in tree-sitter Kod Haritası gelince birleştirme konuşulacak.
"""
import ast
import json
import posixpath
import re
from collections.abc import Awaitable, Callable, Iterable

from app.calistirma.yukleme import HARIC

Okuyucu = Callable[[str], Awaitable[str | None]]

ARAYUZ_TURLERI = {"arayuz", "kullanilabilirlik", "erisilebilirlik"}
# Bağlam bundan büyükse durulur; site zaten 200 dosya sınırını aşınca uyarır
EN_FAZLA_BAGLAM = 1000

SABIT = [
    re.compile(r"(^|/)requirements(-[\w.-]+)?\.txt$"),
    re.compile(r"(^|/)pyproject\.toml$"),
    re.compile(r"(^|/)setup\.(cfg|py)$"),
    re.compile(r"(^|/)conftest\.py$"),
    re.compile(r"(^|/)(pytest|tox)\.ini$"),
    re.compile(r"(^|/)package(-lock)?\.json$"),
    re.compile(r"(^|/)(yarn\.lock|pnpm-lock\.yaml)$"),
    re.compile(r"(^|/)tsconfig(\.[\w-]+)?\.json$"),
    re.compile(r"(^|/)(vite|vitest|jest|babel|webpack)\.config\.\w+$"),
    re.compile(r"(^|/)\.babelrc$"),
    re.compile(r"(^|/)composer\.(json|lock)$"),
    re.compile(r"(^|/)phpunit\.xml(\.dist)?$"),
    re.compile(r"\.sln$"),
    re.compile(r"(^|/)(Directory\.Build\.props|global\.json|NuGet\.config)$"),
]

PY = (".py",)
JS = (".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".vue", ".svelte")
JS_UZANTILAR = ["", ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".json", ".vue", ".svelte"]
PHP = (".php",)
CS = (".cs", ".cshtml", ".razor")


def haric_mi(yol: str) -> bool:
    return any(p in HARIC for p in yol.split("/")[:-1])


def klasor(yol: str) -> str:
    return posixpath.dirname(yol)


def atalar(yol: str) -> list[str]:
    """Dosyanın üst klasörleri, en yakından köke ('') doğru."""
    sonuc, k = [], klasor(yol)
    while k:
        sonuc.append(k)
        k = klasor(k)
    sonuc.append("")
    return sonuc


def _birlestir(*parcalar: str) -> str:
    yol = posixpath.normpath("/".join(p for p in parcalar if p))
    return "" if yol == "." else yol


# ── Python ──────────────────────────────────────────────────────────────


def _py_modul(kok: str, parcalar: list[str], kume: set[str]) -> str | None:
    taban = _birlestir(kok, *parcalar)
    for aday in (taban + ".py", taban + "/__init__.py"):
        if aday in kume:
            return aday
    return None


def python_importlari(yol: str, metin: str, kume: set[str]) -> list[str]:
    try:
        agac = ast.parse(metin)
    except (SyntaxError, ValueError):
        return []
    kokler = list(reversed(atalar(yol)))  # önce repo kökü, sonra alt klasörler (ör. backend/)
    bulunan: list[str] = []

    def coz(kokler_: list[str], parcalar: list[str]) -> str | None:
        # import a.b.c: a.b.c yoksa a.b, o da yoksa a (kısmi eşleşme)
        for n in range(len(parcalar), 0, -1):
            for kok in kokler_:
                if hedef := _py_modul(kok, parcalar[:n], kume):
                    return hedef
        return None

    for dugum in ast.walk(agac):
        if isinstance(dugum, ast.Import):
            for ad in dugum.names:
                if hedef := coz(kokler, ad.name.split(".")):
                    bulunan.append(hedef)
        elif isinstance(dugum, ast.ImportFrom):
            modul = dugum.module.split(".") if dugum.module else []
            if dugum.level:
                taban = klasor(yol)
                for _ in range(dugum.level - 1):
                    taban = klasor(taban)
                kokler_ = [taban]
            else:
                kokler_ = kokler
            # from paket import alt_modul: alt modülün dosyası (varsa)
            for ad in dugum.names:
                if ad.name == "*":
                    continue
                for kok in kokler_:
                    if hedef := _py_modul(kok, [*modul, ad.name], kume):
                        bulunan.append(hedef)
                        break
            if modul and (hedef := coz(kokler_, modul)):
                bulunan.append(hedef)
    return bulunan


# ── JavaScript / TypeScript ─────────────────────────────────────────────

_JS_STATIK = re.compile(r"""(?:^|[\s;}])(?:import|export)\s+(?:[^'"`;]*?\s+from\s+)?['"]([^'"\n]+)['"]""")
_JS_DINAMIK = re.compile(r"""(?:require|import)\s*\(\s*['"]([^'"\n]+)['"]\s*\)""")
_JS_YORUM = re.compile(r"/\*.*?\*/|(?<![:'\"\w])//[^\n]*", re.S)


def _js_coz(taban: str, kume: set[str]) -> str | None:
    adaylar = [taban + u for u in JS_UZANTILAR] + [taban + "/index" + u for u in JS_UZANTILAR[1:]]
    # TS: import './a.js' → a.ts
    if taban.endswith(".js"):
        adaylar += [taban[:-3] + ".ts", taban[:-3] + ".tsx"]
    return next((a for a in adaylar if a in kume), None)


def js_importlari(yol: str, metin: str, kume: set[str]) -> list[str]:
    metin = _JS_YORUM.sub(" ", metin)
    bulunan = []
    for es in [*_JS_STATIK.finditer(metin), *_JS_DINAMIK.finditer(metin)]:
        belirtec = es.group(1).split("?")[0]
        if belirtec.startswith("."):
            taban = _birlestir(klasor(yol), belirtec)
        elif belirtec.startswith("@/"):
            # Vite/Vue'da yaygın takma ad: @ → src (hedefin en yakın src klasörü, yoksa kökteki)
            src = next((_birlestir(a, "src") for a in atalar(yol) if any(k.startswith(_birlestir(a, "src") + "/") for k in kume)), "src")
            taban = _birlestir(src, belirtec[2:])
        else:
            continue  # paket (node_modules) ya da mutlak adres
        if taban and not taban.startswith("..") and (hedef := _js_coz(taban, kume)):
            bulunan.append(hedef)
    return bulunan


# ── PHP ─────────────────────────────────────────────────────────────────

_PHP_DAHIL = re.compile(r"""(?:require|include)(?:_once)?\s*\(?\s*(__DIR__\s*\.\s*)?['"]([^'"\n]+)['"]""")
_PHP_USE = re.compile(r"(?:^|[;{]|<\?php)\s*use\s+([A-Za-z_\\][\w\\]*)(?:\s+as\s+\w+)?\s*;", re.M)


def php_importlari(yol: str, metin: str, kume: set[str], psr4: dict[str, str]) -> list[str]:
    bulunan = []
    for es in _PHP_DAHIL.finditer(metin):
        dizin_mi, hedef = es.group(1), es.group(2)
        adaylar = [_birlestir(klasor(yol), hedef.lstrip("/"))]
        if not dizin_mi:
            adaylar.append(_birlestir(hedef.lstrip("/")))
        bulunan += [a for a in adaylar[:2] if a in kume][:1]
    for es in _PHP_USE.finditer(metin):
        sinif = es.group(1).lstrip("\\")
        for onek, dizin in sorted(psr4.items(), key=lambda x: -len(x[0])):
            if sinif.startswith(onek):
                aday = _birlestir(dizin, sinif[len(onek) :].replace("\\", "/") + ".php")
                if aday in kume:
                    bulunan.append(aday)
                break
    return bulunan


async def _psr4(kume: set[str], oku: Okuyucu) -> dict[str, str]:
    """Kökteki composer.json → { "App\\": "app" }"""
    if "composer.json" not in kume:
        return {}
    try:
        veri = json.loads(await oku("composer.json") or "{}")
    except ValueError:
        return {}
    eslemeler = {}
    for bolum in ("autoload", "autoload-dev"):
        for onek, dizin in ((veri.get(bolum) or {}).get("psr-4") or {}).items():
            for d in dizin if isinstance(dizin, list) else [dizin]:
                eslemeler[onek] = _birlestir(str(d))
    return eslemeler


# ── C# ──────────────────────────────────────────────────────────────────

_CSPROJ_REF = re.compile(r"""<ProjectReference\s+Include\s*=\s*["']([^"']+)["']""", re.I)


def _proje_klasoru(yol: str, proje_klasorleri: set[str]) -> str | None:
    return next((a for a in atalar(yol) if a in proje_klasorleri), None)


async def _cs_projeleri(hedefler: list[str], tum: list[str], oku: Okuyucu) -> tuple[dict[str, str], set[str]]:
    """→ (proje klasörü → .csproj yolu, hedeflerin projeleri + referansları)"""
    csprojlar = {klasor(d): d for d in tum if d.endswith(".csproj")}
    projeler = {p for h in hedefler if h.endswith(CS) and (p := _proje_klasoru(h, set(csprojlar))) is not None}
    kuyruk = list(projeler)
    while kuyruk:
        p = kuyruk.pop()
        metin = await oku(csprojlar[p]) or ""
        for es in _CSPROJ_REF.finditer(metin):
            ref = _birlestir(p, es.group(1).replace("\\", "/"))
            rp = klasor(ref)
            if ref in csprojlar.values() and rp not in projeler:
                projeler.add(rp)
                kuyruk.append(rp)
    return csprojlar, projeler


# ── Çözümleyici ─────────────────────────────────────────────────────────


async def coz(dosyalar: Iterable[str], hedefler: list[str], tur: list[str], oku: Okuyucu) -> dict:
    """dosyalar: repodaki bütün dosya yolları. → { baglam: [{ yol, neden }], tumRepo }"""
    tum = [d for d in dosyalar if not haric_mi(d)]
    kume = set(tum)
    hedef = [h for h in dict.fromkeys(hedefler) if h in kume]
    hedef_kume = set(hedef)
    baglam: dict[str, str] = {}

    def ekle(yol: str, neden: str) -> bool:
        if yol in kume and yol not in hedef_kume and yol not in baglam:
            baglam[yol] = neden
            return True
        return False

    def sonuc(tum_repo: bool) -> dict:
        return {"baglam": [{"yol": y, "neden": n} for y, n in sorted(baglam.items())], "tumRepo": tum_repo}

    # 1. Arayüz ve denetim testlerinde uygulamanın tamamı ayağa kalkmalı
    if ARAYUZ_TURLERI & set(tur):
        for d in tum:
            ekle(d, "Arayüz testi için uygulamanın tamamı gerekir")
        return sonuc(True)

    # 2. Manifest / ayar dosyaları: kökte ya da hedeflerin üst klasörlerinde
    ust_klasorler = {a for h in hedef for a in atalar(h)} or {""}
    for d in tum:
        if klasor(d) in ust_klasorler and any(r.search(d) for r in SABIT):
            ekle(d, "Manifest / ayar dosyası")

    # 4. C#: hedefin projesinin tamamı + proje referansları
    if any(h.endswith(CS) for h in hedef):
        csprojlar, projeler = await _cs_projeleri(hedef, tum, oku)
        hedef_projeleri = {_proje_klasoru(h, set(csprojlar)) for h in hedef}
        for d in tum:
            p = _proje_klasoru(d, set(csprojlar))
            if p is not None and p in projeler:
                ekle(d, "Aynı C# projesi" if p in hedef_projeleri else "Proje referansı")

    # 3. İçe aktarma grafiği (geçişli)
    psr4 = await _psr4(kume, oku) if any(h.endswith(PHP) for h in hedef) else {}
    kuyruk = list(hedef)
    gezildi: set[str] = set()
    while kuyruk and len(baglam) < EN_FAZLA_BAGLAM:
        yol = kuyruk.pop(0)
        if yol in gezildi:
            continue
        gezildi.add(yol)
        if yol.endswith(PY):
            # Python paketi: yolun üstündeki __init__.py dosyaları
            for a in atalar(yol):
                if a and ekle(a + "/__init__.py", "Python paketi (__init__.py)"):
                    kuyruk.append(a + "/__init__.py")
        if not yol.endswith(PY + JS + PHP):
            continue
        metin = await oku(yol)
        if metin is None:
            continue
        if yol.endswith(PY):
            yeni = python_importlari(yol, metin, kume)
        elif yol.endswith(JS):
            yeni = js_importlari(yol, metin, kume)
        else:
            yeni = php_importlari(yol, metin, kume, psr4)
        ad = yol.rsplit("/", 1)[-1]
        for y in yeni:
            ekle(y, f"{ad} import ediyor")
            if y not in gezildi:
                kuyruk.append(y)
    return sonuc(False)
