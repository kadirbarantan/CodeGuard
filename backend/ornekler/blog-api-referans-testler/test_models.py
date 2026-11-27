from app.models.post import Post


def test_kisa_icerigin_ozeti_kendisi():
    assert Post(1, "Başlık", "Kısa içerik").ozet() == "Kısa içerik"
