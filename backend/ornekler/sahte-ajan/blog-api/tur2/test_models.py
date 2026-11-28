from app.models.post import Post


def test_kisa_icerigin_ozeti_kendisidir():
    assert Post(1, "Başlık", "Kısa içerik").ozet() == "Kısa içerik"


def test_uzun_icerik_kisaltilir():
    assert Post(1, "Başlık", "x" * 150).ozet(100) == "x" * 100 + "..."
