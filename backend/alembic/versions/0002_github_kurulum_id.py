"""kullanicilar.github_kurulum_id: GitHub App kurulumu (repo erişimi)

Revision ID: 0002
Revises: 0001
Create Date: 2026-11-27 18:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '0002'
down_revision: Union[str, Sequence[str], None] = '0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('kullanicilar', sa.Column('github_kurulum_id', sa.BigInteger(), nullable=True))


def downgrade() -> None:
    op.drop_column('kullanicilar', 'github_kurulum_id')
