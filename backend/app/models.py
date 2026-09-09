import time
import uuid
from datetime import UTC, datetime
from enum import StrEnum

from pydantic import EmailStr
from sqlalchemy import BigInteger, DateTime, Numeric, String
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


class CuppingsPublic(SQLModel):
    data: list[CuppingPublic]
    count: int


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
