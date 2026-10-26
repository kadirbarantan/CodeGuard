// Örnek "blog-api" raporu (Faz 2'de backend aynı biçimi döndürecek).
const postsKod = `from fastapi import APIRouter, HTTPException
from .db import get_db

router = APIRouter()


@router.post("/posts")
def create_post(baslik: str, icerik: str):
    if not baslik.strip():
        raise HTTPException(400, "Başlık boş olamaz")
    if len(icerik) > 5000:
        raise HTTPException(413, "İçerik çok uzun")
    db = get_db()
    post = {"id": len(db) + 1, "baslik": baslik, "icerik": icerik}
    db.append(post)
    return post


@router.get("/posts/{post_id}")
def get_post(post_id: int):
    post = next((p for p in get_db() if p["id"] == post_id), None)
    if post is None:
        raise HTTPException(404, "Yazı bulunamadı")
    return post
`

export const report = {
  runId: 'run-1',
  proje: 'blog-api',
  alan: 'web',
  dil: 'python',
  tur: 'ikisi',
  tarih: '26.10.2026',
  turSayisi: 4,
  coverage: { testEdilebilir: 94, toplam: 89 },
  etkilesim: { kapsanan: 22, toplam: 24 },
  testSayisi: { birim: 52, arayuz: 6 },
  kaliteSkoru: null, // mutasyon testi bitince getQualityScore ile gelir

  dosyalar: [
    {
      yol: 'app/posts.py',
      kod: postsKod,
      satirlar: {
        kapsanan: [1, 2, 4, 7, 8, 9, 10, 13, 14, 15, 16, 19, 20, 21, 22, 24],
        kapsanmayan: [12, 23],
        motorBagimli: [],
      },
    },
  ],

  icgoruler: {
    'app/posts.py:12':
      'Ajan 4 turda bu satıra ulaşamadı: 5000 karakterden uzun içerik gönderen bir test, istek boyut sınırına takılıyor. Ayrı bir birim testiyle doğrudan fonksiyon çağrılmalı.',
    'app/posts.py:23':
      'Bu satır yalnızca var olmayan bir yazı istenirse çalışır. Veritabanı sahte verisi her zaman kayıt döndürdüğü için ajan 404 durumunu tetikleyemedi.',
  },

  akislar: [
    { ad: 'Kayıt olma', sayfa: '/register', gecti: true },
    { ad: 'Giriş yapma', sayfa: '/login', gecti: true },
    { ad: 'Yazı listesini görüntüleme', sayfa: '/posts', gecti: true },
    { ad: 'Yeni yazı oluşturma', sayfa: '/posts/new', gecti: false },
    { ad: 'Yazı detayını açma', sayfa: '/posts/:id', gecti: true },
    { ad: 'Ana sayfadan yazıya gitme', sayfa: '/', gecti: true },
  ],

  sayfalar: [
    { yol: '/', kapsanan: 5, toplam: 5, eksik: [] },
    { yol: '/register', kapsanan: 4, toplam: 4, eksik: [] },
    { yol: '/login', kapsanan: 3, toplam: 3, eksik: [] },
    { yol: '/posts', kapsanan: 4, toplam: 4, eksik: [] },
    { yol: '/posts/new', kapsanan: 5, toplam: 6, eksik: ['"Taslak kaydet" butonu'] },
    { yol: '/posts/:id', kapsanan: 1, toplam: 2, eksik: ['"Yazıyı sil" butonu'] },
  ],

  olasiHatalar: [
    {
      tur: 'birim',
      baslik: 'Boşluktan oluşan başlık kabul ediliyor mu?',
      konum: 'app/posts.py:9',
      gerekce: 'Başlık sadece boşluktan oluşunca beklenen 400 yerine 200 döndü. strip() sonrası kontrol bazı durumlarda atlanıyor gibi görünüyor.',
    },
    {
      tur: 'birim',
      baslik: 'Yazı kimliği çakışabilir',
      konum: 'app/posts.py:14',
      gerekce: 'Kimlik len(db) + 1 ile üretiliyor. Bir kayıt silinirse aynı kimlik ikinci kez verilebilir.',
    },
    {
      tur: 'arayuz',
      baslik: 'Yeni yazı formu kaydedildikten sonra yönlendirmiyor',
      konum: '/posts/new',
      gerekce: '"Yayınla" butonuna basıldıktan sonra sayfa 5 saniye içinde yazı listesine geçmedi. Kullanıcı yazının kaydedildiğini anlamıyor.',
    },
  ],

  testDosyalari: [
    {
      yol: 'tests/unit/test_posts.py',
      tur: 'birim',
      sayi: 18,
      sonuc: '17 geçti · 1 olası hata',
      kod: `from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_create_post_basarili():
    r = client.post("/posts", params={"baslik": "Merhaba", "icerik": "Ilk yazi"})
    assert r.status_code == 200
    assert r.json()["baslik"] == "Merhaba"


def test_create_post_bos_baslik():
    r = client.post("/posts", params={"baslik": "   ", "icerik": "x"})
    assert r.status_code == 400
`,
    },
    {
      yol: 'tests/unit/test_db.py',
      tur: 'birim',
      sayi: 14,
      sonuc: '14 geçti',
      kod: `from app.db import get_db


def test_db_baslangicta_bos():
    assert get_db() == []


def test_db_ayni_nesneyi_dondurur():
    assert get_db() is get_db()
`,
    },
    {
      yol: 'tests/unit/test_validation.py',
      tur: 'birim',
      sayi: 20,
      sonuc: '19 geçti · 1 olası hata',
      kod: `import pytest
from fastapi import HTTPException
from app.posts import create_post


def test_uzun_icerik_reddedilir():
    with pytest.raises(HTTPException) as e:
        create_post("Baslik", "a" * 5001)
    assert e.value.status_code == 413
`,
    },
    {
      yol: 'tests/ui/test_register.py',
      tur: 'arayuz',
      sayi: 3,
      sonuc: '3 geçti',
      kod: `def test_kayit_formu(page):
    page.goto("/register")
    page.fill("#ad", "Ayse Yilmaz")
    page.fill("#eposta", "ayse@ornek.com")
    page.fill("#sifre", "gizli1234")
    page.click("text=Hesap Oluştur")
    assert page.url.endswith("/posts")
`,
    },
    {
      yol: 'tests/ui/test_posts_flow.py',
      tur: 'arayuz',
      sayi: 3,
      sonuc: '2 geçti · 1 olası hata',
      kod: `def test_yeni_yazi_olustur(page):
    page.goto("/posts/new")
    page.fill("#baslik", "Test yazisi")
    page.fill("#icerik", "Icerik burada")
    page.click("text=Yayınla")
    page.wait_for_url("**/posts", timeout=5000)
`,
    },
  ],
}
