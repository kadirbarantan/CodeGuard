from app.core.config import DEFAULT_PAGE_SIZE, get_page_size, is_debug


def test_degisken_yoksa_varsayilan_kullanilir(monkeypatch):
    monkeypatch.delenv("PAGE_SIZE", raising=False)
    assert get_page_size() == DEFAULT_PAGE_SIZE


def test_gecerli_deger_okunur(monkeypatch):
    monkeypatch.setenv("PAGE_SIZE", "25")
    assert get_page_size() == 25


def test_sayi_olmayan_deger_varsayilana_doner(monkeypatch):
    monkeypatch.setenv("PAGE_SIZE", "abc")
    assert get_page_size() == DEFAULT_PAGE_SIZE


def test_debug_acik(monkeypatch):
    monkeypatch.setenv("DEBUG", "1")
    assert is_debug() is True


def test_debug_kapali(monkeypatch):
    monkeypatch.delenv("DEBUG", raising=False)
    assert is_debug() is False
