"""Veritabanı bağlantısı (SQLAlchemy).

- `Base`: bütün tabloların (app/modeller.py) türediği sınıf.
- `oturum_ac()`: `with oturum_ac() as db:` ile kısa bir veritabanı oturumu açar.
- `get_db`: FastAPI uçlarında `db: Session = Depends(get_db)` olarak kullanılır.

Tablolar uygulama açılırken otomatik oluşturulmaz; Alembic ile kurulur:
    alembic upgrade head
"""
from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app import ayarlar

# pool_pre_ping: veritabanı yeniden başlatılırsa kopmuş bağlantılar otomatik yenilenir
motor = create_engine(ayarlar.DATABASE_URL, pool_pre_ping=True)
oturum_ac = sessionmaker(motor, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Iterator[Session]:
    with oturum_ac() as db:
        yield db
