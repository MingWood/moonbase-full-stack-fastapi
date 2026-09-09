import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.core.config import settings
from app.models import LedgerChangeType, LedgerEntry
from tests.utils.inventory import create_random_inventory_item


def test_create_inventory_item_writes_initial_ledger_entry(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    data = {
        "name": "Ethiopia Yirgacheffe",
        "category": "green_coffee",
        "unit": "lbs",
        "current_qty": 50,
    }
    response = client.post(
        f"{settings.API_V1_STR}/inventory/",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["name"] == data["name"]
    assert content["current_qty"] == data["current_qty"]
    assert "last_updated_ms" in content

    ledger_entries = db.exec(
        select(LedgerEntry).where(
            LedgerEntry.inventory_item_id == uuid.UUID(content["id"])
        )
    ).all()
    assert len(ledger_entries) == 1
    assert ledger_entries[0].change_type == LedgerChangeType.ADDITION
    assert ledger_entries[0].quantity_change == 50
    assert ledger_entries[0].resulting_qty == 50


def test_update_metadata_only_does_not_write_ledger_entry(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    # current_qty=0 so creation itself writes no "initial stock" entry,
    # keeping this test's baseline ledger count at zero.
    item = create_random_inventory_item(db, current_qty=0)
    response = client.put(
        f"{settings.API_V1_STR}/inventory/{item.id}",
        headers=superuser_token_headers,
        json={"supplier": "Acme Roasters"},
    )
    assert response.status_code == 200
    content = response.json()
    assert content["supplier"] == "Acme Roasters"
    assert content["current_qty"] == 0

    ledger_entries = db.exec(
        select(LedgerEntry).where(LedgerEntry.inventory_item_id == item.id)
    ).all()
    assert len(ledger_entries) == 0


def test_update_qty_writes_adjustment_ledger_entry(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    item = create_random_inventory_item(db, current_qty=20)
    response = client.put(
        f"{settings.API_V1_STR}/inventory/{item.id}",
        headers=superuser_token_headers,
        json={"current_qty": 15},
    )
    assert response.status_code == 200
    content = response.json()
    assert content["current_qty"] == 15

    ledger_entries = db.exec(
        select(LedgerEntry)
        .where(LedgerEntry.inventory_item_id == item.id)
        .where(LedgerEntry.change_type == LedgerChangeType.ADJUSTMENT)
    ).all()
    assert len(ledger_entries) == 1
    assert ledger_entries[0].quantity_change == -5
    assert ledger_entries[0].resulting_qty == 15


def test_bulk_adjust_happy_path_is_atomic(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    item_a = create_random_inventory_item(db, current_qty=10)
    item_b = create_random_inventory_item(db, current_qty=10)

    response = client.post(
        f"{settings.API_V1_STR}/inventory/bulk-adjust",
        headers=superuser_token_headers,
        json={
            "adjustments": [
                {
                    "inventory_item_id": str(item_a.id),
                    "change_type": "addition",
                    "quantity": 5,
                },
                {
                    "inventory_item_id": str(item_b.id),
                    "change_type": "subtraction",
                    "quantity": 3,
                },
            ]
        },
    )
    assert response.status_code == 200
    content = response.json()
    by_id = {row["id"]: row for row in content["data"]}
    assert by_id[str(item_a.id)]["current_qty"] == 15
    assert by_id[str(item_b.id)]["current_qty"] == 7

    db.refresh(item_a)
    db.refresh(item_b)
    assert item_a.current_qty == 15
    assert item_b.current_qty == 7


def test_bulk_adjust_rejects_when_would_go_negative(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    item_a = create_random_inventory_item(db, current_qty=10)
    item_b = create_random_inventory_item(db, current_qty=2)

    response = client.post(
        f"{settings.API_V1_STR}/inventory/bulk-adjust",
        headers=superuser_token_headers,
        json={
            "adjustments": [
                {
                    "inventory_item_id": str(item_a.id),
                    "change_type": "addition",
                    "quantity": 5,
                },
                {
                    "inventory_item_id": str(item_b.id),
                    "change_type": "subtraction",
                    "quantity": 100,
                },
            ]
        },
    )
    assert response.status_code == 400

    # The whole batch must be rejected - item_a's addition should not apply either.
    db.refresh(item_a)
    db.refresh(item_b)
    assert item_a.current_qty == 10
    assert item_b.current_qty == 2
