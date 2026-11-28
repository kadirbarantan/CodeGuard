"""Ajanın yazdığı testlerin statik denetimi (K6 "hile önleme") ve test ayıklama.

Doğrulayıcı testleri çalıştırmadan önce her dosyayı denetler:
- **Yol:** yalnızca `tests/test_<ad>.py` ve `tests/conftest.py`. Ajan proje dosyalarına yazamaz (K6-1).
- **Sözdizimi:** derlenemeyen dosya "hızlı düzeltme" için ajana geri döner (K6; tur sayacından düşmez).
- **Dosya düzeyindeki yasaklar:**
  - coverage ile oynama: coverage ya da trace modülünü içe aktarma, sys.settrace;
  - pytest kancaları: pytest_* fonksiyonları, pytest_plugins;
  - modül düzeyinde skip/xfail.
- **Test düzeyinde ret (K6-2):**
  - doğrulama yok: assert, pytest.raises ya da mock.assert_* kullanılmamış;
  - yalnızca boş doğrulama: assert True, assert x == x;
  - skip/xfail işareti;
  - hatayı yutan try/except.

Reddedilen testler dosyadan çıkarılır ve nedeniyle birlikte sonraki turda ajana bildirilir.
Olası Hata kilidi (K6: "test koda uydurulmaz") için yardımcılar da burada: fonksiyon_kaynagi, ayni_test_mi, fonksiyonu_koy.
Kurallar Python'a özgüdür; diğer diller için aynı arayüzle ayrı denetçiler yazılacak.
"""
from __future__ import annotations

import ast
import re
import textwrap
from dataclasses import dataclass, field

TEST_YOLU = re.compile(r"^tests/(?:test_[A-Za-z0-9_]+|conftest)\.py$")
YASAK_MODULLER = {"coverage", "trace", "_pytest", "pytest_cov", "sitecustomize", "usercustomize"}
YASAK_CAGRILAR = {
    "sys.settrace", "sys.setprofile", "threading.settrace", "threading.setprofile",
    "threading.settrace_all_threads", "threading.setprofile_all_threads",
}
ATLAMA_DEKORATORLERI = {"skip", "skipif", "xfail", "skipIf", "skipUnless", "expectedFailure"}
ATLAMA_CAGRILARI = {"pytest.skip", "pytest.xfail", "pytest.importorskip", "self.skipTest"}
BEKLENEN_HATA = {"raises", "warns", "deprecated_call", "assertRaises", "assertRaisesRegex", "assertWarns", "assertWarnsRegex"}
_FONK = (ast.FunctionDef, ast.AsyncFunctionDef)


@dataclass
class DosyaDenetimi:
    yol: str
    icerik: str  # reddedilen testler çıkarılmış hâli (sözdizimi hatası ya da dosya reddi varsa olduğu gibi)
    sozdizimi_hatasi: str | None = None
    dosya_reddi: str | None = None
    reddedilenler: list[dict] = field(default_factory=list)  # [{"test", "neden"}]
    testler: list[str] = field(default_factory=list)  # kalan testlerin adları ("test_x" ya da "TestSinif::test_x")


def yol_duzelt(yol: str) -> str | None:
    """Ajanın verdiği yolu tests/ altına oturtur; kurala uymuyorsa None."""
    yol = (yol or "").strip().replace("\\", "/")
    while yol.startswith("./"):
        yol = yol[2:]
    if "/" not in yol:
        yol = "tests/" + yol
    return yol if TEST_YOLU.match(yol) else None


def _ad(dugum: ast.AST | None) -> str:
    """Çağrının ya da niteliğin noktalı adı: pytest.mark.skip, self.assertEqual …"""
    if isinstance(dugum, ast.Name):
        return dugum.id
    if isinstance(dugum, ast.Attribute):
        ust = _ad(dugum.value)
        return f"{ust}.{dugum.attr}" if ust else dugum.attr
    if isinstance(dugum, ast.Call):
        return _ad(dugum.func)
    return ""


