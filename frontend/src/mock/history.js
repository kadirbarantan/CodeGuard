// Geçmiş testler (mock). durum: 'tamamlandi' | 'kurulumHatasi'
// tur: seçilen test türleri listesi (birden fazla olabilir); skor alanları seçilen her grup için ayrı tutulur
export const history = [
  { runId: 'run-8', proje: 'blog-api', kaynak: 'kod', durum: 'tamamlandi', alan: 'web', dil: 'python', tur: ['birim', 'arayuz', 'erisilebilirlik'], coverage: 94, erisimSkor: 46, tarih: '10.11.2026' },
  { runId: 'run-6', proje: 'ornek-magaza.com', kaynak: 'url', url: 'https://ornek-magaza.com', durum: 'tamamlandi', alan: 'web', dil: null, tur: ['erisilebilirlik'], coverage: null, erisimSkor: 46, tarih: '09.11.2026' },
  { runId: 'run-7', proje: 'blog-api', kaynak: 'kod', durum: 'tamamlandi', alan: 'web', dil: 'python', tur: ['erisilebilirlik'], coverage: null, erisimSkor: 46, tarih: '09.11.2026' },
  { runId: 'run-5', proje: 'ornek-magaza.com', kaynak: 'url', url: 'https://ornek-magaza.com', durum: 'tamamlandi', alan: 'web', dil: null, tur: ['kullanilabilirlik'], coverage: null, uxSkor: 72, tarih: '02.11.2026' },
  { runId: 'run-1', proje: 'blog-api', durum: 'tamamlandi', alan: 'web', dil: 'python', tur: ['birim', 'arayuz'], coverage: 94, tarih: '26.10.2026' },
  { runId: 'run-2', proje: 'envanter-sistemi', durum: 'tamamlandi', alan: 'genel', dil: 'csharp', tur: ['birim'], coverage: 88, tarih: '24.10.2026' },
  { runId: 'run-3', proje: 'todo-app', durum: 'tamamlandi', alan: 'web', dil: 'js', tur: ['birim', 'arayuz'], coverage: 91, tarih: '21.10.2026' },
  { runId: 'run-4', proje: 'faiz-hesaplama', durum: 'kurulumHatasi', alan: 'genel', dil: 'python', tur: ['birim'], coverage: null, tarih: '18.10.2026' },
]
