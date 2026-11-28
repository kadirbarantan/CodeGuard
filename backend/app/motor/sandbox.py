"""Sandbox çalıştırıcısı: Doğrulayıcı'nın testleri çalıştırdığı yer (K5, K6, K9; belge 18 adım 7).

Kullanıcının kodu bu makinede hiç çalışmaz. Her çalıştırmada `codeguard-sandbox-python` imajından
geçici bir kapsayıcı açılır, iş bitince silinir. İmajın içindeki betik: sandbox/python/calistir.py.

İki aşama:
1. Kurulum (projenin bağımlılıkları için bir kez): paketler bir Docker hacmine kurulur.
   Ağ yalnızca bu aşamada açıktır ve yalnızca hazır paket (wheel) kurulur.
2. Test (her tur): ağ kapalı; CPU, bellek, süreç sayısı ve süre sınırlı; kök dosya sistemi, kaynak kod
   ve testler salt okunur; root olmayan kullanıcı; Linux yetkileri (capabilities) kapalı.

Sonuç: Standardizasyon Katmanı'nın (app/analiz/standart.py) ürettiği kısa özet ve ham dosyaların yeri.
Birim ajanının Doğrulayıcısı (Faz 4, app/motor/birim) `Oturum` ile kurulumu bir kez yapar, testleri her turda çalıştırır.
"""
from __future__ import annotations

import os
import tempfile
import time
import uuid
from dataclasses import dataclass
from pathlib import Path

import docker
from docker.errors import DockerException, ImageNotFound, NotFound
from docker.types import Mount

from app.analiz.standart import ozetle

IMAJ = "codeguard-sandbox-python:1"
IMAJ_KLASORU = "sandbox/python"
PIP_ONBELLEK_HACMI = "codeguard-pip-onbellek"  # indirilen paketler çalıştırmalar arasında paylaşılır (K5)
KULLANICI = "1000:1000"
GUNLUK_SONU = 4000  # sonuca eklenen günlüğün en fazla karakteri


@dataclass
class Sinirlar:
    """Kapsayıcı sınırları (K5). Varsayılanlar birim testleri içindir."""

    test_sure_sn: int = 60  # test aşamasının tamamı
    kurulum_sure_sn: int = 300  # bağımlılık kurulumu (ilk seferde indirme sürer)
    test_basina_sn: int = 10  # tek bir test (pytest-timeout)
    bellek: str = "512m"
    cpu: float = 1.0
    surec_sayisi: int = 256


class SandboxHatasi(Exception):
    """Testin hiç başlayamadığı durumlar: Docker kapalı, imaj yok, klasör yok."""


def _istemci() -> docker.DockerClient:
    try:
        istemci = docker.from_env()
        istemci.ping()
    except DockerException as hata:
        raise SandboxHatasi("Docker'a bağlanılamadı. Docker Desktop açık mı?") from hata
    return istemci


def _imaj_kontrol(istemci: docker.DockerClient, imaj: str) -> None:
    try:
        istemci.images.get(imaj)
    except ImageNotFound as hata:
        raise SandboxHatasi(
            f"{imaj} imajı yok. backend klasöründe bir kez şunu çalıştır: docker build -t {imaj} {IMAJ_KLASORU}"
        ) from hata


def _bagla(klasor: Path, hedef: str, salt_okunur: bool = True) -> Mount:
    return Mount(target=hedef, source=str(klasor), type="bind", read_only=salt_okunur)


def _hacim(ad: str, hedef: str, salt_okunur: bool = False) -> Mount:
    return Mount(target=hedef, source=ad, type="volume", read_only=salt_okunur)


