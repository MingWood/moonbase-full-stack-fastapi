"""add location and address columns, expand category and unit enums

Revision ID: c4bcd8e54d09
Revises: 3b76f054ba0e
Create Date: 2026-08-27 17:42:09.963173

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes

# revision identifiers, used by Alembic.
revision = 'c4bcd8e54d09'
down_revision = '3b76f054ba0e'
branch_labels = None
depends_on = None

NEW_CATEGORY_VALUES = ["clothing", "merch", "glassware", "boh_ingredients", "to_go_serveware"]
NEW_UNIT_VALUES = ["boxes", "bottles"]


def upgrade():
    # NOTE: autogenerate also proposed dropping 'test_table' - that table is
    # pre-existing, unrelated to this app's models, and must not be touched.
    # ALTER TYPE ... ADD VALUE cannot run inside the same transaction that
    # then uses the new value, but it's fine on its own here since nothing
    # else in this migration references these values.
    for value in NEW_CATEGORY_VALUES:
        op.execute(f"ALTER TYPE inventorycategory ADD VALUE IF NOT EXISTS '{value}'")
    for value in NEW_UNIT_VALUES:
        op.execute(f"ALTER TYPE inventoryunit ADD VALUE IF NOT EXISTS '{value}'")
    op.add_column('inventoryitem', sa.Column('location', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=True))
    op.add_column('inventoryitem', sa.Column('address', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=True))


def downgrade():
    # Postgres doesn't support removing enum values, so the new
    # inventorycategory/inventoryunit members are left in place.
    op.drop_column('inventoryitem', 'address')
    op.drop_column('inventoryitem', 'location')
