"""add retool coffee ops tables (schema only, mirrors external retool db)

Revision ID: cef7b17346c5
Revises: a9b5dfae398a
Create Date: 2026-09-14 00:00:00.000000

"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'cef7b17346c5'
down_revision = 'a9b5dfae398a'
branch_labels = None
depends_on = None


site_enum_8f28344e = postgresql.ENUM('wholesale', 'retail', name='site_enum_8f28344e')
site_enum_599cef2b = postgresql.ENUM('retail', 'wholesale', name='site_enum_599cef2b')
expression_type_enum_4431a693 = postgresql.ENUM(
    'fruit_forward', 'exploratory', 'nova', 'cocoa', name='expression_type_enum_4431a693'
)
location_enum_71456e49 = postgresql.ENUM('saratoga_hq', name='location_enum_71456e49')
selection_type_enum_254ac732 = postgresql.ENUM(
    'medium_spro', 'light_spro', 'dark_spro', 'decaf_spro',
    'slowbar_1', 'slowbar_2', 'slowbar_3', 'slowbar_4', 'slowbar_5',
    'slowbar_spro_1', 'slowbar_spro_2',
    name='selection_type_enum_254ac732',
)
roasting_machine_enum_55e00385 = postgresql.ENUM(
    'hq_loring_s7', 'hq_roest_sagvag', name='roasting_machine_enum_55e00385'
)
ref_enum_49300998 = postgresql.ENUM('true', 'false', name='ref_enum_49300998')


def upgrade():
    bind = op.get_bind()
    for enum_type in (
        site_enum_8f28344e,
        site_enum_599cef2b,
        expression_type_enum_4431a693,
        location_enum_71456e49,
        selection_type_enum_254ac732,
        roasting_machine_enum_55e00385,
        ref_enum_49300998,
    ):
        enum_type.create(bind, checkfirst=True)

    op.create_table(
        'coffee_sync_strategies',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('date_added', sa.DateTime(timezone=True), nullable=True),
        sa.Column('name', sa.Text(), nullable=True),
        sa.Column('bag_size_grams', sa.Integer(), nullable=True),
        sa.Column('percentage_sku_mix', sa.Integer(), nullable=True),
        sa.Column('percentage_site_mix', sa.Integer(), nullable=True),
        sa.Column('site', postgresql.ENUM(name='site_enum_8f28344e', create_type=False), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'coffee_sync_staging',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('coffees_id', sa.Integer(), nullable=True),
        sa.Column('current_assigned_inventory_grams', sa.Integer(), nullable=True),
        sa.Column('physical_inventory_grams', sa.Integer(), nullable=True),
        sa.Column('future_assigned_inventory_grams', sa.Integer(), nullable=True),
        sa.Column('available_inventory_grams', sa.Integer(), nullable=True),
        sa.Column('calculation_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('coffee_sync_strategies_name', sa.Text(), nullable=True),
        sa.Column('suggested_retail_variant_qtys', sa.Text(), nullable=True),
        sa.Column('suggested_wholesale_variant_qtys', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('coffees_id'),
    )

    op.create_table(
        'coffees',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.Text(), nullable=True),
        sa.Column('initial_grams', sa.Integer(), nullable=True),
        sa.Column('entered_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('remaining_grams', sa.Integer(), nullable=True),
        sa.Column(
            'expression_type',
            postgresql.ENUM(name='expression_type_enum_4431a693', create_type=False),
            nullable=True,
        ),
        sa.Column('shopify_product_id', sa.BigInteger(), nullable=True),
        sa.Column('shopify_wholesale_product_id', sa.BigInteger(), nullable=True),
        sa.Column('farm', sa.Text(), nullable=False),
        sa.Column('country', sa.Text(), nullable=True),
        sa.Column('varietal', sa.Text(), nullable=True),
        sa.Column('process', sa.Text(), nullable=True),
        sa.Column('producer_name', sa.Text(), nullable=False),
        sa.Column('archived', sa.Boolean(), nullable=True),
        sa.Column('weigh_in_entered_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('moisture_content', sa.Float(), nullable=True),
        sa.Column('density', sa.Integer(), nullable=True),
        sa.Column('reading_temperature', sa.Integer(), nullable=True),
        sa.Column('moisture_reading_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('coffee_sync_strategies_name', sa.Text(), nullable=True),
        sa.Column('importer_exporter', sa.Text(), nullable=True),
        sa.Column('menu_label_process_varietal', sa.Text(), nullable=True),
        sa.Column('menu_label_producer', sa.Text(), nullable=True),
        sa.Column('flavor_notes', sa.Text(), nullable=True),
        sa.Column('expose_to_public', sa.Boolean(), nullable=True),
        sa.Column('pourover_price', sa.Numeric(15, 2), nullable=True),
        sa.Column('espresso_price', sa.Numeric(15, 2), nullable=True),
        sa.Column('bag_price', sa.Numeric(15, 2), nullable=True),
        sa.Column('bag_size_grams', sa.Integer(), nullable=True),
        sa.Column('color', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'menu',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('last_updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('location', postgresql.ENUM(name='location_enum_71456e49', create_type=False), nullable=True),
        sa.Column('coffee_id', sa.Integer(), nullable=True),
        sa.Column(
            'selection_type',
            postgresql.ENUM(name='selection_type_enum_254ac732', create_type=False),
            nullable=True,
        ),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'roasts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('coffees_id', sa.Integer(), nullable=False),
        sa.Column('grams_in', sa.Integer(), nullable=True),
        sa.Column('roasted_grams_out', sa.Integer(), nullable=True),
        sa.Column('post_sorted_grams', sa.Integer(), nullable=True),
        sa.Column('charge_temp', sa.Integer(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('alternative_id', sa.Integer(), nullable=True),
        sa.Column(
            'roasting_machine',
            postgresql.ENUM(name='roasting_machine_enum_55e00385', create_type=False),
            nullable=False,
        ),
        sa.Column('roast_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('ref', postgresql.ENUM(name='ref_enum_49300998', create_type=False), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'roest_etl',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('batch_no', sa.Integer(), nullable=True),
        sa.Column('roast_id', sa.Integer(), nullable=True),
        sa.Column('bean_name', sa.Text(), nullable=True),
        sa.Column('start_timestamp', sa.DateTime(timezone=True), nullable=True),
        sa.Column('start_weight', sa.Integer(), nullable=True),
        sa.Column('machine_name', sa.Text(), nullable=True),
        sa.Column('end_weight', sa.Float(), nullable=True),
        sa.Column('drop_timestamp', sa.DateTime(timezone=True), nullable=True),
        sa.Column('firstcrack_timestamp', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'shopify_orders_inventory',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('product_name', sa.Text(), nullable=True),
        sa.Column('product_id', sa.BigInteger(), nullable=True),
        sa.Column('variant_name', sa.Text(), nullable=True),
        sa.Column('variant_id', sa.BigInteger(), nullable=True),
        sa.Column('unfulfilled_ordered_qty', sa.Integer(), nullable=True),
        sa.Column('inventory_qty', sa.Integer(), nullable=True),
        sa.Column('parsed_weight_grams', sa.Integer(), nullable=True),
        sa.Column('date_added', sa.DateTime(timezone=True), nullable=True),
        sa.Column('site', postgresql.ENUM(name='site_enum_599cef2b', create_type=False), nullable=True),
        sa.Column('generated_sku', sa.Text(), nullable=True),
        sa.Column('order_qty_falling_inside_cutoff', sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('generated_sku'),
    )

    op.create_table(
        'shopify_subscription_orders',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('customer_id', sa.Text(), nullable=True),
        sa.Column('customer_email', sa.Text(), nullable=True),
        sa.Column('subscription_type', sa.Text(), nullable=True),
        sa.Column('order_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('assigned_coffees_id', sa.Integer(), nullable=True),
        sa.Column('order_id', sa.Text(), nullable=True),
        sa.Column('order_name', sa.Text(), nullable=True),
        sa.Column('order_falling_inside_cutoff', sa.Boolean(), nullable=True),
        sa.Column('unique_generated_index', sa.Text(), nullable=True),
        sa.Column('qty_id', sa.Integer(), nullable=True),
        sa.Column('date_inserted', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('unique_generated_index'),
    )


def downgrade():
    op.drop_table('shopify_subscription_orders')
    op.drop_table('shopify_orders_inventory')
    op.drop_table('roest_etl')
    op.drop_table('roasts')
    op.drop_table('menu')
    op.drop_table('coffees')
    op.drop_table('coffee_sync_staging')
    op.drop_table('coffee_sync_strategies')

    bind = op.get_bind()
    for enum_type in (
        ref_enum_49300998,
        roasting_machine_enum_55e00385,
        selection_type_enum_254ac732,
        location_enum_71456e49,
        expression_type_enum_4431a693,
        site_enum_599cef2b,
        site_enum_8f28344e,
    ):
        enum_type.drop(bind, checkfirst=True)
