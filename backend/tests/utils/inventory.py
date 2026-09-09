from sqlmodel import Session

from app import crud
from app.models import (
    InventoryCategory,
    InventoryItem,
    InventoryItemCreate,
    InventoryUnit,
)
from tests.utils.utils import random_lower_string


def create_random_inventory_item(
    db: Session, *, current_qty: float = 10
) -> InventoryItem:
    item_in = InventoryItemCreate(
        name=random_lower_string(),
        category=InventoryCategory.GREEN_COFFEE,
        unit=InventoryUnit.LBS,
        current_qty=current_qty,
    )
    return crud.create_inventory_item(session=db, item_in=item_in)