def _kapsayici_calistir(istemci, imaj, kip, *, mounts, ag, sure_sn, sinirlar, ortam=None) -> dict:
    """Bir kapsayıcıyı K5 kurallarıyla çalıştırır, süre dolarsa durdurur, her durumda siler."""
    kapsayici = istemci.containers.create(
        imaj,
        command=[kip],
        mounts=mounts,
        network_mode=ag,
        environment=ortam or {},
        user=KULLANICI,
        read_only=True,  # kök dosya sistemi salt okunur
        tmpfs={"/tmp": "rw,noexec,nosuid,size=64m"},
        mem_limit=sinirlar.bellek,
        memswap_limit=sinirlar.bellek,  # takas alanı yok
        nano_cpus=int(sinirlar.cpu * 1_000_000_000),
        pids_limit=sinirlar.surec_sayisi,  # sonsuz süreç açma (fork bombası) engellenir
        cap_drop=["ALL"],
        security_opt=["no-new-privileges"],
        labels={"codeguard": "sandbox"},
    )
    baslangic = time.monotonic()
    zaman_asimi = False
    try:
        kapsayici.start()
        # Süreyi yoklayarak bekle: Windows'ta (named pipe) okuma zaman aşımına güvenmemek için
        while True:
            kapsayici.reload()
            if kapsayici.status in ("exited", "dead"):
                break
            if time.monotonic() - baslangic > sure_sn:
                zaman_asimi = True
                try:
                    kapsayici.kill()
                except DockerException:
                    pass  # tam o anda kendiliğinden bitmiş olabilir
                kapsayici.reload()
                break
            time.sleep(0.25)
        durum = kapsayici.attrs.get("State", {})
        gunluk = kapsayici.logs(stdout=True, stderr=True).decode("utf-8", "replace")
        return {
            "cikis_kodu": None if zaman_asimi else durum.get("ExitCode"),
            "zaman_asimi": zaman_asimi,
            "bellek_asimi": bool(durum.get("OOMKilled")),
            "sure_sn": round(time.monotonic() - baslangic, 2),
            "gunluk_sonu": gunluk[-GUNLUK_SONU:],
        }
    finally:
        try:
            kapsayici.remove(force=True)
        except DockerException:
            pass


def bagimlilik_dosyasi_var(kaynak: Path) -> bool:
    return (kaynak / "requirements.txt").is_file() or (kaynak / "pyproject.toml").is_file()


def _cikti_klasoru(cikti: Path | str | None) -> Path:
    # resolve(): Windows'taki kısa yol adlarını (KADIRB~1 gibi) Docker'ın tanıdığı uzun yola çevirir
    klasor = Path(cikti or tempfile.mkdtemp(prefix="codeguard-sandbox-")).resolve()
    klasor.mkdir(parents=True, exist_ok=True)
    os.chmod(klasor, 0o777)  # kapsayıcıdaki 1000 numaralı kullanıcı yazabilsin (Linux'ta gerekli)
    return klasor


