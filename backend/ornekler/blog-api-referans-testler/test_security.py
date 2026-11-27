import pytest

from app.core.security import hash_password, verify_password


def test_ozet_ayni_sifre_icin_ayni():
    assert hash_password("gizli-sifre") == hash_password("gizli-sifre")


def test_kisa_sifre_ozetlenmez():
    with pytest.raises(ValueError):
        hash_password("kisa")


def test_dogru_sifre_dogrulanir():
    assert verify_password("gizli-sifre", hash_password("gizli-sifre")) is True


def test_yanlis_sifre_reddedilir():
    assert verify_password("baska-sifre", hash_password("gizli-sifre")) is False


def test_kisa_sifre_dogrulamada_false_doner():
    # Bilinen hata 4: belgelenen davranış False, kod ValueError fırlatıyor
    assert verify_password("kisa", hash_password("gizli-sifre")) is False
