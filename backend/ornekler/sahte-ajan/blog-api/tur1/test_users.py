import pytest

from app.users import create_user, delete_user, find_user


def test_kullanici_eklenir():
    kullanici = create_user(" Ali@Ornek.com ", "gizli-sifre")
    assert kullanici["eposta"] == "ali@ornek.com"
    assert kullanici["sifre"] != "gizli-sifre"


def test_ayni_eposta_ikinci_kez_eklenemez():
    create_user("ali@ornek.com", "gizli-sifre")
    with pytest.raises(ValueError):
        create_user("ALI@ornek.com", "baska-sifre")


def test_kullanici_bulunur():
    kullanici = create_user("ali@ornek.com", "gizli-sifre")
    assert find_user(kullanici["id"]) == kullanici
