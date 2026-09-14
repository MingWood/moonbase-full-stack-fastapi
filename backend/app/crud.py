import uuid
from typing import Any

from sqlmodel import Session, col, func, select

from app.core.security import get_password_hash, verify_password
from app.models import (
    Cupping,
    InventoryItem,
    InventoryItemCreate,
    Item,
    ItemCreate,
    LedgerChangeType,
    LedgerEntry,
    RetoolCoffee,
    RetoolRoast,
    RetoolRoestEtl,
    RoastingMachine,
    User,
    UserCreate,
    UserUpdate,
    now_epoch_ms,
)

RUN_RATE_WINDOW_DAYS = 60


def create_user(*, session: Session, user_create: UserCreate) -> User:
    db_obj = User.model_validate(
        user_create, update={"hashed_password": get_password_hash(user_create.password)}
    )
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def update_user(*, session: Session, db_user: User, user_in: UserUpdate) -> Any:
    user_data = user_in.model_dump(exclude_unset=True)
    extra_data = {}
    if "password" in user_data:
        password = user_data["password"]
        hashed_password = get_password_hash(password)
        extra_data["hashed_password"] = hashed_password
    db_user.sqlmodel_update(user_data, update=extra_data)
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user


def get_user_by_email(*, session: Session, email: str) -> User | None:
    statement = select(User).where(User.email == email)
    session_user = session.exec(statement).first()
    return session_user


# Dummy hash to use for timing attack prevention when user is not found
# This is an Argon2 hash of a random password, used to ensure constant-time comparison
DUMMY_HASH = "$argon2id$v=19$m=65536,t=3,p=4$MjQyZWE1MzBjYjJlZTI0Yw$YTU4NGM5ZTZmYjE2NzZlZjY0ZWY3ZGRkY2U2OWFjNjk"


def authenticate(*, session: Session, email: str, password: str) -> User | None:
    db_user = get_user_by_email(session=session, email=email)
    if not db_user:
        # Prevent timing attacks by running password verification even when user doesn't exist
        # This ensures the response time is similar whether or not the email exists
        verify_password(password, DUMMY_HASH)
        return None
    verified, updated_password_hash = verify_password(password, db_user.hashed_password)
    if not verified:
        return None
    if updated_password_hash:
        db_user.hashed_password = updated_password_hash
        session.add(db_user)
        session.commit()
        session.refresh(db_user)
    return db_user


def create_item(*, session: Session, item_in: ItemCreate, owner_id: uuid.UUID) -> Item:
    db_item = Item.model_validate(item_in, update={"owner_id": owner_id})
    session.add(db_item)
    session.commit()
    session.refresh(db_item)
    return db_item


def create_inventory_item(
    *, session: Session, item_in: InventoryItemCreate
) -> InventoryItem:
    db_item = InventoryItem.model_validate(item_in)
    session.add(db_item)
    session.flush()
    if db_item.current_qty:
        session.add(
            LedgerEntry(
                inventory_item_id=db_item.id,
                item_name=db_item.name,
                change_type=LedgerChangeType.ADDITION,
                quantity_change=db_item.current_qty,
                resulting_qty=db_item.current_qty,
                note="Initial stock",
            )
        )
    session.commit()
    session.refresh(db_item)
    return db_item


def compute_run_rates(
    *, session: Session, item_ids: list[uuid.UUID]
) -> dict[uuid.UUID, float]:
    """Average monthly net change in quantity per item, from ledger entries
    in the trailing 60 days (~2 months). Negative means net consumption.

    Only "addition"/"subtraction" entries count (the Inventory Update page).
    "adjustment" entries (manual corrections made inline on the Full
    Inventory table) are excluded so a recount/typo fix doesn't skew the
    estimate the same way real stock movement would.
    """
    if not item_ids:
        return {}
    cutoff_ms = now_epoch_ms() - RUN_RATE_WINDOW_DAYS * 24 * 60 * 60 * 1000
    statement = (
        select(LedgerEntry.inventory_item_id, func.sum(LedgerEntry.quantity_change))
        .where(col(LedgerEntry.inventory_item_id).in_(item_ids))
        .where(LedgerEntry.created_at_ms >= cutoff_ms)
        .where(
            col(LedgerEntry.change_type).in_(
                [LedgerChangeType.ADDITION, LedgerChangeType.SUBTRACTION]
            )
        )
        .group_by(col(LedgerEntry.inventory_item_id))
    )
    results = session.exec(statement).all()
    return {item_id: float(net_change) / 2.0 for item_id, net_change in results}


def resolve_cupping_names(
    *, session: Session, cuppings: list[Cupping]
) -> dict[uuid.UUID, str | None]:
    """Display name for cuppings that have no manual_name, derived from the
    roast that was cupped.

    "sagvag" roasts are matched by roast_id against roest_etl.batch_no,
    using its bean_name. "hq_loring" roasts are matched by roast_id against
    roasts.id, then to coffees.name via roasts.coffees_id. Any other
    roasting_machine (or no match in the source tables) resolves to None -
    these tables are a one-time copy from Retool for reference, not a live
    sync, so older/unrelated roast_ids may simply not be present.
    """
    unresolved = [c for c in cuppings if not c.manual_name]
    sagvag_ids = {
        c.roast_id for c in unresolved if c.roasting_machine == RoastingMachine.SAGVAG
    }
    loring_ids = {
        c.roast_id
        for c in unresolved
        if c.roasting_machine == RoastingMachine.HQ_LORING
    }

    bean_names: dict[int, str | None] = {}
    if sagvag_ids:
        rows = session.exec(
            select(RetoolRoestEtl.batch_no, RetoolRoestEtl.bean_name).where(
                col(RetoolRoestEtl.batch_no).in_(sagvag_ids),
                RetoolRoestEtl.machine_name == "sagvag",
            )
        ).all()
        bean_names = dict(rows)

    coffee_names: dict[int, str | None] = {}
    if loring_ids:
        rows = session.exec(
            select(RetoolRoast.id, RetoolCoffee.name)
            .join(RetoolCoffee, col(RetoolCoffee.id) == RetoolRoast.coffees_id)
            .where(col(RetoolRoast.id).in_(loring_ids))
        ).all()
        coffee_names = dict(rows)

    resolved: dict[uuid.UUID, str | None] = {}
    for c in unresolved:
        if c.roasting_machine == RoastingMachine.SAGVAG:
            resolved[c.id] = bean_names.get(c.roast_id)
        elif c.roasting_machine == RoastingMachine.HQ_LORING:
            resolved[c.id] = coffee_names.get(c.roast_id)
    return resolved


def apply_inventory_qty_change(
    *,
    session: Session,
    item: InventoryItem,
    quantity_change: float,
    change_type: LedgerChangeType,
    note: str | None = None,
) -> LedgerEntry:
    """Updates the item's qty/timestamp and stages a matching ledger row.

    Does not commit - the caller controls the transaction boundary so multiple
    changes (e.g. a bulk adjustment) can be applied atomically.
    """
    # current_qty round-trips through a Postgres NUMERIC column as Decimal;
    # normalize to float before arithmetic with the (float) quantity_change.
    new_qty = float(item.current_qty) + quantity_change
    if new_qty < 0:
        raise ValueError(f"Insufficient stock for '{item.name}'")
    item.current_qty = new_qty
    item.last_updated_ms = now_epoch_ms()
    session.add(item)
    ledger_entry = LedgerEntry(
        inventory_item_id=item.id,
        item_name=item.name,
        change_type=change_type,
        quantity_change=quantity_change,
        resulting_qty=new_qty,
        note=note,
    )
    session.add(ledger_entry)
    return ledger_entry
