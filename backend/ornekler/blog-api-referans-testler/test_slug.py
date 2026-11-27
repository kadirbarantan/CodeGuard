from app.utils.slug import slugify


def test_ingilizce_metin():
    assert slugify("Hello World") == "hello-world"


def test_bosluk_ve_isaretler_tek_tireye_doner():
    assert slugify("  Merhaba,   dunya!  ") == "merhaba-dunya"


def test_turkce_harfler_latin_karsiliklarina_doner():
    # Bilinen hata 5: belgelenen davranış "cay-saati", kod Türkçe harfleri siliyor ("ay-saati")
    assert slugify("Çay Saati") == "cay-saati"
