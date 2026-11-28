from app.core.config import DEFAULT_PAGE_SIZE, get_page_size


def test_degisken_yoksa_varsayilan_kullanilir(monkeypatch):
    monkeypatch.delenv("PAGE_SIZE", raising=False)
    assert get_page_size() == DEFAULT_PAGE_SIZE


def test_gecerli_deger_okunur(monkeypatch):
    monkeypatch.setenv("PAGE_SIZE", "25")
    assert get_page_size() == 25
