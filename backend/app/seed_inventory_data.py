import logging

from sqlmodel import Session, select

from app.core.db import engine
from app.models import InventoryItem, LedgerChangeType, LedgerEntry

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# (location, address, name, category, supplier, notes, unit, current_qty)
INITIAL_INVENTORY: list[tuple[str, str, str, str, str | None, str | None, str, float]] = [
    ("Office", "175 Lewis Rd", "32 gallon Lavex Commercial Trash Can", "supplies", None, None, "units", 1),
    ("Office", "175 Lewis Rd", "Square Card Table", "supplies", None, None, "units", 1),
    ("Office", "175 Lewis Rd", "Zebra ZP450 Label Printer", "supplies", None, None, "units", 1),
    ("Office", "175 Lewis Rd", "Power Tree", "supplies", None, None, "units", 1),
    ("Office", "175 Lewis Rd", "Lifetime 6ft Folding Table", "supplies", None, None, "units", 1),
    ("Office", "175 Lewis Rd", "4ft folding table", "supplies", None, None, "units", 1),
    ("Office", "175 Lewis Rd", '60" Rolling Rack', "supplies", None, None, "units", 1),
    ("Office", "175 Lewis Rd", "NEEWER Photography Light", "supplies", None, None, "units", 1),
    ("Office", "175 Lewis Rd", "Backdrops", "supplies", None, None, "units", 4),
    ("Office", "175 Lewis Rd", "Monochrome Hoodies", "clothing", None, None, "units", 57),
    ("Office", "175 Lewis Rd", "Navy Crew", "clothing", None, None, "units", 30),
    ("Office", "175 Lewis Rd", "Gray Crew", "clothing", None, None, "units", 28),
    ("Office", "175 Lewis Rd", "Beige TShirt", "clothing", None, None, "units", 39),
    ("Office", "175 Lewis Rd", "Gray TShirt", "clothing", None, None, "units", 18),
    ("Office", "175 Lewis Rd", "Navy TShirt", "clothing", None, None, "units", 12),
    ("Office", "175 Lewis Rd", "APAX Lab (Bigger one)", "merch", "Apax", None, "units", 2),
    ("Office", "175 Lewis Rd", "APAX Lab (smaller one)", "merch", "Apax", None, "units", 5),
    ("Office", "175 Lewis Rd", "MeloDrip", "merch", "MeloDrip", None, "units", 3),
    ("Office", "175 Lewis Rd", "Sibarist High Cell 58mm 25u", "merch", "Sibarist", None, "units", 2),
    ("Pallet 18", "175 Lewis Rd", "Retail Blue 1kg Bags - 500pcs per box -14.9kg per box", "packaging", "MTPak", None, "boxes", 4),
    ("Pallet 18", "175 Lewis Rd", "MTPak 125g Nova Boxes - 1000pcs per box - 13.5kg per box", "packaging", "MTPak", None, "boxes", 3),
    ("Pallet 18", "175 Lewis Rd", "MTPak Gray 8oz Nova Boxes - 700pcs per box - 16.5kg per box", "packaging", "MTPak", None, "boxes", 3),
    ("Pallet 19", "175 Lewis Rd", "MTPak Blue 8oz Nova Boxes - 650pcs per box - 15.5kg per box", "packaging", "MTPak", None, "boxes", 2),
    ("Pallet 19", "175 Lewis Rd", "MTPak Gray 8oz Nova Boxes - 800pcs per box - 20kg per box", "packaging", "MTPak", None, "boxes", 1),
    ("Pallet 19", "175 Lewis Rd", "MTPak 125g Nova Boxes - 1000pcs per box - 13.5kg per box", "packaging", "MTPak", None, "boxes", 4),
    ("Pallet 20", "175 Lewis Rd", "MTPak Retail Blue 1kg Bags - 500pcs per box -14.9kg per box", "packaging", "MTPak", None, "boxes", 5),
    ("Pallet 20", "175 Lewis Rd", "MTPak 12oz Blue Retail Bags - 10000pcs per box - 16.2kg per box", "packaging", "MTPak", None, "boxes", 2),
    ("Pallet 20", "175 Lewis Rd", "MTPak 12oz Blue Retail Bags - 385 pcs per box - 6.2kg per box", "packaging", "MTPak", None, "boxes", 1),
    ("Pallet 20", "175 Lewis Rd", "MTPak Blank 8oz Bags - 1000pcs per box - 13.7kg per box", "packaging", "MTPak", None, "boxes", 1),
    ("Pallet 20", "175 Lewis Rd", "ClearBags - 50x14 bags", "packaging", None, None, "boxes", 1),
    ("Pallet 21", "175 Lewis Rd", "Bormioli Iced Latte Barshine Glasses - 1 case", "glassware", None, None, "boxes", 1),
    ("Pallet 22", "175 Lewis Rd", "Chris Adam CPE Lagers & Cream Glasses", "glassware", None, None, "boxes", 24),
    ("Pallet 22", "175 Lewis Rd", "Bormioli Cassiopea Glasses - Set of 4", "glassware", None, None, "boxes", 2),
    ("Pallet 22", "175 Lewis Rd", "Coupe Glass - Box of 4", "glassware", None, None, "boxes", 1),
    ("Pallet 22", "175 Lewis Rd", "Pink House Sarsaparilla Bottles", "boh_ingredients", None, None, "bottles", 10),
    ("Pallet 23", "175 Lewis Rd", "Iced Lids", "to_go_serveware", "Karat", "1000pcs per Box - 9.7lb per Box", "boxes", 6),
    ("Pallet 24", "175 Lewis Rd", "7oz Customer Cups", "to_go_serveware", "Karat", "1000pcs per box - 15.65lb per box", "boxes", 8),
    ("Pallet 24", "175 Lewis Rd", "Iced Latte Cups", "to_go_serveware", "Karat", "1000pcs per box - 27.5lbs per box", "boxes", 6),
    ("Pallet 25", "175 Lewis Rd", "Shiny 125g Nova Boxes", "packaging", None, None, "boxes", 1),
    ("Pallet 26", "175 Lewis Rd", "Sibarist B3 Cone - 25", "merch", "Sibarist", None, "units", 5),
    ("Pallet 26", "175 Lewis Rd", "Sibarist B3 Cone - 100", "merch", "Sibarist", None, "units", 5),
    ("Pallet 26", "175 Lewis Rd", "Sibarist Fast Cone.- 25", "merch", "Sibarist", None, "units", 5),
    ("Pallet 26", "175 Lewis Rd", "Sibarist Fast Cone - 100", "merch", "Sibarist", None, "units", 5),
    ("Pallet 26", "175 Lewis Rd", "Sibarist B3 Flat - 25", "merch", "Sibarist", None, "units", 4),
    ("Pallet 26", "175 Lewis Rd", "Sibarist B3 Flat - 100", "merch", "Sibarist", None, "units", 1),
    ("Pallet 26", "175 Lewis Rd", "Sibarist Cone Flat - 25", "merch", "Sibarist", None, "units", 3),
    ("Pallet 26", "175 Lewis Rd", "Sibarist Cone Flat - 100", "merch", "Sibarist", None, "units", 1),
    ("Pallet 26", "175 Lewis Rd", "Sibarist 47mm - 1000u", "merch", "Sibarist", None, "units", 1),
    ("Pallet 26", "175 Lewis Rd", "Apax - Big one", "merch", "Apax", None, "units", 6),
    ("Pallet 26", "175 Lewis Rd", "Origami 2-cup cone Filters - 100pcs", "merch", None, None, "units", 20),
    ("Pallet 26", "175 Lewis Rd", "Hario Neos 01", "merch", None, None, "units", 7),
    ("Pallet 26", "175 Lewis Rd", "Blank 10oz Cups", "to_go_serveware", None, "1000pcs", "boxes", 1),
    ("Pallet 27", "175 Lewis Rd", "MTPak Hot 10oz Latte Cus - 500pcs per box - 9kg per box", "to_go_serveware", "MTPak", None, "boxes", 7),
    ("Pallet 27", "175 Lewis Rd", "Choice Small Brown Shopping Bag - 250 per case", "to_go_serveware", None, None, "boxes", 1),
    ("Pallet 28", "175 Lewis Rd", "MTPak Black lids - 1000pcs per box - 4kg per box", "to_go_serveware", "MTPak", None, "boxes", 34),
    ("Floating", "175 Lewis Rd", "Espresso Cups", "to_go_serveware", "MTPak", "1000pcs per Box - 4.2kg per box", "boxes", 9),
    ("Floating", "175 Lewis Rd", "6oz Cortado Cups", "to_go_serveware", "MTPak", "1000pcs per box - 5.1kg per box", "boxes", 5),
    ("Pallet 29", "175 Lewis Rd", "Gray 8oz Nova Boxes", "packaging", "MTPak", "700pcs per box - 20kg per box", "boxes", 1),
    ("Rack 1", "175 Lewis Rd", "Cortado Lids", "to_go_serveware", "MTPak", "1000pcs per box - 2.6kg per box", "boxes", 7),
    ("Rack 1", "175 Lewis Rd", "Espresso Lids", "to_go_serveware", "MTPak", "2000pcs per box - 4kg per box", "boxes", 6),
    ("Rack 2", "175 Lewis Rd", "125g Nova Bags", "packaging", "MTPak", "1500pcs per box - 14.8kg per box", "boxes", 2),
    ("Rack 2", "175 Lewis Rd", "Blank 8oz Bags", "packaging", "MTPak", "1000pcs per box - 13.7kg per box", "boxes", 3),
    ("Rack 2", "175 Lewis Rd", "Fellow Rocky Tumbler - Case of 15 per box", "glassware", None, None, "boxes", 4),
    ("Rack 2", "175 Lewis Rd", "TH3 Filters", "merch", None, None, "units", 5),
    ("Rack 2", "175 Lewis Rd", "T90 Filters", "merch", None, None, "units", 4),
    ("Rack 2", "175 Lewis Rd", "Apax Small", "merch", "Apax", None, "units", 5),
    ("Rack 2", "175 Lewis Rd", "5lb Retail Bags", "packaging", "MTPak", "300pcs per Box - 16kg per box", "boxes", 4),
]


