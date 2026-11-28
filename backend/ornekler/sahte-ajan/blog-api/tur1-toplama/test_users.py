import pytest

from app.users import create_user, find_user, find_user_by_email, user_count


def test_kullanici_eklenir_ve_sifre_ozetlenir():
    kullanici = create_user(" Ali@Ornek.com ", "gizli-sifre")
    assert kullanici["eposta"] == "ali@ornek.com"
    assert kullanici["sifre"] != "gizli-sifre"
    assert user_count() == 1


def test_ayni_eposta_ikinci_kez_eklenemez():
    create_user("ali@ornek.com", "gizli-sifre")
    with pytest.raises(ValueError):
        create_user("ALI@ornek.com", "baska-sifre")


def test_kullanici_kimlik_ve_epostayla_bulunur():
    kullanici = create_user("ali@ornek.com", "gizli-sifre")
    assert find_user(kullanici["id"]) == kullanici
    assert find_user_by_email("ALI@ornek.com") == kullanici


def test_olmayan_kullanici_bulunamaz():
    assert find_user(99) is None
    assert find_user_by_email("yok@ornek.com") is None
