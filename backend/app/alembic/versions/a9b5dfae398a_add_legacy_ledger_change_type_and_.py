"""add legacy ledger change type and backfill existing rows

Revision ID: a9b5dfae398a
Revises: 6a88c3f4674c
Create Date: 2026-09-13 22:06:46.212108

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = 'a9b5dfae398a'
down_revision = '6a88c3f4674c'
branch_labels = None
depends_on = None


def upgrade():
    # Postgres forbids using a newly added enum value inside the same
    # transaction that adds it - autocommit_block() commits each ADD VALUE
    # on its own so the UPDATE below (in the normal migration transaction)
    # can use them.
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE ledgerchangetype ADD VALUE IF NOT EXISTS 'LEGACY_ADDITION'")
        op.execute("ALTER TYPE ledgerchangetype ADD VALUE IF NOT EXISTS 'LEGACY_SUBTRACTION'")
        op.execute("ALTER TYPE ledgerchangetype ADD VALUE IF NOT EXISTS 'LEGACY_ADJUSTMENT'")

    # One-time reset point: every ledger entry that exists today predates
    # run-rate tracking. Prefix each row's existing type with "LEGACY_" (e.g.
    # ADDITION -> LEGACY_ADDITION) so crud.compute_run_rates ignores them
    # while the original type is still recoverable.
    op.execute(
        """
        UPDATE ledgerentry
        SET change_type = ('LEGACY_' || change_type::text)::ledgerchangetype
        WHERE change_type IN ('ADDITION', 'SUBTRACTION', 'ADJUSTMENT')
        """
    )


def downgrade():
    # Reverses the backfill by stripping the "LEGACY_" prefix. Does not drop
    # the added enum labels - Postgres has no supported way to remove an
    # enum value, but leaving them unused is harmless.
    op.execute(
        """
        UPDATE ledgerentry
        SET change_type = (regexp_replace(change_type::text, '^LEGACY_', ''))::ledgerchangetype
        WHERE change_type::text LIKE 'LEGACY_%'
        """
    )
