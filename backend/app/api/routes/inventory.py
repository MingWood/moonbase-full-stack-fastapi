import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import col, func, select

from app import crud
from app.api.deps import SessionDep, get_current_user
from app.models import (
    InventoryBulkAdjustIn,
    InventoryItem,
    InventoryItemCreate,
    InventoryItemPublic,
    InventoryItemsPublic,
    InventoryItemUpdate,
    LedgerChangeType,
    Message,
)

router = APIRouter(
    prefix="/inventory", tags=["inventory"], dependencies=[Depends(get_current_user)]
)


def _with_run_rate(item: InventoryItem, run_rate: float) -> InventoryItemPublic:
    months_remaining = (
        float(item.current_qty) / -run_rate if run_rate < 0 else None
    )
    return InventoryItemPublic.model_validate(
        item,
        update={
            "run_rate_per_month": round(run_rate, 2),
            "months_remaining": round(months_remaining, 2)
            if months_remaining is not None
            else None,
        },
    )


@router.get("/", response_model=InventoryItemsPublic)
def read_inventory_items(
    session: SessionDep, q: str | None = None, skip: int = 0, limit: int = 100
) -> Any:
    """
    Retrieve inventory items, optionally filtered by a name search (`q`).
    """
    statement = select(InventoryItem)
    count_statement = select(func.count()).select_from(InventoryItem)
    if q:
        name_filter = col(InventoryItem.name).ilike(f"%{q}%")
        statement = statement.where(name_filter)
        count_statement = count_statement.where(name_filter)

    count = session.exec(count_statement).one()
    statement = (
        statement.order_by(col(InventoryItem.name)).offset(skip).limit(limit)
    )
    items = session.exec(statement).all()
    run_rates = crud.compute_run_rates(
        session=session, item_ids=[item.id for item in items]
    )
    data = [_with_run_rate(item, run_rates.get(item.id, 0.0)) for item in items]
    return InventoryItemsPublic(data=data, count=count)


@router.get("/{id}", response_model=InventoryItemPublic)
def read_inventory_item(session: SessionDep, id: uuid.UUID) -> Any:
    """
    Get an inventory item by ID.
    """
    item = session.get(InventoryItem, id)
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    run_rates = crud.compute_run_rates(session=session, item_ids=[item.id])
    return _with_run_rate(item, run_rates.get(item.id, 0.0))


@router.post("/", response_model=InventoryItemPublic)
def create_inventory_item(session: SessionDep, item_in: InventoryItemCreate) -> Any:
    """
    Create a new inventory item. If it starts with stock on hand, an initial
    "addition" ledger entry is written alongside it.
    """
    return crud.create_inventory_item(session=session, item_in=item_in)


@router.put("/{id}", response_model=InventoryItemPublic)
def update_inventory_item(
    session: SessionDep, id: uuid.UUID, item_in: InventoryItemUpdate
) -> Any:
    """
    Update an inventory item's fields. If `current_qty` differs from the
    stored value, the delta is recorded as an "adjustment" ledger entry.
    Metadata-only edits do not touch the ledger.
    """
    item = session.get(InventoryItem, id)
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    update_dict = item_in.model_dump(exclude_unset=True)
    new_qty = update_dict.pop("current_qty", None)
    item.sqlmodel_update(update_dict)

    current_qty = float(item.current_qty)
    if new_qty is not None and new_qty != current_qty:
        try:
            crud.apply_inventory_qty_change(
                session=session,
                item=item,
                quantity_change=new_qty - current_qty,
                change_type=LedgerChangeType.ADJUSTMENT,
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
    else:
        session.add(item)

    session.commit()
    session.refresh(item)
    return item


@router.delete("/{id}")
def delete_inventory_item(session: SessionDep, id: uuid.UUID) -> Message:
    """
    Delete an inventory item. Its ledger history is kept for the record
    (inventory_item_id is set to NULL on those rows, not deleted).
    """
    item = session.get(InventoryItem, id)
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    session.delete(item)
    session.commit()
    return Message(message="Inventory item deleted successfully")


@router.post("/bulk-adjust", response_model=InventoryItemsPublic)
def bulk_adjust_inventory(
    session: SessionDep, body: InventoryBulkAdjustIn
) -> Any:
    """
    Apply a batch of additions/subtractions atomically: either all
    adjustments succeed, or none are applied.
    """
    updated_items: dict[uuid.UUID, InventoryItem] = {}
    for adjustment in body.adjustments:
        if adjustment.change_type not in (
            LedgerChangeType.ADDITION,
            LedgerChangeType.SUBTRACTION,
        ):
            raise HTTPException(
                status_code=400,
                detail="change_type must be 'addition' or 'subtraction'",
            )
        item = session.get(InventoryItem, adjustment.inventory_item_id)
        if not item:
            raise HTTPException(
                status_code=404,
                detail=f"Inventory item {adjustment.inventory_item_id} not found",
            )
        signed_qty = (
            adjustment.quantity
            if adjustment.change_type == LedgerChangeType.ADDITION
            else -adjustment.quantity
        )
        try:
            crud.apply_inventory_qty_change(
                session=session,
                item=item,
                quantity_change=signed_qty,
                change_type=adjustment.change_type,
                note=adjustment.note,
            )
        except ValueError as exc:
            session.rollback()
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        updated_items[item.id] = item

    session.commit()
    for item in updated_items.values():
        session.refresh(item)
    return InventoryItemsPublic(
        data=list(updated_items.values()), count=len(updated_items)
    )
