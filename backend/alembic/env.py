"""Alembic göç ortamı: bağlantı adresi app/ayarlar.py'den, tablolar app/modeller.py'den gelir."""
from logging.config import fileConfig

from alembic import context

from app import modeller  # noqa: F401 — tabloların Base.metadata'ya kaydolması için
from app.db import Base, motor

if context.config.config_file_name is not None:
    fileConfig(context.config.config_file_name)

target_metadata = Base.metadata


def cevrimdisi_calistir() -> None:
    """`alembic upgrade head --sql`: veritabanına bağlanmadan SQL çıktısı üretir."""
    context.configure(url=motor.url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def cevrimici_calistir() -> None:
    with motor.connect() as baglanti:
        context.configure(connection=baglanti, target_metadata=target_metadata, compare_type=True)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    cevrimdisi_calistir()
else:
    cevrimici_calistir()
