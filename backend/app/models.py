import time
import uuid
from datetime import UTC, datetime
from enum import StrEnum

from pydantic import EmailStr
from sqlalchemy import BigInteger, DateTime, Float, Numeric, String, Text
from sqlalchemy import Enum as PgEnum
from sqlmodel import Field, Relationship, SQLModel


def get_datetime_utc() -> datetime:
    return datetime.now(UTC)


def now_epoch_ms() -> int:
    return int(time.time() * 1000)


# Shared properties
class UserBase(SQLModel):
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    is_active: bool = True
    is_superuser: bool = False
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on creation
class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)


class UserRegister(SQLModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on update, all are optional
class UserUpdate(SQLModel):
    email: EmailStr | None = Field(default=None, max_length=255)
    is_active: bool | None = None
    is_superuser: bool | None = None
    full_name: str | None = Field(default=None, max_length=255)
    password: str | None = Field(default=None, min_length=8, max_length=128)


class UserUpdateMe(SQLModel):
    full_name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)


class UpdatePassword(SQLModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


# Database model, database table inferred from class name
class User(UserBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    items: list[Item] = Relationship(back_populates="owner", cascade_delete=True)


# Properties to return via API, id is always required
class UserPublic(UserBase):
    id: uuid.UUID
    created_at: datetime | None = None


class UsersPublic(SQLModel):
    data: list[UserPublic]
    count: int


# Shared properties
class ItemBase(SQLModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=255)


# Properties to receive on item creation
class ItemCreate(ItemBase):
    pass


# Properties to receive on item update
class ItemUpdate(SQLModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=255)


# Database model, database table inferred from class name
class Item(ItemBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    owner: User | None = Relationship(back_populates="items")


# Properties to return via API, id is always required
class ItemPublic(ItemBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime | None = None


class ItemsPublic(SQLModel):
    data: list[ItemPublic]
    count: int


class InventoryCategory(StrEnum):
    GREEN_COFFEE = "green_coffee"
    ROASTED_COFFEE = "roasted_coffee"
    PACKAGING = "packaging"
    SUPPLIES = "supplies"
    CLOTHING = "clothing"
    MERCH = "merch"
    GLASSWARE = "glassware"
    BOH_INGREDIENTS = "boh_ingredients"
    TO_GO_SERVEWARE = "to_go_serveware"
    OTHER = "other"


class InventoryUnit(StrEnum):
    LBS = "lbs"
    KG = "kg"
    BAGS = "bags"
    UNITS = "units"
    BOXES = "boxes"
    BOTTLES = "bottles"


class LedgerChangeType(StrEnum):
    ADDITION = "addition"
    SUBTRACTION = "subtraction"
    ADJUSTMENT = "adjustment"
    # LEGACY_* mirrors of the three types above, for entries that predate a
    # run-rate reset point - crud.compute_run_rates ignores them since they
    # aren't ADDITION/SUBTRACTION. Never written by the API, only ever set
    # via a one-off backfill (reversible: strip the "legacy_" prefix).
    LEGACY_ADDITION = "legacy_addition"
    LEGACY_SUBTRACTION = "legacy_subtraction"
    LEGACY_ADJUSTMENT = "legacy_adjustment"


# Shared properties
class InventoryItemBase(SQLModel):
    name: str = Field(min_length=1, max_length=255, index=True)
    # Stored as plain varchar (not a Postgres native enum) so new categories/units
    # can be added by extending the Python enum alone, no migration required.
    category: InventoryCategory = Field(sa_type=String(50))
    unit: InventoryUnit = Field(sa_type=String(50))
    current_qty: float = Field(ge=0, sa_type=Numeric(12, 3))
    reorder_threshold: float | None = Field(default=None, ge=0, sa_type=Numeric(12, 3))
    supplier: str | None = Field(default=None, max_length=255)
    notes: str | None = Field(default=None, max_length=1000)
    location: str | None = Field(default=None, max_length=255)
    address: str | None = Field(default=None, max_length=255)


# Properties to receive on inventory item creation
class InventoryItemCreate(InventoryItemBase):
    pass


# Properties to receive on inventory item update, all are optional
class InventoryItemUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    category: InventoryCategory | None = None
    unit: InventoryUnit | None = None
    current_qty: float | None = Field(default=None, ge=0)
    reorder_threshold: float | None = Field(default=None, ge=0)
    supplier: str | None = Field(default=None, max_length=255)
    notes: str | None = Field(default=None, max_length=1000)
    location: str | None = Field(default=None, max_length=255)
    address: str | None = Field(default=None, max_length=255)


# Database model, database table inferred from class name
class InventoryItem(InventoryItemBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at_ms: int = Field(sa_type=BigInteger, default_factory=now_epoch_ms)
    last_updated_ms: int = Field(sa_type=BigInteger, default_factory=now_epoch_ms)
    # passive_deletes: let the DB's ON DELETE SET NULL handle orphaning
    # ledger rows instead of the ORM cascading a delete onto them.
    ledger_entries: list[LedgerEntry] = Relationship(
        back_populates="inventory_item",
        sa_relationship_kwargs={"passive_deletes": True},
    )


# Properties to return via API, id is always required
class InventoryItemPublic(InventoryItemBase):
    id: uuid.UUID
    created_at_ms: int
    last_updated_ms: int
    # Computed from ledger history, not stored columns - see
    # crud.compute_run_rates. Callers that don't compute them (create/update/
    # bulk-adjust) fall back to these defaults rather than a stale number.
    run_rate_per_month: float = 0.0
    months_remaining: float | None = None


class InventoryItemsPublic(SQLModel):
    data: list[InventoryItemPublic]
    count: int


# Database model, database table inferred from class name
# Append-only, informational record of every addition/subtraction/adjustment.
# inventory_item_id is nullable with ON DELETE SET NULL (not CASCADE) so that
# deleting an inventory item does not erase its history - item_name is
# denormalized onto each row precisely so the audit trail stays readable
# even after the source item is gone.
class LedgerEntry(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    inventory_item_id: uuid.UUID | None = Field(
        default=None, foreign_key="inventoryitem.id", nullable=True, ondelete="SET NULL"
    )
    item_name: str = Field(max_length=255)
    change_type: LedgerChangeType
    quantity_change: float = Field(sa_type=Numeric(12, 3))
    resulting_qty: float = Field(sa_type=Numeric(12, 3))
    note: str | None = Field(default=None, max_length=500)
    created_at_ms: int = Field(sa_type=BigInteger, default_factory=now_epoch_ms)
    inventory_item: InventoryItem | None = Relationship(back_populates="ledger_entries")


class LedgerEntryPublic(SQLModel):
    id: uuid.UUID
    inventory_item_id: uuid.UUID | None
    item_name: str
    change_type: LedgerChangeType
    quantity_change: float
    resulting_qty: float
    note: str | None
    created_at_ms: int


class InventoryAdjustmentIn(SQLModel):
    inventory_item_id: uuid.UUID
    change_type: LedgerChangeType = LedgerChangeType.ADDITION
    quantity: float = Field(gt=0)
    note: str | None = Field(default=None, max_length=500)


class InventoryBulkAdjustIn(SQLModel):
    adjustments: list[InventoryAdjustmentIn]


class RoastingMachine(StrEnum):
    SAGVAG = "sagvag"
    HQ_LORING = "hq_loring"
    NA_ROBERT = "na_robert"


class BrewStyle(StrEnum):
    BREW = "brew"
    CUPPING = "cupping"
    SPRO = "spro"


# Shared properties - excludes `date` and `who_tasted`, which are set
# server-side (creation time / the logged-in admin), never client-supplied.
class CuppingBase(SQLModel):
    roast_id: int
    roasting_machine: RoastingMachine = Field(sa_type=String(20))
    brew_style: BrewStyle = Field(sa_type=String(20))
    order_id: int
    manual_name: str | None = Field(default=None, max_length=255)
    fragrance_score: float = Field(ge=0, le=10, sa_type=Numeric(4, 2))
    aroma_score: float = Field(ge=0, le=10, sa_type=Numeric(4, 2))
    taste_score: float = Field(ge=0, le=10, sa_type=Numeric(4, 2))
    aftertaste_score: float = Field(ge=0, le=10, sa_type=Numeric(4, 2))
    notes: str | None = Field(default=None, max_length=2000)
    # Not part of the create/edit UI yet - column exists for future use.
    buy_decision: bool | None = Field(default=None)


class CuppingCreate(CuppingBase):
    pass


class CuppingUpdate(SQLModel):
    roast_id: int | None = None
    roasting_machine: RoastingMachine | None = None
    brew_style: BrewStyle | None = None
    order_id: int | None = None
    manual_name: str | None = Field(default=None, max_length=255)
    fragrance_score: float | None = Field(default=None, ge=0, le=10)
    aroma_score: float | None = Field(default=None, ge=0, le=10)
    taste_score: float | None = Field(default=None, ge=0, le=10)
    aftertaste_score: float | None = Field(default=None, ge=0, le=10)
    notes: str | None = Field(default=None, max_length=2000)
    buy_decision: bool | None = None


# Database model, database table inferred from class name
class Cupping(CuppingBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    date: int = Field(sa_type=BigInteger, default_factory=now_epoch_ms)
    who_tasted: str = Field(max_length=255)


class CuppingPublic(CuppingBase):
    id: uuid.UUID
    date: int
    who_tasted: str
    # Computed when manual_name is blank - see crud.resolve_cupping_names.
    # Not a stored column, so create/update responses fall back to None
    # until the route explicitly resolves it.
    resolved_name: str | None = None


class CuppingsPublic(SQLModel):
    data: list[CuppingPublic]
    count: int


# ---------------------------------------------------------------------------
# Tables mirrored 1:1 from the external Retool "coffee ops" Postgres database
# (structure only, no data). Column names/types/nullability and the native
# Postgres enum types match the source exactly, including its integer serial
# ids and timestamptz columns, so a future data-sync job can map rows across
# without translation. Not yet wired into any CRUD/API surface.
# ---------------------------------------------------------------------------


def _enum_values(enum_cls: type[StrEnum]) -> list[str]:
    return [member.value for member in enum_cls]


class RetoolSiteEnum(StrEnum):
    WHOLESALE = "wholesale"
    RETAIL = "retail"


class RetoolOrderSiteEnum(StrEnum):
    RETAIL = "retail"
    WHOLESALE = "wholesale"


class RetoolExpressionType(StrEnum):
    FRUIT_FORWARD = "fruit_forward"
    EXPLORATORY = "exploratory"
    NOVA = "nova"
    COCOA = "cocoa"


class RetoolLocation(StrEnum):
    SARATOGA_HQ = "saratoga_hq"


class RetoolSelectionType(StrEnum):
    MEDIUM_SPRO = "medium_spro"
    LIGHT_SPRO = "light_spro"
    DARK_SPRO = "dark_spro"
    DECAF_SPRO = "decaf_spro"
    SLOWBAR_1 = "slowbar_1"
    SLOWBAR_2 = "slowbar_2"
    SLOWBAR_3 = "slowbar_3"
    SLOWBAR_4 = "slowbar_4"
    SLOWBAR_5 = "slowbar_5"
    SLOWBAR_SPRO_1 = "slowbar_spro_1"
    SLOWBAR_SPRO_2 = "slowbar_spro_2"


class RetoolRoastingMachine(StrEnum):
    HQ_LORING_S7 = "hq_loring_s7"
    HQ_ROEST_SAGVAG = "hq_roest_sagvag"


class RetoolRef(StrEnum):
    TRUE = "true"
    FALSE = "false"


class RetoolCoffeeSyncStrategy(SQLModel, table=True):
    __tablename__ = "coffee_sync_strategies"

    id: int | None = Field(default=None, primary_key=True)
    date_added: datetime | None = Field(default_factory=get_datetime_utc, sa_type=DateTime(timezone=True))
    name: str | None = Field(default=None, sa_type=Text)
    bag_size_grams: int | None = Field(default=0)
    percentage_sku_mix: int | None = Field(default=0)
    percentage_site_mix: int | None = Field(default=0)
    site: RetoolSiteEnum | None = Field(
        default=None,
        sa_type=PgEnum(RetoolSiteEnum, name="site_enum_8f28344e", values_callable=_enum_values),
    )


class RetoolCoffeeSyncStaging(SQLModel, table=True):
    __tablename__ = "coffee_sync_staging"

    id: int | None = Field(default=None, primary_key=True)
    coffees_id: int | None = Field(default=0, unique=True)
    current_assigned_inventory_grams: int | None = Field(default=0)
    physical_inventory_grams: int | None = Field(default=0)
    future_assigned_inventory_grams: int | None = Field(default=0)
    available_inventory_grams: int | None = Field(default=0)
    calculation_date: datetime | None = Field(default_factory=get_datetime_utc, sa_type=DateTime(timezone=True))
    coffee_sync_strategies_name: str | None = Field(default=None, sa_type=Text)
    suggested_retail_variant_qtys: str | None = Field(default=None, sa_type=Text)
    suggested_wholesale_variant_qtys: str | None = Field(default=None, sa_type=Text)


class RetoolCoffee(SQLModel, table=True):
    __tablename__ = "coffees"

    id: int | None = Field(default=None, primary_key=True)
    name: str | None = Field(default=None, sa_type=Text)
    initial_grams: int | None = Field(default=0)
    entered_date: datetime | None = Field(default_factory=get_datetime_utc, sa_type=DateTime(timezone=True))
    remaining_grams: int | None = Field(default=0)
    expression_type: RetoolExpressionType | None = Field(
        default=RetoolExpressionType.FRUIT_FORWARD,
        sa_type=PgEnum(RetoolExpressionType, name="expression_type_enum_4431a693", values_callable=_enum_values),
    )
    shopify_product_id: int | None = Field(default=0, sa_type=BigInteger)
    shopify_wholesale_product_id: int | None = Field(default=0, sa_type=BigInteger)
    farm: str = Field(default="", sa_type=Text)
    country: str | None = Field(default=None, sa_type=Text)
    varietal: str | None = Field(default=None, sa_type=Text)
    process: str | None = Field(default=None, sa_type=Text)
    producer_name: str = Field(default="", sa_type=Text)
    archived: bool | None = Field(default=False)
    weigh_in_entered_date: datetime | None = Field(default_factory=get_datetime_utc, sa_type=DateTime(timezone=True))
    moisture_content: float | None = Field(default=0, sa_type=Float)
    density: int | None = Field(default=0)
    reading_temperature: int | None = Field(default=0)
    moisture_reading_date: datetime | None = Field(
        default_factory=get_datetime_utc, sa_type=DateTime(timezone=True)
    )
    coffee_sync_strategies_name: str | None = Field(default="disable_sync", sa_type=Text)
    importer_exporter: str | None = Field(default=None, sa_type=Text)
    menu_label_process_varietal: str | None = Field(default=None, sa_type=Text)
    menu_label_producer: str | None = Field(default=None, sa_type=Text)
    flavor_notes: str | None = Field(default=None, sa_type=Text)
    expose_to_public: bool | None = Field(default=False)
    pourover_price: float | None = Field(default=0, sa_type=Numeric(15, 2))
    espresso_price: float | None = Field(default=0, sa_type=Numeric(15, 2))
    bag_price: float | None = Field(default=0, sa_type=Numeric(15, 2))
    bag_size_grams: int | None = Field(default=0)
    color: str | None = Field(default=None, sa_type=Text)


class RetoolMenu(SQLModel, table=True):
    __tablename__ = "menu"

    id: int | None = Field(default=None, primary_key=True)
    last_updated_at: datetime | None = Field(default_factory=get_datetime_utc, sa_type=DateTime(timezone=True))
    location: RetoolLocation | None = Field(
        default=None,
        sa_type=PgEnum(RetoolLocation, name="location_enum_71456e49", values_callable=_enum_values),
    )
    coffee_id: int | None = Field(default=0)
    selection_type: RetoolSelectionType | None = Field(
        default=None,
        sa_type=PgEnum(RetoolSelectionType, name="selection_type_enum_254ac732", values_callable=_enum_values),
    )


class RetoolRoast(SQLModel, table=True):
    __tablename__ = "roasts"

    id: int | None = Field(default=None, primary_key=True)
    coffees_id: int = Field(default=0)
    grams_in: int | None = Field(default=0)
    roasted_grams_out: int | None = Field(default=0)
    post_sorted_grams: int | None = Field(default=0)
    charge_temp: int | None = Field(default=0)
    notes: str | None = Field(default=None, sa_type=Text)
    alternative_id: int | None = Field(default=0)
    roasting_machine: RetoolRoastingMachine = Field(
        default=RetoolRoastingMachine.HQ_LORING_S7,
        sa_type=PgEnum(RetoolRoastingMachine, name="roasting_machine_enum_55e00385", values_callable=_enum_values),
    )
    roast_date: datetime | None = Field(default_factory=get_datetime_utc, sa_type=DateTime(timezone=True))
    ref: RetoolRef | None = Field(
        default=None,
        sa_type=PgEnum(RetoolRef, name="ref_enum_49300998", values_callable=_enum_values),
    )


class RetoolRoestEtl(SQLModel, table=True):
    __tablename__ = "roest_etl"

    id: int | None = Field(default=None, primary_key=True)
    batch_no: int | None = Field(default=0)
    roast_id: int | None = Field(default=0)
    bean_name: str | None = Field(default=None, sa_type=Text)
    start_timestamp: datetime | None = Field(default_factory=get_datetime_utc, sa_type=DateTime(timezone=True))
    start_weight: int | None = Field(default=0)
    machine_name: str | None = Field(default=None, sa_type=Text)
    end_weight: float | None = Field(default=0, sa_type=Float)
    drop_timestamp: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    firstcrack_timestamp: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))


class RetoolShopifyOrderInventory(SQLModel, table=True):
    __tablename__ = "shopify_orders_inventory"

    id: int | None = Field(default=None, primary_key=True)
    product_name: str | None = Field(default=None, sa_type=Text)
    product_id: int | None = Field(default=0, sa_type=BigInteger)
    variant_name: str | None = Field(default=None, sa_type=Text)
    variant_id: int | None = Field(default=0, sa_type=BigInteger)
    unfulfilled_ordered_qty: int | None = Field(default=0)
    inventory_qty: int | None = Field(default=0)
    parsed_weight_grams: int | None = Field(default=0)
    date_added: datetime | None = Field(default_factory=get_datetime_utc, sa_type=DateTime(timezone=True))
    site: RetoolOrderSiteEnum | None = Field(
        default=None,
        sa_type=PgEnum(RetoolOrderSiteEnum, name="site_enum_599cef2b", values_callable=_enum_values),
    )
    generated_sku: str | None = Field(default=None, sa_type=Text, unique=True)
    order_qty_falling_inside_cutoff: int | None = Field(default=0)


class RetoolShopifySubscriptionOrder(SQLModel, table=True):
    __tablename__ = "shopify_subscription_orders"

    id: int | None = Field(default=None, primary_key=True)
    customer_id: str | None = Field(default=None, sa_type=Text)
    customer_email: str | None = Field(default=None, sa_type=Text)
    subscription_type: str | None = Field(default=None, sa_type=Text)
    order_date: datetime | None = Field(default_factory=get_datetime_utc, sa_type=DateTime(timezone=True))
    assigned_coffees_id: int | None = Field(default=0)
    order_id: str | None = Field(default=None, sa_type=Text)
    order_name: str | None = Field(default=None, sa_type=Text)
    order_falling_inside_cutoff: bool | None = Field(default=None)
    unique_generated_index: str | None = Field(default=None, sa_type=Text, unique=True)
    qty_id: int | None = Field(default=1)
    date_inserted: datetime | None = Field(default_factory=get_datetime_utc, sa_type=DateTime(timezone=True))


# Generic message
class Message(SQLModel):
    message: str


# JSON payload containing access token
class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"


# Contents of JWT token
class TokenPayload(SQLModel):
    sub: str | None = None


class NewPassword(SQLModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)
