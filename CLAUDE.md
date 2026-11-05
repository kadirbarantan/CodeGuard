# CodeGuard — Claude Code için proje notları

LLM ajanlarıyla otomatik test üreten bir platform (bitirme tezi; ekip: Kadir ve Hümeyra).
Kullanıcı kodunu yükler (ya da GitHub reposundan seçer veya canlı sitenin URL'sini girer); ajanlar birim,
arayüz (E2E) ve kullanılabilirlik testlerini yazar, çalıştırır, eksikleri tamamlar ve raporlar.

## Dil ve stil
- Arayüz metinleri, yorumlar, değişken, fonksiyon ve dosya adları **Türkçe** (örn. `testiBaslat`, `GirdiSecici.jsx`).
- Kullanıcıya dönük metinler kısa ve sade olsun.
- Frontend: React 18 + Vite + Tailwind v4, **düz JavaScript** (TypeScript yok), UI kütüphanesi yok, router yok
  (tek sayfalı uygulama), ikonlar `lucide-react`. Renkler `frontend/src/theme.css`'teki değişkenlerden
  (`bg-surface`, `text-ai-text`, `bg-accent`...) gelir; sabit renk yazma. Gece modu desteklenmeli.
- Backend: Python, FastAPI.
- Erişilebilirlik: buton/sekme/listbox rolleri, klavyeyle kullanım, 375 px genişlikte yatay taşma olmamalı.

## Klasörler
```
frontend/   React uygulaması
  src/config/testStratejileri.js  alan + dil + tür → test planı (tek doğru kaynak)
  src/services/api.js             backend ile tek temas noktası (VITE_API_URL yoksa mock)
  src/mock/                       mock veriler (canlı akış olayları, raporlar, GitHub repoları)
  src/components/home|run|report  ana sayfa, canlı akış, rapor
backend/    FastAPI (şimdilik yalnızca GitHub ile giriş: app/auth/)
docs/       teknik belgeler (github-oauth.md, test-stratejileri.md, faz1-arayuz.md)
```

## Komutlar
```bash
# Frontend
cd frontend && npm install && npm run dev      # http://localhost:5173
cd frontend && npm run build                   # her değişiklikten sonra derlenmeli

# Backend
cd backend
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env                         # değerleri doldur
uvicorn app.main:app --reload --port 8000      # http://localhost:8000/docs
```
Yerelde backend'e bağlanmak için `frontend/.env.local` içine `VITE_API_URL=http://localhost:8000`.

## Değişmez kurallar
- **Mock çalışmaya devam etmeli.** `VITE_API_URL` tanımlı değilse (Vercel'deki demo dahil) her özellik
  örnek veriyle uçtan uca çalışır. Arayüz yalnızca `services/api.js` üzerinden backend'e gider.
- **Giriş:** kullanıcı giriş yapmadan kod yükleyip seçim yapabilir; "Testi Başlat"ta giriş istenir,
  seçimler korunur. İlk girişte "Profilini tamamla" açılır. OAuth (GitHub) açılır pencerede yürür,
  ana sayfa yerinde kalır. Ayrıntı: `docs/github-oauth.md`.
- **Güvenlik:** sır/anahtar koda yazılmaz, `.env` (git'e gitmez) ve `.env.example` (boş değerlerle) kullanılır.
  OAuth'ta state (CSRF) zorunlu; sağlayıcı token'ı saklanmaz, CodeGuard JWT'si üretilir; pencere mesajı
  yalnızca `FRONTEND_URL`'e gider.
- **Token tasarrufu kullanıcıya gösterilmez** (yalnızca backend'de loglanır).
- Şu an yalnızca **Web** alanı aktif; Oyun/Mobil/Genel "Yakında" olarak pasif görünür.
- Diller: C#, Python, JS/TS, PHP. Test türleri: Birim, Arayüz, İkisi, Kullanılabilirlik.

## Çalışma kuralları
- Önce kısa bir plan çıkar ve onay iste; sonra kodla.
- Dosya taşımadan, yeniden adlandırmadan ya da silmeden önce sor.
- **Git komutlarını (checkout, commit, push, merge, reset) ekip çalıştırır; sen çalıştırma.**
  `git status` ve `git diff` serbest. Her iş ayrı dalda yapılır, PR ile `main`'e birleşir.
- Bitince: `npm run build` sonucunu söyle, ne değiştiğini dosya dosya özetle, bir commit mesajı öner
  (`feat:` / `fix:` / `docs:` / `chore:` önekiyle; Windows'ta tek satır, ek açıklama ikinci `-m` ile).
- Yeni bir kararı ilgili `docs/` belgesine yaz.
