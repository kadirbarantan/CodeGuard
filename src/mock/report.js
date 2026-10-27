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

const paginationKod = `def paginate(items, page, per_page=10):
    if page < 1:
        page = 1
    if per_page <= 0:
        raise ValueError("per_page pozitif olmali")
    start = (page - 1) * per_page
    end = start + per_page
    chunk = items[start:end]
    total_pages = -(-len(items) // per_page)
    return {"items": chunk, "page": page, "total_pages": total_pages}


def has_next(page, total_pages):
    if total_pages == 0:
        return False
    return page < total_pages


def has_prev(page):
    return page > 1
`

const usersKod = `from .db import get_db


def find_user(user_id):
    for u in get_db():
        if u["id"] == user_id:
            return u
    return None


def user_count():
    return len(get_db())
`

const configKod = `import os

DEFAULT_PAGE_SIZE = 10


def get_page_size():
    value = os.getenv("PAGE_SIZE")
    if value is None:
        return DEFAULT_PAGE_SIZE
    return int(value)


def is_debug():
    return os.getenv("DEBUG", "0") == "1"
`

const securityKod = `import hashlib


def hash_password(password):
    if len(password) < 8:
        raise ValueError("Sifre en az 8 karakter olmali")
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(password, hashed):
    return hash_password(password) == hashed
`

const postModelKod = `from dataclasses import dataclass


@dataclass
class Post:
    id: int
    baslik: str
    icerik: str

    def ozet(self, uzunluk=100):
        if len(self.icerik) <= uzunluk:
            return self.icerik
        return self.icerik[:uzunluk] + "..."
`

const slugKod = `import re


def slugify(metin):
    metin = metin.lower().strip()
    metin = re.sub(r"[^a-z0-9]+", "-", metin)
    return metin.strip("-")
`

const frontApiKod = `const BASE = "/api"

export async function getPosts(page = 1) {
  const r = await fetch(BASE + "/posts?page=" + page)
  if (!r.ok) throw new Error("Yazilar alinamadi")
  return r.json()
}
`

const frontMainKod = `import { getPosts } from "./api.js"

async function init() {
  const veri = await getPosts()
  document.querySelector("#liste").textContent = veri.items.length + " yazi"
}

init()
`