def test_fonksiyonlari(agac: ast.Module) -> list[tuple[str, ast.AST, ast.ClassDef | None]]:
    """pytest'in toplayacağı testler: modül düzeyindeki test* fonksiyonları ve Test* sınıflarındaki test* metotları."""
    sonuc = []
    for dugum in agac.body:
        if isinstance(dugum, _FONK) and dugum.name.startswith("test"):
            sonuc.append((dugum.name, dugum, None))
        elif isinstance(dugum, ast.ClassDef) and dugum.name.startswith("Test"):
            for alt in dugum.body:
                if isinstance(alt, _FONK) and alt.name.startswith("test"):
                    sonuc.append((f"{dugum.name}::{alt.name}", alt, dugum))
    return sonuc


def test_adlari(icerik: str) -> list[str]:
    try:
        return [ad for ad, _, _ in test_fonksiyonlari(ast.parse(icerik))]
    except SyntaxError:
        return []


def _atlama_var(dugum: ast.AST) -> bool:
    for dekorator in getattr(dugum, "decorator_list", []):
        if _ad(dekorator).split(".")[-1] in ATLAMA_DEKORATORLERI:
            return True
    return any(isinstance(d, ast.Call) and _ad(d.func) in ATLAMA_CAGRILARI for d in ast.walk(dugum))


def _hata_yutuluyor(fonk: ast.AST) -> bool:
    for dugum in ast.walk(fonk):
        if not isinstance(dugum, (ast.Try, getattr(ast, "TryStar", ast.Try))):
            continue
        for yakalayici in dugum.handlers:
            bos = all(
                isinstance(s, (ast.Pass, ast.Continue)) or (isinstance(s, ast.Expr) and isinstance(s.value, ast.Constant))
                for s in yakalayici.body
            )
            genis = yakalayici.type is None or _ad(yakalayici.type) in ("Exception", "BaseException")
            kontrollu = any(
                isinstance(x, (ast.Raise, ast.Assert)) or (isinstance(x, ast.Call) and _ad(x.func) == "pytest.fail")
                for s in yakalayici.body for x in ast.walk(s)
            )
            if bos or (genis and not kontrollu):
                return True
    return False


def _dogrulamalar(fonk: ast.AST, yardimcilar: dict[str, ast.AST]) -> tuple[list[ast.Assert], bool]:
    """(assert ifadeleri, assert dışında bir doğrulama var mı)."""
    assertler, diger = [], False
    for dugum in ast.walk(fonk):
        if isinstance(dugum, ast.Assert):
            assertler.append(dugum)
        elif isinstance(dugum, (ast.With, ast.AsyncWith)):
            if any(isinstance(o.context_expr, ast.Call) and _ad(o.context_expr.func).split(".")[-1] in BEKLENEN_HATA for o in dugum.items):
                diger = True
        elif isinstance(dugum, ast.Call):
            ad = _ad(dugum.func)
            son = ad.split(".")[-1]
            if son.startswith("assert") or son in BEKLENEN_HATA or ad == "pytest.fail":
                diger = True
            elif ad in yardimcilar and yardimcilar[ad] is not fonk:
                # Aynı dosyadaki yardımcı fonksiyon doğrulama yapıyorsa sayılır (bir düzey)
                if any(isinstance(x, ast.Assert) for x in ast.walk(yardimcilar[ad])):
                    diger = True
    return assertler, diger


def _bos_assert_mi(a: ast.Assert) -> bool:
    t = a.test
    if isinstance(t, ast.Constant):
        return bool(t.value)
    if isinstance(t, ast.UnaryOp) and isinstance(t.op, ast.Not) and isinstance(t.operand, ast.Constant):
        return not t.operand.value
    if (isinstance(t, ast.Compare) and len(t.ops) == 1 and isinstance(t.ops[0], (ast.Eq, ast.Is, ast.LtE, ast.GtE))
            and ast.dump(t.left) == ast.dump(t.comparators[0])
            # f(x) == f(x) aynı sonucu verme (belirlenimcilik) testidir, boş değildir; yalnızca çağrısız ifadeler sayılır
            and not any(isinstance(d, (ast.Call, ast.Await)) for d in ast.walk(t.left))):
        return True
    if isinstance(t, ast.BoolOp) and isinstance(t.op, ast.Or):
        return any(isinstance(v, ast.Constant) and v.value for v in t.values)
    return False


