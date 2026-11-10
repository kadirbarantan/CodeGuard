// Kod Yorumu (mock): Kod Haritası'ndan (K4) çıkan birimler ve her biri için yorum.
// Faz 2'de backend aynı biçimi gönderecek:
//   - Deterministik kısım (tree-sitter): birim, tür, imza, satır aralığı, dallar, hata yolları, bağımlılıklar.
//   - LLM kısmı: dosya ve birim açıklaması, risk gerekçesi, proje özeti.
//   - Risk: dal + hata yolu + dış bağımlılık sayısından hesaplanır; LLM'in fark ettiği bir sorun (güvenlik, veri kaybı) riski yükseltebilir.
// Kapsama (birim başına) rapordaki satır kapsamasından hesaplanır (bkz. birimKapsamasi).
// Yalnızca seçilen dilin dosyaları yorumlanır (K5); diğerleri "digerDil" listesinde.

export const kodYorumu = {
  ozet:
    'blog-api, FastAPI ile yazılmış küçük bir blog servisi. Yazılar bellekteki bir listede tutuluyor (app/db.py); posts.py oluşturma ve okuma uçlarını, pagination.py sayfalamayı, core/ klasörü ayar ve şifre işlemlerini içeriyor. Kalıcı veritabanı ve kimlik doğrulama ucu yok.',
  testSirasi: 'Planlayıcı ajan önce yüksek riskli birimlerden başladı: hash_password, create_post, get_page_size.',
  digerDil: [
    { yol: 'frontend/src/api.js', neden: 'JavaScript; seçilen dil Python olduğu için birim analizine girmedi, arayüz testinde kullanıldı.' },
    { yol: 'frontend/src/main.js', neden: 'JavaScript; arayüz testinde kullanıldı.' },
    { yol: 'frontend/src/components/PostForm.js', neden: 'JavaScript; arayüz testinde kullanıldı.' },
  ],
  dosyalar: [
    {
      yol: 'app/posts.py',
      ozet: 'Yazı oluşturma (POST /posts) ve tek yazıyı getirme (GET /posts/{id}) uçları. Girdi doğrulaması burada yapılıyor.',
      birimler: [
        {
          ad: 'create_post',
          tur: 'fonksiyon',
          imza: 'create_post(baslik: str, icerik: str)',
          satir: [7, 16],
          aciklama: 'Başlığı ve içeriği doğrular, yeni yazıya sıradaki kimliği verip listeye ekler.',
          dallar: 2,
          hataYollari: ['400 boş başlık', '413 uzun içerik'],
          bagimliliklar: ['get_db'],
          risk: 'yuksek',
          riskNedeni: 'Kimlik len(db) + 1 ile veriliyor: bir yazı silinirse yeni yazı var olan bir kimlikle çakışır. Ayrıca 413 dalı yalnızca 5000 karakterden uzun içerikle çalışıyor.',
          testSayisi: 9,
        },
        {
          ad: 'get_post',
          tur: 'fonksiyon',
          imza: 'get_post(post_id: int)',
          satir: [19, 24],
          aciklama: 'Kimliğe göre yazıyı arar; bulamazsa 404 döner.',
          dallar: 1,
          hataYollari: ['404 yazı yok'],
          bagimliliklar: ['get_db'],
          risk: 'orta',
          riskNedeni: 'Liste her istekte baştan sona taranıyor; yazı sayısı artınca yavaşlar.',
          testSayisi: 5,
        },
      ],
    },
    {
      yol: 'app/pagination.py',
      ozet: 'Liste için sayfalama yardımcıları; saf fonksiyonlar, dış bağımlılık yok.',
      birimler: [
        {
          ad: 'paginate',
          tur: 'fonksiyon',
          imza: 'paginate(items, page, per_page=10)',
          satir: [1, 10],
          aciklama: 'İstenen sayfanın öğelerini ve toplam sayfa sayısını döner; geçersiz sayfa numarasını 1\'e çeker.',
          dallar: 2,
          hataYollari: ['ValueError per_page ≤ 0'],
          bagimliliklar: [],
          risk: 'orta',
          riskNedeni: 'Sayfa numarası toplam sayfadan büyükse boş liste dönüyor ama hata vermiyor; arayan taraf bunu ayırt edemez.',
          testSayisi: 8,
        },
        {
          ad: 'has_next',
          tur: 'fonksiyon',
          imza: 'has_next(page, total_pages)',
          satir: [13, 16],
          aciklama: 'Sonraki sayfa olup olmadığını söyler; hiç sayfa yoksa False.',
          dallar: 1,
          hataYollari: [],
          bagimliliklar: [],
          risk: 'dusuk',
          testSayisi: 3,
        },
        {
          ad: 'has_prev',
          tur: 'fonksiyon',
          imza: 'has_prev(page)',
          satir: [19, 20],
          aciklama: 'Önceki sayfa olup olmadığını söyler.',
          dallar: 0,
          hataYollari: [],
          bagimliliklar: [],
          risk: 'dusuk',
          testSayisi: 2,
        },
      ],
    },
    {
      yol: 'app/users.py',
      ozet: 'Kullanıcı arama ve sayma yardımcıları.',
      birimler: [
        {
          ad: 'find_user',
          tur: 'fonksiyon',
          imza: 'find_user(user_id)',
          satir: [4, 8],
          aciklama: 'Kimliğe göre kullanıcıyı döner; yoksa None.',
          dallar: 1,
          hataYollari: [],
          bagimliliklar: ['get_db'],
          risk: 'dusuk',
          testSayisi: 4,
        },
        {
          ad: 'user_count',
          tur: 'fonksiyon',
          imza: 'user_count()',
          satir: [11, 12],
          aciklama: 'Kayıtlı kullanıcı sayısını döner.',
          dallar: 0,
          hataYollari: [],
          bagimliliklar: ['get_db'],
          risk: 'dusuk',
          testSayisi: 1,
        },
      ],
    },
    {
      yol: 'app/core/config.py',
      ozet: 'Ortam değişkenlerinden ayar okur.',
      birimler: [
        {
          ad: 'get_page_size',
          tur: 'fonksiyon',
          imza: 'get_page_size()',
          satir: [6, 10],
          aciklama: 'PAGE_SIZE ortam değişkenini okur; tanımlı değilse varsayılan 10 değerini döner.',
          dallar: 1,
          hataYollari: ['ValueError (sayı olmayan değer)'],
          bagimliliklar: ['os.getenv'],
          risk: 'yuksek',
          riskNedeni: 'PAGE_SIZE="abc" gibi sayı olmayan bir değer int() içinde yakalanmayan bir hataya yol açar ve uygulama açılışta çöker.',
          testSayisi: 3,
        },
        {
          ad: 'is_debug',
          tur: 'fonksiyon',
          imza: 'is_debug()',
          satir: [13, 14],
          aciklama: 'DEBUG ortam değişkeni "1" ise True döner.',
          dallar: 0,
          hataYollari: [],
          bagimliliklar: ['os.getenv'],
          risk: 'dusuk',
          testSayisi: 2,
        },
      ],
    },
    {
      yol: 'app/core/security.py',
      ozet: 'Şifre özetleme ve doğrulama.',
      birimler: [
        {
          ad: 'hash_password',
          tur: 'fonksiyon',
          imza: 'hash_password(password)',
          satir: [4, 7],
          aciklama: 'En az 8 karakterlik şifreyi SHA-256 ile özetler.',
          dallar: 1,
          hataYollari: ['ValueError kısa şifre'],
          bagimliliklar: ['hashlib'],
          risk: 'yuksek',
          riskNedeni: 'Şifre tuzsuz SHA-256 ile özetleniyor; aynı şifreler aynı özete sahip olur ve hazır tablolarla kırılabilir. bcrypt ya da argon2 gibi yavaş, tuzlu bir yöntem kullanılmalı. (Testler bunu düzeltmez; güvenlik önerisidir.)',
          testSayisi: 4,
        },
        {
          ad: 'verify_password',
          tur: 'fonksiyon',
          imza: 'verify_password(password, hashed)',
          satir: [10, 11],
          aciklama: 'Girilen şifrenin özetini kayıtlı özetle karşılaştırır.',
          dallar: 0,
          hataYollari: [],
          bagimliliklar: ['hash_password'],
          risk: 'orta',
          riskNedeni: 'Karşılaştırma == ile yapılıyor; sabit süreli karşılaştırma (hmac.compare_digest) daha güvenli.',
          testSayisi: 2,
        },
      ],
    },
    {
      yol: 'app/models/post.py',
      ozet: 'Yazı veri modeli.',
      birimler: [
        {
          ad: 'Post',
          tur: 'sınıf',
          imza: 'class Post (dataclass)',
          satir: [4, 13],
          aciklama: 'Kimlik, başlık ve içerikten oluşan yazı modeli.',
          dallar: 0,
          hataYollari: [],
          bagimliliklar: [],
          risk: 'dusuk',
          testSayisi: 1,
        },
        {
          ad: 'Post.ozet',
          tur: 'metot',
          imza: 'ozet(self, uzunluk=100)',
          satir: [10, 13],
          aciklama: 'İçerik uzunsa ilk 100 karakteri ve "..." döner.',
          dallar: 1,
          hataYollari: [],
          bagimliliklar: [],
          risk: 'dusuk',
          testSayisi: 2,
        },
      ],
    },
    {
      yol: 'app/utils/slug.py',
      ozet: 'Başlıktan adres dostu kısa ad (slug) üretir.',
      birimler: [
        {
          ad: 'slugify',
          tur: 'fonksiyon',
          imza: 'slugify(metin)',
          satir: [4, 7],
          aciklama: 'Metni küçük harfe çevirir, harf ve rakam dışındakileri tireyle değiştirir.',
          dallar: 0,
          hataYollari: [],
          bagimliliklar: ['re'],
          risk: 'orta',
          riskNedeni: 'Türkçe karakterler siliniyor: "Çiçek Bahçesi" → "i-ek-bah-esi". ç, ğ, ı, ö, ş, ü önce Latin karşılıklarına çevrilmeli.',
          testSayisi: 4,
        },
      ],
    },
  ],
}

// Birimin satır aralığındaki ölçülebilir satırlardan kapsama yüzdesi (rapordaki satır kapsamasıyla tutarlı)
export function birimKapsamasi(birim, dosya) {
  if (!dosya?.satirlar) return null
  const [bas, son] = birim.satir
  const icinde = (s) => s >= bas && s <= son
  const kapsanan = dosya.satirlar.kapsanan.filter(icinde).length
  const kapsanmayan = dosya.satirlar.kapsanmayan.filter(icinde).length
  const toplam = kapsanan + kapsanmayan
  return toplam ? Math.round((kapsanan / toplam) * 100) : null
}
