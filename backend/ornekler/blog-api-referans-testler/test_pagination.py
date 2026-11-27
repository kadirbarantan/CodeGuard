import pytest

from app.pagination import has_next, has_prev, paginate

ON_BES = list(range(15))


def test_ilk_sayfa():
    sonuc = paginate(ON_BES, 1, 10)
    assert sonuc == {"items": list(range(10)), "page": 1, "total_pages": 2}


def test_son_sayfa_eksik_dolu():
    assert paginate(ON_BES, 2, 10)["items"] == [10, 11, 12, 13, 14]


def test_sifir_ve_negatif_sayfa_ilk_sayfaya_doner():
    assert paginate(ON_BES, 0, 10)["page"] == 1
    assert paginate(ON_BES, -3, 10)["page"] == 1


def test_sayfa_boyutu_pozitif_olmali():
    with pytest.raises(ValueError):
        paginate(ON_BES, 1, 0)


def test_son_sayfadan_sonrasi_hata_verir():
    # Bilinen hata 3: belgelenen davranış ValueError, kod sessizce boş liste döndürüyor
    with pytest.raises(ValueError):
        paginate(ON_BES, 5, 10)


def test_sonraki_ve_onceki_sayfa():
    assert has_next(1, 2) is True
    assert has_next(2, 2) is False
    assert has_next(1, 0) is False
    assert has_prev(1) is False
    assert has_prev(2) is True
