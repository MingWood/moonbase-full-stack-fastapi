"""add cupping table

Revision ID: 6a88c3f4674c
Revises: 984565b0434d
Create Date: 2026-09-04 00:17:45.505602

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes

# revision identifiers, used by Alembic.
revision = '6a88c3f4674c'
down_revision = '984565b0434d'
branch_labels = None
depends_on = None


def upgrade():
    # NOTE: autogenerate also proposed dropping 'test_table' - that table is
    # pre-existing, unrelated to this app's models, and must not be touched.
    op.create_table('cupping',
    sa.Column('roast_id', sa.Integer(), nullable=False),
    sa.Column('roasting_machine', sa.String(length=20), nullable=False),
    sa.Column('brew_style', sa.String(length=20), nullable=False),
    sa.Column('order_id', sa.Integer(), nullable=False),
    sa.Column('manual_name', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=True),
    sa.Column('fragrance_score', sa.Numeric(precision=4, scale=2), nullable=False),
    sa.Column('aroma_score', sa.Numeric(precision=4, scale=2), nullable=False),
    sa.Column('taste_score', sa.Numeric(precision=4, scale=2), nullable=False),
    sa.Column('aftertaste_score', sa.Numeric(precision=4, scale=2), nullable=False),
    sa.Column('notes', sqlmodel.sql.sqltypes.AutoString(length=2000), nullable=True),
    sa.Column('buy_decision', sa.Boolean(), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('date', sa.BigInteger(), nullable=False),
    sa.Column('who_tasted', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )


def downgrade():
    op.drop_table('cupping')
