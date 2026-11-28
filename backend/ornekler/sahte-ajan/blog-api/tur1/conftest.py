import pytest

from app import db


@pytest.fixture(autouse=True)
def temiz_depo():
    db.temizle()
    yield
    db.temizle()
