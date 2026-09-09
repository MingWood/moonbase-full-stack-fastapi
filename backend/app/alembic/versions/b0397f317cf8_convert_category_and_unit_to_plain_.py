"""convert category and unit to plain varchar

Revision ID: b0397f317cf8
Revises: c4bcd8e54d09
Create Date: 2026-08-27 18:06:18.289644

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = 'b0397f317cf8'
down_revision = 'c4bcd8e54d09'
branch_labels = None
depends_on = None


def upgrade():
    # Postgres native enums store the Python enum's *member name*
    # (e.g. 'GREEN_COFFEE'), not its lowercase *value* ('green_coffee').
    # A prior migration (c4bcd8e54d09) added new enum labels using the
    # value casing by mistake, which doesn't match how SQLAlchemy actually
    # writes rows and breaks inserts for the new categories/units. Rather
    # than juggle enum-label casing forever as categories keep growing
    # organically, switch both columns to plain varchar (existing values
    # lowercased to match the app's InventoryCategory/InventoryUnit values)
    # and drop the now-unused enum types entirely.
    op.execute(
        "ALTER TABLE inventoryitem ALTER COLUMN category TYPE character varying(50) "
        "USING lower(category::text)"
    )
    op.execute(
        "ALTER TABLE inventoryitem ALTER COLUMN unit TYPE character varying(50) "
        "USING lower(unit::text)"
    )
    op.execute("DROP TYPE inventorycategory")
    op.execute("DROP TYPE inventoryunit")


def downgrade():
    raise NotImplementedError(
        "Downgrade not supported: category/unit are plain varchar and may "
        "contain values added after this migration that no longer fit a "
        "fixed enum type."
    )
