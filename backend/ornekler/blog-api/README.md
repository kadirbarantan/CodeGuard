# blog-api

FastAPI ile yazılmış küçük bir blog servisi. Yazılar ve kullanıcılar bellekte tutulur (`app/db.py`).

- `app/posts.py`: yazı uçları (oluşturma, listeleme, okuma, silme)
- `app/pagination.py`: sayfalama
- `app/users.py`: kullanıcı kayıtları
- `app/core/`: ayarlar ve şifre işlemleri
- `app/models/`: yazı modeli
- `app/utils/`: adres metni (slug) üretimi

Çalıştırmak için:

```
pip install -r requirements.txt
uvicorn app.main:app --reload
```