const postFormKod = `export function validatePost(baslik, icerik) {
  const hatalar = []
  if (!baslik) hatalar.push("Baslik gerekli")
  if (icerik.length > 5000) hatalar.push("Icerik cok uzun")
  return hatalar
}

export function onSubmit(form, api) {
  const hatalar = validatePost(form.baslik, form.icerik)
  if (hatalar.length) return { ok: false, hatalar }
  api.createPost(form)
  return { ok: true }
}
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
    {
      yol: 'app/pagination.py',
      kod: paginationKod,
      satirlar: {
        kapsanan: [1, 2, 4, 6, 7, 8, 9, 10, 13, 14, 16, 19, 20],
        kapsanmayan: [3, 5, 15],
        motorBagimli: [],
      },
    },
    {
      yol: 'app/users.py',
      kod: usersKod,
      satirlar: {
        kapsanan: [1, 4, 5, 6, 7, 8, 11, 12],
        kapsanmayan: [],
        motorBagimli: [],
      },
    },
    {
      yol: 'app/core/config.py',
      kod: configKod,
      satirlar: { kapsanan: [1, 3, 6, 7, 8, 9, 13, 14], kapsanmayan: [10], motorBagimli: [] },
    },
    {
      yol: 'app/core/security.py',
      kod: securityKod,
      satirlar: { kapsanan: [1, 4, 5, 6, 7, 10, 11], kapsanmayan: [], motorBagimli: [] },
    },
    {
      yol: 'app/models/post.py',
      kod: postModelKod,
      satirlar: { kapsanan: [1, 4, 5, 6, 7, 8, 10, 11, 12], kapsanmayan: [13], motorBagimli: [] },
    },
    {
      yol: 'app/utils/slug.py',
      kod: slugKod,
      satirlar: { kapsanan: [1, 4, 5, 6, 7], kapsanmayan: [], motorBagimli: [] },
    },
    {
      yol: 'frontend/src/api.js',
      kod: frontApiKod,
      satirlar: { kapsanan: [1, 3, 4, 5, 6], kapsanmayan: [], motorBagimli: [] },
    },
    {
      yol: 'frontend/src/main.js',
      kod: frontMainKod,
      satirlar: { kapsanan: [1, 3, 4, 8], kapsanmayan: [], motorBagimli: [5] },
    },
    {
      yol: 'frontend/src/components/PostForm.js',
      kod: postFormKod,
      satirlar: { kapsanan: [1, 2, 3, 4, 5, 8, 9, 10, 11, 12], kapsanmayan: [], motorBagimli: [] },
    },
  ],

  icgoruler: {
    'app/posts.py:12':
      'Ajan 4 turda bu satıra ulaşamadı: 5000 karakterden uzun içerik gönderen bir test, istek boyut sınırına takılıyor. Ayrı bir birim testiyle doğrudan fonksiyon çağrılmalı.',
    'app/posts.py:23':
      'Bu satır yalnızca var olmayan bir yazı istenirse çalışır. Veritabanı sahte verisi her zaman kayıt döndürdüğü için ajan 404 durumunu tetikleyemedi.',
    'app/pagination.py:3':
      'Testlerin hepsi 1 ve üzeri sayfa numarası gönderdi. page=0 ya da negatif bir değerle çağıran bir test bu satırı çalıştırır.',
    'app/pagination.py:5':
      'per_page her testte varsayılan 10 kaldı. per_page=0 ile ValueError beklenen bir test eklenmeli.',
    'app/pagination.py:15':
      'Boş liste ile has_next çağrılmadı. total_pages=0 durumu için ayrı bir test gerekiyor.',
    'app/core/config.py:10':
      'PAGE_SIZE ortam değişkeni hiçbir testte ayarlanmadı, bu yüzden her seferinde varsayılan değer döndü. monkeypatch ile ortam değişkenini ayarlayan bir test bu satırı çalıştırır.',
    'app/models/post.py:13':
      'Testlerdeki içeriklerin hepsi 100 karakterden kısaydı; ozet() uzun bir içerikle hiç çağrılmadı.',
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
      dosya: 'app/posts.py',
      satir: 9,
      gerekce: 'Başlık sadece boşluktan oluşunca beklenen 400 yerine 200 döndü. strip() sonrası kontrol bazı durumlarda atlanıyor gibi görünüyor.',
    },
    {
      tur: 'birim',
      baslik: 'Yazı kimliği çakışabilir',
      konum: 'app/posts.py:14',
      dosya: 'app/posts.py',
      satir: 14,
      gerekce: 'Kimlik len(db) + 1 ile üretiliyor. Bir kayıt silinirse aynı kimlik ikinci kez verilebilir.',
    },
    {
      tur: 'birim',
      baslik: 'Son sayfadan sonrası sessizce boş dönüyor',
      konum: 'app/pagination.py:8',
      dosya: 'app/pagination.py',
      satir: 8,
      gerekce: 'page, total_pages değerinden büyük verildiğinde hata yerine boş liste döndü. İstemci geçersiz sayfayı fark edemiyor.',
    },
    {
      tur: 'birim',
      baslik: 'Kısa şifreyle giriş denemesi hata fırlatıyor',
      konum: 'app/core/security.py:11',
      dosya: 'app/core/security.py',
      satir: 11,
      gerekce: 'verify_password, 8 karakterden kısa bir şifreyle çağrılınca False döndürmek yerine ValueError fırlattı. Giriş ekranında 500 hatasına dönüşebilir.',
    },
    {
      tur: 'birim',
      baslik: 'Türkçe karakterler adres metninden siliniyor',
      konum: 'app/utils/slug.py:6',
      dosya: 'app/utils/slug.py',
      satir: 6,
      gerekce: 'slugify("Çay Saati") sonucu "ay-saati" oldu. Ç, ş, ğ gibi harfler adresten tamamen düşüyor.',
    },
    {
      tur: 'birim',
      baslik: 'Yazı kaydı beklenmeden başarılı dönülüyor',
      konum: 'frontend/src/components/PostForm.js:11',
      dosya: 'frontend/src/components/PostForm.js',
      satir: 11,
      gerekce: 'api.createPost await edilmiyor; istek bitmeden { ok: true } dönüyor. /posts/new sayfasındaki yönlendirme hatasının olası kaynağı bu.',
    },
    {
      tur: 'arayuz',
      baslik: 'Yeni yazı formu kaydedildikten sonra yönlendirmiyor',
      konum: '/posts/new',
      sayfa: '/posts/new',
      akis: 'Yeni yazı oluşturma',
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
