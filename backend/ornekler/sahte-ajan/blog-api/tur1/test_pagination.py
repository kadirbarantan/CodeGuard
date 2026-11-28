import pytest

from app.pagination import has_next, has_prev, paginate

ON_BES = list(range(15))


def test_ilk_sayfa_on_oge_doner():
    assert paginate(ON_BES, 1, 10) == {"items": list(range(10)), "page": 1, "total_pages": 2}


def test_son_sayfa_kalan_ogeleri_doner():
    assert paginate(ON_BES, 2, 10)["items"] == [10, 11, 12, 13, 14]


@pytest.mark.parametrize("sayfa", [0, -3])
def test_birden_kucuk_sayfa_ilk_sayfaya_doner(sayfa):
    assert paginate(ON_BES, sayfa, 10)["page"] == 1


def test_sifir_sayfa_boyutu_hata_verir():
    with pytest.raises(ValueError):
        paginate(ON_BES, 1, 0)


def test_son_sayfadan_buyuk_sayfa_hata_verir():
    with pytest.raises(ValueError):
        paginate(ON_BES, 5, 10)


def test_sonraki_sayfa():
    assert has_next(1, 2) is True
    assert has_next(2, 2) is False
    assert has_next(1, 0) is False


def test_onceki_sayfa():
    assert has_prev(1) is False
    assert has_prev(2) is True
