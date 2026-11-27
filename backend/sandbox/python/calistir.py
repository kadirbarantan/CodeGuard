"""CodeGuard Python sandbox'ı: kapsayıcının İÇİNDE çalışan betik (K5).

Bu dosya imaja kopyalanır ve her kapsayıcıda root olmayan kullanıcıyla çalışır.
Backend tarafı (app/motor/sandbox.py) kapsayıcıyı şu klasörlerle başlatır:

    /kaynak         kullanıcının kodu (salt okunur)
    /testler        çalıştırılacak testler (salt okunur)
    /bagimliliklar  projenin bağımlılıkları (kurulumda yazılır, testte salt okunur)
    /cikti          sonuç dosyaları (yazılabilir)

İki kip vardır:

    kurulum   Projenin bağımlılıklarını /bagimliliklar'a kurar. Ağ yalnızca bu aşamada açıktır.
              Yalnızca hazır paketler (wheel) kurulur; paketin kendi kurulum kodu çalıştırılmaz.
    test      /testler'deki testleri /kaynak üzerinde çalıştırır, satır ve dal kapsamasını ölçer.

"test" kipinin /cikti'ya yazdıkları:

    junit.xml     test sonuçları (JUnit XML; jest ve xunit de aynı biçimi üretebilir)
    kapsama.xml   kapsama (Cobertura XML; coverlet ve istanbul da aynı biçimi üretebilir)
    durum.json    adımların çıkış kodları ve süreleri

Biçimlerin diğer dillerin araçlarıyla ortak olması bilinçli: backend'deki Standardizasyon Katmanı
(app/analiz/standart.py) her dil için aynı okuyucuyu kullanır.
"""
import json
import os
import subprocess
import sys
import time
import tomllib
from pathlib import Path

KAYNAK = Path("/kaynak")
TESTLER = Path("/testler")
CIKTI = Path("/cikti")
BAGIMLILIKLAR = Path("/bagimliliklar")

# Tek bir testin en fazla süresi (sn). Kapsayıcının toplam süresi ayrıca backend'de sınırlanır.
TEST_BASINA_SURE_SN = int(os.environ.get("CODEGUARD_TEST_SURE_SN", "10"))

# Kullanıcının kendi test dosyaları kapsamaya katılmaz; ölçülen yalnızca kaynak koddur.
KAPSAMA_DISI = "*/tests/*,*/test/*,*/test_*.py,*_test.py,*/conftest.py,*/setup.py"


def bagimliliklari_bul():
    """Kurulacak paketleri bulur: önce requirements.txt, yoksa pyproject.toml [project].dependencies.

    Döner: (pip argümanları ya da None, açıklama)
    """
    requirements = KAYNAK / "requirements.txt"
    if requirements.is_file():
        return ["-r", str(requirements)], "requirements.txt"
    pyproject = KAYNAK / "pyproject.toml"
    if pyproject.is_file():
        try:
            veri = tomllib.loads(pyproject.read_text(encoding="utf-8"))
        except (tomllib.TOMLDecodeError, UnicodeDecodeError) as hata:
            raise SystemExit(f"pyproject.toml okunamadı: {hata}")
        paketler = veri.get("project", {}).get("dependencies", [])
        if paketler:
            return list(paketler), "pyproject.toml"
        return None, "pyproject.toml'da [project].dependencies yok"
    return None, "bağımlılık dosyası yok"


def kurulum() -> int:
    argumanlar, aciklama = bagimliliklari_bul()
    if argumanlar is None:
        print(f"Kurulum gerekmiyor: {aciklama}.")
        return 0
    print(f"Bağımlılıklar kuruluyor ({aciklama})...", flush=True)
    komut = [
        sys.executable, "-m", "pip", "install",
        "--no-input", "--disable-pip-version-check", "--no-warn-script-location",
        "--only-binary=:all:",          # yalnızca hazır paket: setup.py gibi kurulum kodu çalışmaz
        "--target", str(BAGIMLILIKLAR),
        *argumanlar,
    ]
    return subprocess.run(komut).returncode


def test() -> int:
    durum = {}
    ortam = dict(os.environ, COVERAGE_FILE=str(CIKTI / ".coverage"))
    coverage = [sys.executable, "-m", "coverage"]

    baslangic = time.monotonic()
    pytest_komutu = [
        *coverage, "run", "--branch", f"--source={KAYNAK}", f"--omit={KAPSAMA_DISI}",
        "-m", "pytest", str(TESTLER),
        f"--rootdir={TESTLER}",
        "--continue-on-collection-errors",      # bozuk bir test dosyası diğerlerinin çalışmasını engellemesin
        "-p", "no:cacheprovider",               # salt okunur ortamda önbellek dosyası yazmaya çalışmasın
        f"--junitxml={CIKTI / 'junit.xml'}",
        f"--timeout={TEST_BASINA_SURE_SN}",
        "-q", "--tb=short",
    ]
    durum["pytest_cikis_kodu"] = subprocess.run(pytest_komutu, env=ortam).returncode
    durum["pytest_sure_sn"] = round(time.monotonic() - baslangic, 2)

    if (CIKTI / ".coverage").exists():
        xml = subprocess.run([*coverage, "xml", "-o", str(CIKTI / "kapsama.xml"), "-q"], env=ortam)
        durum["kapsama_cikis_kodu"] = xml.returncode
    else:
        durum["kapsama_cikis_kodu"] = None

    (CIKTI / "durum.json").write_text(json.dumps(durum, ensure_ascii=False, indent=2), encoding="utf-8")
    # Testlerin geçip kalması burada hata sayılmaz; sonucu backend junit.xml'den okur.
    return 0


def main() -> int:
    kip = sys.argv[1] if len(sys.argv) > 1 else ""
    if kip == "kurulum":
        return kurulum()
    if kip == "test":
        return test()
    print("Kullanım: calistir.py kurulum | test", file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main())
