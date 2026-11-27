"""Sandbox'ın güvenlik kurallarını (K5, K6) doğrulayan testler. Hepsinin GEÇMESİ gerekir.

Çalıştırmak için (backend klasöründe, .venv açıkken):

    python araclar/sandbox_dene.py ornekler/blog-api sandbox/python/guvenlik-testleri

Bir test kalırsa o kural kapsayıcıda uygulanmıyor demektir.
"""
import os
import socket
from pathlib import Path

import pytest


def test_dis_aga_baglanilamaz():
    with pytest.raises(OSError):
        socket.create_connection(("1.1.1.1", 443), timeout=3)


def test_alan_adi_cozulemez():
    with pytest.raises(OSError):
        socket.getaddrinfo("pypi.org", 443)


def test_kaynak_kod_salt_okunur():
    with pytest.raises(OSError):
        Path("/kaynak/ajan_yazdi.txt").write_text("hile")


def test_testler_klasoru_salt_okunur():
    with pytest.raises(OSError):
        Path("/testler/yeni_test.py").write_text("x")


def test_bagimliliklar_salt_okunur():
    with pytest.raises(OSError):
        Path("/bagimliliklar/degistir.py").write_text("x")


def test_sistem_dosyalari_salt_okunur():
    with pytest.raises(OSError):
        Path("/opt/codeguard/degistir.txt").write_text("x")


def test_root_kullanicisi_degil():
    assert os.getuid() != 0


def test_gecici_klasore_yazilabilir(tmp_path):
    dosya = tmp_path / "a.txt"
    dosya.write_text("tamam")
    assert dosya.read_text() == "tamam"
