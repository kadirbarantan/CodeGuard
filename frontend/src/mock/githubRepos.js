// Mock GitHub verisi: kullanıcının CodeGuard'a erişim verdiği repolar.
// Faz 2'de backend aynı biçimi GitHub API'den üretecek:
//   repo listesi  → GET /user/installations/{id}/repositories
//   dallar        → GET /repos/{sahip}/{repo}/branches
//   ağaç          → GET /repos/{sahip}/{repo}/git/trees/{sha}?recursive=1  (içerik indirilmez)
//   importlar     → Bağlam Çözümleyici (tree-sitter), arşiv indirildikten sonra backend'de
//
// agac: [{ yol, boyut (bayt) }]  ·  importlar: { dosya: [repodaki import ettiği dosyalar] }

const KB = 1024

export const githubRepolari = [
  {
    ad: 'codeguard-demo/blog-api',
    gizli: false,
    dil: 'python',
    dallar: [
      { ad: 'main', commit: 'a3f9c2e' },
      { ad: 'gelistirme', commit: '7b21d04' },
    ],
    agac: [
      { yol: 'README.md', boyut: 3 * KB },
      { yol: 'requirements.txt', boyut: 1 * KB },
      { yol: 'pytest.ini', boyut: 1 * KB },
      { yol: 'app/__init__.py', boyut: 1 * KB },
      { yol: 'app/main.py', boyut: 4 * KB },
      { yol: 'app/db.py', boyut: 3 * KB },
      { yol: 'app/models.py', boyut: 6 * KB },
      { yol: 'app/api/__init__.py', boyut: 1 * KB },
      { yol: 'app/api/posts.py', boyut: 8 * KB },
      { yol: 'app/api/users.py', boyut: 7 * KB },
      { yol: 'app/services/__init__.py', boyut: 1 * KB },
      { yol: 'app/services/odeme.py', boyut: 5 * KB },
      { yol: 'app/services/yardimci.py', boyut: 2 * KB },
      { yol: 'app/templates/index.html', boyut: 6 * KB },
      { yol: 'app/static/style.css', boyut: 9 * KB },
      { yol: 'tests/test_posts.py', boyut: 4 * KB },
      { yol: 'venv/lib/site.py', boyut: 40 * KB },
      { yol: '.git/config', boyut: 1 * KB },
    ],
    importlar: {
      'app/main.py': ['app/api/posts.py', 'app/api/users.py', 'app/db.py'],
      'app/api/posts.py': ['app/models.py', 'app/db.py'],
      'app/api/users.py': ['app/models.py', 'app/services/odeme.py'],
      'app/services/odeme.py': ['app/models.py', 'app/services/yardimci.py'],
      'app/models.py': ['app/db.py'],
    },
  },
  {
    ad: 'codeguard-demo/todo-app',
    gizli: true,
    dil: 'js',
    dallar: [{ ad: 'main', commit: 'c94e1aa' }],
    agac: [
      { yol: 'package.json', boyut: 1 * KB },
      { yol: 'package-lock.json', boyut: 92 * KB },
      { yol: 'vite.config.js', boyut: 1 * KB },
      { yol: 'index.html', boyut: 1 * KB },
      { yol: 'src/main.jsx', boyut: 1 * KB },
      { yol: 'src/App.jsx', boyut: 5 * KB },
      { yol: 'src/api/todos.js', boyut: 3 * KB },
      { yol: 'src/hooks/useTodos.js', boyut: 3 * KB },
      { yol: 'src/utils/tarih.js', boyut: 2 * KB },
      { yol: 'src/utils/filtre.js', boyut: 2 * KB },
      { yol: 'src/components/TodoList.jsx', boyut: 4 * KB },
      { yol: 'src/components/TodoItem.jsx', boyut: 3 * KB },
      { yol: 'node_modules/react/index.js', boyut: 300 * KB },
    ],
    importlar: {
      'src/main.jsx': ['src/App.jsx'],
      'src/App.jsx': ['src/components/TodoList.jsx', 'src/hooks/useTodos.js'],
      'src/hooks/useTodos.js': ['src/api/todos.js', 'src/utils/filtre.js'],
      'src/components/TodoList.jsx': ['src/components/TodoItem.jsx'],
      'src/components/TodoItem.jsx': ['src/utils/tarih.js'],
    },
  },
  {
    ad: 'codeguard-demo/envanter-sistemi',
    gizli: true,
    dil: 'csharp',
    dallar: [{ ad: 'main', commit: 'e01b7f3' }],
    agac: [
      { yol: 'Envanter.sln', boyut: 2 * KB },
      { yol: 'Envanter.Core/Envanter.Core.csproj', boyut: 1 * KB },
      { yol: 'Envanter.Core/Urun.cs', boyut: 3 * KB },
      { yol: 'Envanter.Core/StokServisi.cs', boyut: 7 * KB },
      { yol: 'Envanter.Core/FiyatHesaplayici.cs', boyut: 4 * KB },
      { yol: 'Envanter.Web/Envanter.Web.csproj', boyut: 1 * KB },
      { yol: 'Envanter.Web/Program.cs', boyut: 2 * KB },
      { yol: 'Envanter.Web/Controllers/UrunController.cs', boyut: 6 * KB },
      { yol: 'Envanter.Web/Views/Urun/Index.cshtml', boyut: 5 * KB },
      { yol: 'Envanter.Web/bin/Debug/Envanter.Web.dll', boyut: 120 * KB },
    ],
    // C#: dosya düzeyinde import yok; proje (.csproj) bütün olarak derlenir
    projeReferanslari: { 'Envanter.Web': ['Envanter.Core'] },
    importlar: {},
  },
  {
    ad: 'codeguard-demo/veri-analizi',
    gizli: false,
    dil: 'python',
    dallar: [{ ad: 'main', commit: '5d8a210' }],
    agac: [
      { yol: 'requirements.txt', boyut: 1 * KB },
      { yol: 'analiz/__init__.py', boyut: 1 * KB },
      { yol: 'analiz/temizle.py', boyut: 6 * KB },
      { yol: 'analiz/istatistik.py', boyut: 5 * KB },
      { yol: 'analiz/grafik.py', boyut: 4 * KB },
      { yol: 'veri/satislar-2025.csv', boyut: 4.6 * 1024 * KB },
      { yol: 'veri/musteriler.csv', boyut: 1.2 * 1024 * KB },
    ],
    importlar: {
      'analiz/istatistik.py': ['analiz/temizle.py'],
      'analiz/grafik.py': ['analiz/istatistik.py'],
    },
  },
]
