from app.core.config import DEFAULT_PAGE_SIZE, get_page_size


def test_degisken_yoksa_varsayilan(monkeypatch):
    monkeypatch.delenv("PAGE_SIZE", raising=False)
    assert get_page_size() == DEFAULT_PAGE_SIZE


def test_gecerli_deger_okunur(monkeypatch):
    monkeypatch.setenv("PAGE_SIZE", "25")
    assert get_page_size() == 25


def test_sayi_olmayan_deger_varsayilana_doner(monkeypatch):
    # Bilinen hata 6: belgelenen davranış varsayılan (10), kod ValueError fırlatıyor
    monkeypatch.setenv("PAGE_SIZE", "abc")
    assert get_page_size() == DEFAULT_PAGE_SIZE
