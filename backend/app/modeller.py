"""Veritabanı tabloları.

    kullanicilar ──< calistirmalar ──< olaylar
                          └──── rapor (her çalıştırmanın en fazla bir raporu)

JSON alanlarının biçimi frontend'in mock verileriyle aynıdır (bkz. docs/api-sozlesmesi.md).
Tabloda değişiklik yapınca yeni bir Alembic göçü üretilir:
    alembic revision --autogenerate -m "ne değişti"
    alembic upgrade head
"""
import uuid
from datetime import datetime

from sqlalchemy import JSON, BigInteger, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

# PostgreSQL'de JSONB (sorgulanabilir, sıkıştırılmış), diğer veritabanlarında düz JSON
Json = JSON().with_variant(JSONB(), "postgresql")


def _yeni_id() -> str:
    return str(uuid.uuid4())


class Kullanici(Base):
    __tablename__ = "kullanicilar"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_yeni_id)
    ad: Mapped[str] = mapped_column(String(100))
    # Her zaman küçük harfle saklanır (aynı adres farklı yazımla iki hesap açamasın)
    eposta: Mapped[str] = mapped_column(String(254), unique=True)
    # Yalnızca GitHub/Google ile açılan hesaplarda boş
    sifre_hash: Mapped[str | None] = mapped_column(String(255))
    github_id: Mapped[int | None] = mapped_column(BigInteger, unique=True)
    github_kullanici_adi: Mapped[str | None] = mapped_column(String(100))
    google_id: Mapped[str | None] = mapped_column(String(255), unique=True)
    google_eposta: Mapped[str | None] = mapped_column(String(254))
    # { ad, meslek, digerMeslek, diller } — ilk girişte doldurulur
    profil: Mapped[dict | None] = mapped_column(Json)
    olusturma: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    calistirmalar: Mapped[list["Calistirma"]] = relationship(back_populates="kullanici", cascade="all, delete-orphan")


class Calistirma(Base):
    """Bir test çalıştırması (frontend'deki runId)."""

    __tablename__ = "calistirmalar"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_yeni_id)
    kullanici_id: Mapped[str] = mapped_column(ForeignKey("kullanicilar.id", ondelete="CASCADE"), index=True)
    # Yüklenen klasör / zip adı, repo adı ya da sitenin alan adı
    proje: Mapped[str] = mapped_column(String(200))
    # { kaynak, alan, dil, tur: [...], digerMetin, url, baslatmaKomutu }
    secim: Mapped[dict] = mapped_column(Json)
    # bekliyor | calisiyor | tamamlandi | durduruldu | kurulumHatasi | hata
    durum: Mapped[str] = mapped_column(String(20), default="bekliyor")
    # Geçmiş listesi için kısa sonuç: { coverage, uxSkor, erisimSkor } (bitince doldurulur)
    ozet: Mapped[dict | None] = mapped_column(Json)
    # Kurulum ya da çalıştırma hatasının kullanıcıya gösterilecek açıklaması
    hata: Mapped[str | None] = mapped_column(Text)
    olusturma: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    bitis: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    kullanici: Mapped[Kullanici] = relationship(back_populates="calistirmalar")
    olaylar: Mapped[list["Olay"]] = relationship(back_populates="calistirma", cascade="all, delete-orphan", order_by="Olay.sira")
    rapor: Mapped["Rapor | None"] = relationship(back_populates="calistirma", cascade="all, delete-orphan")


class Olay(Base):
    """Canlı akıştaki bir adım (agent_step). Sayfa yenilenince akış baştan oynatılabilsin diye saklanır."""

    __tablename__ = "olaylar"
    __table_args__ = (UniqueConstraint("calistirma_id", "sira"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    calistirma_id: Mapped[str] = mapped_column(ForeignKey("calistirmalar.id", ondelete="CASCADE"), index=True)
    # 0, 1, 2 … (istemci kaldığı yerden devam edebilir)
    sira: Mapped[int] = mapped_column(Integer)
    # { type, agent, kind, message, round, maxRounds, metrics, grup }
    veri: Mapped[dict] = mapped_column(Json)
    zaman: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    calistirma: Mapped[Calistirma] = relationship(back_populates="olaylar")


class Rapor(Base):
    __tablename__ = "raporlar"

    calistirma_id: Mapped[str] = mapped_column(ForeignKey("calistirmalar.id", ondelete="CASCADE"), primary_key=True)
    # Frontend'in getReport ile aldığı nesnenin tamamı (tek tür ya da parcalar'lı birleşik rapor)
    veri: Mapped[dict] = mapped_column(Json)
    # Mutasyon testi rapordan sonra biter; o zamana kadar boş
    kalite_skoru: Mapped[int | None] = mapped_column(Integer)
    olusturma: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    calistirma: Mapped[Calistirma] = relationship(back_populates="rapor")