def seed_inventory(session: Session) -> None:
    # One query for all existing items instead of one per row, and every
    # new item/ledger row is staged with session.add() and flushed/committed
    # exactly once at the end - so this whole seed uses a single connection
    # (and a single IAM auth token), not one per row.
    existing_items = session.exec(select(InventoryItem)).all()
    by_name_and_location = {(i.name, i.location): i for i in existing_items}
    # Rows created before the location column existed have location=None;
    # treat those as matching any seed location for the same name.
    by_name_only = {i.name: i for i in existing_items if i.location is None}

    created, skipped = 0, 0
    for location, address, name, category, supplier, notes, unit, qty in INITIAL_INVENTORY:
        existing = by_name_and_location.get((name, location)) or by_name_only.get(name)
        if existing:
            skipped += 1
            if (
                existing.category != category
                or existing.unit != unit
                or existing.current_qty != qty
            ):
                logger.warning(
                    "Skipping existing item %r at %r - stored values differ "
                    "from the seed data (category=%s/%s, unit=%s/%s, "
                    "qty=%s/%s); update it manually if the seed data is the "
                    "source of truth.",
                    name,
                    location,
                    existing.category,
                    category,
                    existing.unit,
                    unit,
                    existing.current_qty,
                    qty,
                )
            continue

        new_item = InventoryItem(
            name=name,
            category=category,  # type: ignore[arg-type]
            unit=unit,  # type: ignore[arg-type]
            current_qty=qty,
            supplier=supplier,
            notes=notes,
            location=location,
            address=address,
        )
        session.add(new_item)
        if new_item.current_qty:
            session.add(
                LedgerEntry(
                    inventory_item_id=new_item.id,
                    item_name=new_item.name,
                    change_type=LedgerChangeType.ADDITION,
                    quantity_change=new_item.current_qty,
                    resulting_qty=new_item.current_qty,
                    note="Initial stock",
                )
            )
        created += 1

    session.commit()
    logger.info("Inventory seed: %d created, %d already present (skipped)", created, skipped)


def main() -> None:
    logger.info("Seeding initial inventory data")
    with Session(engine) as session:
        seed_inventory(session)
    logger.info("Inventory seed complete")


if __name__ == "__main__":
    main()
