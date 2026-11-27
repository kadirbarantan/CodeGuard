from fastapi.testclient import TestClient

from app.main import app

istemci = TestClient(app)


def yazi_olustur(baslik="Merhaba", icerik="İlk yazı"):
    return istemci.post("/posts", json={"baslik": baslik, "icerik": icerik})


def test_yazi_olusturulur():
    yanit = yazi_olustur()
    assert yanit.status_code == 201
    assert yanit.json() == {"id": 1, "baslik": "Merhaba", "icerik": "İlk yazı"}


def test_bos_baslik_reddedilir():
    assert yazi_olustur(baslik="").status_code == 400


def test_bosluktan_olusan_baslik_reddedilir():
    # Bilinen hata 1: belgelenen davranış 400, kod 201 döndürüyor
    assert yazi_olustur(baslik="   ").status_code == 400


def test_cok_uzun_icerik_reddedilir():
    assert yazi_olustur(icerik="a" * 5001).status_code == 413


def test_yazi_okunur():
    yazi_olustur()
    yanit = istemci.get("/posts/1")
    assert yanit.status_code == 200
    assert yanit.json()["baslik"] == "Merhaba"


def test_olmayan_yazi_404():
    assert istemci.get("/posts/99").status_code == 404


def test_yazi_silinir():
    yazi_olustur()
    assert istemci.delete("/posts/1").status_code == 204
    assert istemci.get("/posts/1").status_code == 404


def test_olmayan_yazi_silinemez():
    assert istemci.delete("/posts/99").status_code == 404


def test_silmeden_sonra_kimlikler_benzersiz_kalir():
    # Bilinen hata 2: kimlik len(db) + 1 ile üretildiği için silmeden sonra çakışıyor
    yazi_olustur("Birinci")
    yazi_olustur("İkinci")
    istemci.delete("/posts/1")
    yazi_olustur("Üçüncü")
    kimlikler = [yazi["id"] for yazi in istemci.get("/posts").json()["items"]]
    assert len(kimlikler) == len(set(kimlikler)), f"Aynı kimlik iki kez verildi: {kimlikler}"


def test_yazilar_listelenir():
    for sira in range(3):
        yazi_olustur(f"Yazı {sira}")
    yanit = istemci.get("/posts")
    assert yanit.status_code == 200
    assert len(yanit.json()["items"]) == 3