def _test_reddi(fonk: ast.AST, sinif: ast.ClassDef | None, yardimcilar: dict[str, ast.AST]) -> str | None:
    if _atlama_var(fonk) or (sinif is not None and any(_ad(d).split(".")[-1] in ATLAMA_DEKORATORLERI for d in sinif.decorator_list)):
        return "skip/xfail işareti var; atlanan test kabul edilmez."
    if _hata_yutuluyor(fonk):
        return "hatayı yutan try/except var; böyle bir test hiçbir durumda kalmaz. Beklenen hata için pytest.raises kullan."
    assertler, diger = _dogrulamalar(fonk, yardimcilar)
    if not assertler and not diger:
        return "doğrulama yok (assert, pytest.raises ya da mock.assert_* kullanılmamış)."
    if assertler and not diger and all(_bos_assert_mi(a) for a in assertler):
        return "yalnızca her zaman doğru olan doğrulama var (ör. assert True, assert x == x)."
    return None


def _dosya_yasaklari(agac: ast.Module) -> str | None:
    for dugum in ast.walk(agac):
        if isinstance(dugum, ast.Import):
            for oge in dugum.names:
                if oge.name.split(".")[0] in YASAK_MODULLER:
                    return f"`{oge.name}` içe aktarılamaz; kapsama ölçümüyle oynamak yasak."
        elif isinstance(dugum, ast.ImportFrom):
            if dugum.module and dugum.module.split(".")[0] in YASAK_MODULLER:
                return f"`{dugum.module}` içe aktarılamaz; kapsama ölçümüyle oynamak yasak."
        elif isinstance(dugum, ast.Call):
            ad = _ad(dugum.func)
            if ad in YASAK_CAGRILAR:
                return f"`{ad}` çağrılamaz; kapsama ölçümüyle oynamak yasak."
            if ad in ("__import__", "importlib.import_module") and dugum.args and isinstance(dugum.args[0], ast.Constant) \
                    and str(dugum.args[0].value).split(".")[0] in YASAK_MODULLER:
                return f"`{dugum.args[0].value}` içe aktarılamaz; kapsama ölçümüyle oynamak yasak."
        elif isinstance(dugum, _FONK) and dugum.name.startswith("pytest_") and dugum.name != "pytest_generate_tests":
            return f"pytest kancası tanımlanamaz (`{dugum.name}`); test sonuçlarını değiştirebilir."
        elif isinstance(dugum, ast.Assign):
            adlar = {h.id for h in dugum.targets if isinstance(h, ast.Name)}
            if "pytest_plugins" in adlar:
                return "pytest_plugins kullanılamaz."
            if "pytestmark" in adlar and any(
                isinstance(x, ast.Attribute) and x.attr in ATLAMA_DEKORATORLERI for x in ast.walk(dugum.value)
            ):
                return "Modül düzeyinde skip/xfail işareti kullanılamaz."
    return None


def dosyayi_denetle(yol: str, icerik: str) -> DosyaDenetimi:
    try:
        agac = ast.parse(icerik, filename=yol)
        compile(agac, yol, "exec")
    except SyntaxError as hata:
        metin = f"satır {hata.lineno}: {hata.msg}" + (f" → {hata.text.strip()}" if hata.text else "")
        return DosyaDenetimi(yol, icerik, sozdizimi_hatasi=metin)
    yasak = _dosya_yasaklari(agac)
    if yasak:
        return DosyaDenetimi(yol, icerik, dosya_reddi=yasak)
    yardimcilar = {d.name: d for d in agac.body if isinstance(d, _FONK) and not d.name.startswith("test")}
    reddedilenler, kalanlar = [], []
    for ad, fonk, sinif in test_fonksiyonlari(agac):
        neden = _test_reddi(fonk, sinif, yardimcilar)
        if neden:
            reddedilenler.append({"test": ad, "neden": neden})
        else:
            kalanlar.append(ad)
    yeni = testleri_cikar(icerik, {r["test"] for r in reddedilenler}) if reddedilenler else icerik
    if yeni is None:  # çıkarma dosyayı bozdu (çok nadir): dosya bütünüyle reddedilir
        return DosyaDenetimi(yol, icerik, dosya_reddi="Reddedilen testler dosyadan ayrılamadı.", reddedilenler=reddedilenler)
    return DosyaDenetimi(yol, yeni, reddedilenler=reddedilenler, testler=kalanlar)


