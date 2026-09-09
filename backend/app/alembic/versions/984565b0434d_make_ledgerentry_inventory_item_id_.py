"""make ledgerentry inventory_item_id nullable with on delete set null

Revision ID: 984565b0434d
Revises: b0397f317cf8
Create Date: 2026-08-27 19:24:20.950559

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '984565b0434d'
down_revision = 'b0397f317cf8'
branch_labels = None
depends_on = None


def upgrade():
    # NOTE: autogenerate also proposed dropping 'test_table' - that table is
    # pre-existing, unrelated to this app's models, and must not be touched.
    op.alter_column('ledgerentry', 'inventory_item_id',
               existing_type=sa.UUID(),
               nullable=True)
    op.drop_constraint(op.f('ledgerentry_inventory_item_id_fkey'), 'ledgerentry', type_='foreignkey')
    op.create_foreign_key(None, 'ledgerentry', 'inventoryitem', ['inventory_item_id'], ['id'], ondelete='SET NULL')


def downgrade():
    op.drop_constraint(None, 'ledgerentry', type_='foreignkey')
    op.create_foreign_key(op.f('ledgerentry_inventory_item_id_fkey'), 'ledgerentry', 'inventoryitem', ['inventory_item_id'], ['id'], ondelete='CASCADE')
    op.alter_column('ledgerentry', 'inventory_item_id',
               existing_type=sa.UUID(),
               nullable=False)
