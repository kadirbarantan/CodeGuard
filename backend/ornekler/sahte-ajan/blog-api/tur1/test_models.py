from app.models.post import Post


def test_kisa_icerigin_ozeti_kendisidir():
    assert Post(1, "Başlık", "Kısa içerik").ozet() == "Kısa içerik"


def test_ozet_her_zaman_calisir():
    Post(1, "Başlık", "x" * 500).ozet()
    assert True