def _test_dugumu(agac: ast.Module, ad: str):
    return next((dugum for test_ad, dugum, _ in test_fonksiyonlari(agac) if test_ad == ad), None)


def _aralik(dugum) -> tuple[int, int]:
    return min([dugum.lineno] + [d.lineno for d in dugum.decorator_list]), dugum.end_lineno


def fonksiyon_kaynagi(icerik: str, ad: str) -> str | None:
    """Bir testin kaynağı (dekoratörleri ve girintisiyle); yoksa None. ad: "test_x" ya da "TestSinif::test_x"."""
    try:
        dugum = _test_dugumu(ast.parse(icerik), ad)
    except SyntaxError:
        return None
    if dugum is None:
        return None
    bas, son = _aralik(dugum)
    return "".join(icerik.splitlines(keepends=True)[bas - 1 : son])


def ayni_test_mi(kod1: str | None, kod2: str | None) -> bool:
    """İki test kaynağı anlamca aynı mı (boşluk ve yorum farkları sayılmaz)."""
    if kod1 is None or kod2 is None:
        return kod1 is kod2
    try:
        return ast.dump(ast.parse(textwrap.dedent(kod1))) == ast.dump(ast.parse(textwrap.dedent(kod2)))
    except SyntaxError:
        return kod1.strip() == kod2.strip()


def fonksiyonu_koy(icerik: str, ad: str, kod: str) -> str | None:
    """Testi verilen kaynakla değiştirir; dosyada yoksa ekler (sınıf metodu sınıfın sonuna). Sonuç derlenemezse None."""
    try:
        agac = ast.parse(icerik)
    except SyntaxError:
        return None
    satirlar = icerik.splitlines(keepends=True)
    if satirlar and not satirlar[-1].endswith("\n"):
        satirlar[-1] += "\n"
    kod_satirlari = kod.splitlines(keepends=True)
    if kod_satirlari and not kod_satirlari[-1].endswith("\n"):
        kod_satirlari[-1] += "\n"
    dugum = _test_dugumu(agac, ad)
    if dugum is not None:
        bas, son = _aralik(dugum)
        satirlar[bas - 1 : son] = kod_satirlari
    elif "::" in ad:
        sinif_adi = ad.split("::")[0]
        sinif = next((d for d in agac.body if isinstance(d, ast.ClassDef) and d.name == sinif_adi), None)
        if sinif is None:
            satirlar += ["\n", "\n", f"class {sinif_adi}:\n"] + kod_satirlari
        else:
            satirlar[sinif.end_lineno:sinif.end_lineno] = ["\n"] + kod_satirlari
    else:
        satirlar += ["\n", "\n"] + kod_satirlari
    yeni = "".join(satirlar)
    try:
        compile(yeni, "<kilitli>", "exec")
    except SyntaxError:
        return None
    return yeni


def testleri_cikar(icerik: str, adlar: set[str]) -> str | None:
    """Adı verilen testleri (dekoratörleriyle) dosyadan çıkarır. Bir sınıfın bütün testleri çıkarsa sınıf da çıkar.

    adlar: "test_x" ya da "TestSinif::test_x". Sonuç derlenemezse None.
    """
    if not adlar:
        return icerik
    agac = ast.parse(icerik)
    satirlar = icerik.splitlines(keepends=True)

    def aralik(dugum) -> tuple[int, int]:
        return min([dugum.lineno] + [d.lineno for d in dugum.decorator_list]), dugum.end_lineno

    silinecek: list[tuple[int, int]] = []
    for dugum in agac.body:
        if isinstance(dugum, _FONK) and dugum.name in adlar:
            silinecek.append(aralik(dugum))
        elif isinstance(dugum, ast.ClassDef):
            testler = [a for a in dugum.body if isinstance(a, _FONK) and a.name.startswith("test")]
            cikan = [a for a in testler if f"{dugum.name}::{a.name}" in adlar]
            if cikan and len(cikan) == len(testler):
                silinecek.append(aralik(dugum))
            else:
                silinecek.extend(aralik(a) for a in cikan)
    for bas, son in sorted(silinecek, reverse=True):
        del satirlar[bas - 1 : son]
    yeni = re.sub(r"\n{4,}", "\n\n\n", "".join(satirlar))
    try:
        compile(yeni, "<ayiklanmis>", "exec")
    except SyntaxError:
        return None
    return yeni