class Oturum:
    """Bir çalıştırma boyunca kullanılan sandbox (Faz 4): bağımlılıklar bir kez kurulur, testler her turda yeniden çalışır.

        with Oturum(kaynak) as oturum:
            oturum.kur()                       # kurulum aşaması (bir kez)
            sonuc = oturum.test(test_klasoru)  # test aşaması (her tur)

    Bağımlılıklar çalıştırmaya özel bir Docker hacmindedir; oturum kapanınca hacim silinir.
    """

    def __init__(self, kaynak: Path | str, *, sinirlar: Sinirlar | None = None, imaj: str = IMAJ, kurulum_agi: str = "bridge"):
        self.kaynak = Path(kaynak).resolve()
        if not self.kaynak.is_dir():
            raise SandboxHatasi(f"Kaynak klasörü bulunamadı: {self.kaynak}")
        self.sinirlar = sinirlar or Sinirlar()
        self.imaj = imaj
        self.kurulum_agi = kurulum_agi
        self.istemci = _istemci()
        _imaj_kontrol(self.istemci, imaj)
        self.hacim = f"codeguard-bagimlilik-{uuid.uuid4().hex[:12]}"
        self.kurulum: dict | None = None

    def kur(self) -> dict:
        """Kurulum aşaması: ağ açık, kaynak salt okunur, paketler hacme yazılır. İkinci çağrıda yeniden kurmaz."""
        if self.kurulum is not None:
            return self.kurulum
        if bagimlilik_dosyasi_var(self.kaynak):
            kurulum = _kapsayici_calistir(
                self.istemci, self.imaj, "kurulum",
                mounts=[
                    _bagla(self.kaynak, "/kaynak"),
                    _hacim(self.hacim, "/bagimliliklar"),
                    _hacim(PIP_ONBELLEK_HACMI, "/home/sandbox/.cache/pip"),
                ],
                ag=self.kurulum_agi,
                sure_sn=self.sinirlar.kurulum_sure_sn,
                sinirlar=self.sinirlar,
            )
            kurulum["durum"] = "kuruldu" if kurulum["cikis_kodu"] == 0 else "hata"
        else:
            kurulum = {"durum": "gerek_yok"}
        self.kurulum = kurulum
        return kurulum

    def test(self, testler: Path | str, cikti: Path | str | None = None) -> dict:
        """Test aşaması (bir kez): ağ kapalı, her şey salt okunur, yalnızca /cikti ve /tmp yazılabilir.

        Dönen: {"durum", "cikti_klasoru", "test", "ozet"}. "durum": tamam | kurulum_hatasi | zaman_asimi |
        bellek_asimi | calisma_hatasi. "tamam", testlerin çalıştığı anlamına gelir; geçip kalmaları "ozet.testler"dedir.
        """
        testler = Path(testler).resolve()
        if not testler.is_dir():
            raise SandboxHatasi(f"Test klasörü bulunamadı: {testler}")
        cikti = _cikti_klasoru(cikti)
        sonuc = {"durum": None, "cikti_klasoru": str(cikti), "test": None, "ozet": None}
        if self.kur()["durum"] == "hata":
            # K5: kurulum hatası denemeden düşmez; süreç durur ve kurulum hatası raporlanır
            sonuc["durum"] = "kurulum_hatasi"
            return sonuc
        test = _kapsayici_calistir(
            self.istemci, self.imaj, "test",
            mounts=[
                _bagla(self.kaynak, "/kaynak"),
                _bagla(testler, "/testler"),
                _bagla(cikti, "/cikti", salt_okunur=False),
                _hacim(self.hacim, "/bagimliliklar", salt_okunur=True),
            ],
            ag="none",
            sure_sn=self.sinirlar.test_sure_sn,
            sinirlar=self.sinirlar,
            ortam={
                "PYTHONPATH": "/kaynak:/bagimliliklar",
                "CODEGUARD_TEST_SURE_SN": str(self.sinirlar.test_basina_sn),
                "HOME": "/tmp",  # bazı kütüphaneler ev klasörüne yazmak ister; kök salt okunur
            },
        )
        sonuc["test"] = test
        sonuc["ozet"] = ozetle(cikti)
        if test["zaman_asimi"]:
            sonuc["durum"] = "zaman_asimi"
        elif test["bellek_asimi"]:
            sonuc["durum"] = "bellek_asimi"
        elif test["cikis_kodu"] != 0 or sonuc["ozet"]["testler"] is None:
            sonuc["durum"] = "calisma_hatasi"
        else:
            sonuc["durum"] = "tamam"
        return sonuc

    def kapat(self) -> None:
        try:
            self.istemci.volumes.get(self.hacim).remove(force=True)
        except (NotFound, DockerException):
            pass

    def __enter__(self) -> "Oturum":
        return self

    def __exit__(self, *_hata) -> None:
        self.kapat()


def calistir(
    kaynak: Path | str,
    testler: Path | str,
    cikti: Path | str | None = None,
    *,
    sinirlar: Sinirlar | None = None,
    imaj: str = IMAJ,
    kurulum_agi: str = "bridge",
) -> dict:
    """Projenin bağımlılıklarını kurar, testleri sandbox'ta bir kez çalıştırır ve özetini döndürür.

    kaynak    kullanıcının kodu (ör. YUKLEME_KLASORU/<run_id>/kaynak)
    testler   çalıştırılacak testlerin klasörü
    cikti     ham sonuç dosyalarının yazılacağı klasör; verilmezse geçici bir klasör

    Dönen "durum": tamam | kurulum_hatasi | zaman_asimi | bellek_asimi | calisma_hatasi.
    Ajan her turda yeniden kurulum yapmamak için `Oturum`'u kullanır.
    """
    if not Path(testler).resolve().is_dir():
        raise SandboxHatasi(f"Test klasörü bulunamadı: {Path(testler).resolve()}")
    with Oturum(kaynak, sinirlar=sinirlar, imaj=imaj, kurulum_agi=kurulum_agi) as oturum:
        cikti = _cikti_klasoru(cikti)
        sonuc = {"durum": None, "cikti_klasoru": str(cikti), "kurulum": oturum.kur(), "test": None, "ozet": None}
        sonuc.update(oturum.test(testler, cikti))
        return sonuc
