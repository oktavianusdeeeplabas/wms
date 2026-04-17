"""Seed mock data into PostgreSQL database."""
import asyncio
import json
import sys
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import NullPool

load_dotenv()

DATABASE_URL = "postgresql+asyncpg://postgres:ilovek1m@127.0.0.1:5432/wms"
MOCK_DIR = Path(__file__).parent / "mock_data"

_DT_FORMATS = ["%Y-%m-%d %H:%M:%S", "%Y-%m-%d"]


def load(filename: str) -> list:
    with open(MOCK_DIR / filename) as f:
        return json.load(f)


def parse_dt(value: str | None) -> datetime | None:
    """Parse a datetime/date string to a datetime object, or return None."""
    if not value:
        return None
    for fmt in _DT_FORMATS:
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue
    return None


def nullify_zeros(record: dict, fields: list) -> dict:
    """Convert 0 values to None for optional FK fields."""
    for field in fields:
        if record.get(field) == 0:
            record[field] = None
    return record


def cast_dt_fields(record: dict, fields: list) -> dict:
    """Parse string datetime fields into datetime objects in-place."""
    for field in fields:
        record[field] = parse_dt(record.get(field))
    return record


async def seed(session: AsyncSession):
    # ── 1. branches ──────────────────────────────────────────────────────────
    branches = load("branches.json")
    for r in branches:
        cast_dt_fields(r, ["created_at"])
        await session.execute(
            text("""
                INSERT INTO branches (name, code, address, contact_name, phone, email, status, created_at)
                VALUES (:name, :code, :address, :contact_name, :phone, :email, :status, :created_at)
            """),
            r,
        )
    print(f"  OK branches: {len(branches)} rows")

    # ── 2. suppliers ─────────────────────────────────────────────────────────
    suppliers = load("suppliers.json")
    for r in suppliers:
        # contact_name in JSON → contact_person in model
        r["contact_person"] = r.pop("contact_name", None)
        r.setdefault("created_at", None)
        # created_at is String in suppliers model, keep as-is
        await session.execute(
            text("""
                INSERT INTO suppliers (name, code, contact_person, phone, email, address, status, created_at)
                VALUES (:name, :code, :contact_person, :phone, :email, :address, :status, :created_at)
            """),
            r,
        )
    print(f"  OK suppliers: {len(suppliers)} rows")

    # ── 3. warehouses ────────────────────────────────────────────────────────
    warehouses = load("warehouses.json")
    for r in warehouses:
        r.setdefault("branch_id", None)
        cast_dt_fields(r, ["created_at"])
        await session.execute(
            text("""
                INSERT INTO warehouses (name, code, address, branch_id, status, created_at)
                VALUES (:name, :code, :address, :branch_id, :status, :created_at)
            """),
            r,
        )
    print(f"  OK warehouses: {len(warehouses)} rows")

    # ── 4. zones ─────────────────────────────────────────────────────────────
    zones = load("zones.json")
    for r in zones:
        await session.execute(
            text("""
                INSERT INTO zones (warehouse_id, name, code, temperature_type, status)
                VALUES (:warehouse_id, :name, :code, :temperature_type, :status)
            """),
            r,
        )
    print(f"  OK zones: {len(zones)} rows")

    # ── 5. bins ──────────────────────────────────────────────────────────────
    bins = load("bins.json")
    for r in bins:
        await session.execute(
            text("""
                INSERT INTO bins (zone_id, name, code, capacity, status)
                VALUES (:zone_id, :name, :code, :capacity, :status)
            """),
            r,
        )
    print(f"  OK bins: {len(bins)} rows")

    # ── 6. products ──────────────────────────────────────────────────────────
    products = load("products.json")
    for r in products:
        # unit in JSON → uom in model; cost_price not in model
        r["uom"] = r.pop("unit", None)
        r.pop("cost_price", None)
        r.setdefault("temperature_class", None)
        r.setdefault("shelf_life_days", None)
        r.setdefault("is_perishable", None)
        await session.execute(
            text("""
                INSERT INTO products
                    (name, sku, category, uom, temperature_class, shelf_life_days,
                     min_stock, max_stock, reorder_point, is_perishable, status)
                VALUES
                    (:name, :sku, :category, :uom, :temperature_class, :shelf_life_days,
                     :min_stock, :max_stock, :reorder_point, :is_perishable, :status)
            """),
            r,
        )
    print(f"  OK products: {len(products)} rows")

    # ── 7. bom_recipes ───────────────────────────────────────────────────────
    bom_recipes = load("bom_recipes.json")
    for r in bom_recipes:
        cast_dt_fields(r, ["created_at"])
        await session.execute(
            text("""
                INSERT INTO bom_recipes
                    (name, code, product_id, category, yield_quantity, yield_unit,
                     prep_time_minutes, cook_time_minutes, version, status, notes, created_at)
                VALUES
                    (:name, :code, :product_id, :category, :yield_quantity, :yield_unit,
                     :prep_time_minutes, :cook_time_minutes, :version, :status, :notes, :created_at)
            """),
            r,
        )
    print(f"  OK bom_recipes: {len(bom_recipes)} rows")

    # ── 8. bom_lines ─────────────────────────────────────────────────────────
    bom_lines = load("bom_lines.json")
    for r in bom_lines:
        await session.execute(
            text("""
                INSERT INTO bom_lines
                    (recipe_id, product_id, quantity, unit, is_optional,
                     substitution_allowed, wastage_factor, notes)
                VALUES
                    (:recipe_id, :product_id, :quantity, :unit, :is_optional,
                     :substitution_allowed, :wastage_factor, :notes)
            """),
            r,
        )
    print(f"  OK bom_lines: {len(bom_lines)} rows")

    # ── 9. receiving_documents ───────────────────────────────────────────────
    receiving_documents = load("receiving_documents.json")
    for r in receiving_documents:
        await session.execute(
            text("""
                INSERT INTO receiving_documents
                    (document_number, supplier_id, warehouse_id, status,
                     expected_date, received_date, notes, created_at)
                VALUES
                    (:document_number, :supplier_id, :warehouse_id, :status,
                     :expected_date, :received_date, :notes, :created_at)
            """),
            r,
        )
    print(f"  OK receiving_documents: {len(receiving_documents)} rows")

    # ── 10. receiving_lines ──────────────────────────────────────────────────
    receiving_lines = load("receiving_lines.json")
    for r in receiving_lines:
        await session.execute(
            text("""
                INSERT INTO receiving_lines
                    (receiving_document_id, product_id, expected_quantity,
                     received_quantity, lot_number, expiry_date, qc_status, notes)
                VALUES
                    (:receiving_document_id, :product_id, :expected_quantity,
                     :received_quantity, :lot_number, :expiry_date, :qc_status, :notes)
            """),
            r,
        )
    print(f"  OK receiving_lines: {len(receiving_lines)} rows")

    # ── 11. inventory_lots ───────────────────────────────────────────────────
    inventory_lots = load("inventory_lots.json")
    for r in inventory_lots:
        await session.execute(
            text("""
                INSERT INTO inventory_lots
                    (product_id, lot_number, batch_number, zone_id, bin_id,
                     quantity, received_date, expiry_date, status, supplier_id, cost_per_unit)
                VALUES
                    (:product_id, :lot_number, :batch_number, :zone_id, :bin_id,
                     :quantity, :received_date, :expiry_date, :status, :supplier_id, :cost_per_unit)
            """),
            r,
        )
    print(f"  OK inventory_lots: {len(inventory_lots)} rows")

    # ── 12. stock_movements ──────────────────────────────────────────────────
    stock_movements = load("stock_movements.json")
    for r in stock_movements:
        # Convert 0 to None for optional FK zone/bin fields
        nullify_zeros(r, ["from_zone_id", "from_bin_id", "to_zone_id", "to_bin_id"])
        await session.execute(
            text("""
                INSERT INTO stock_movements
                    (product_id, lot_id, movement_type, quantity, from_zone_id, from_bin_id,
                     to_zone_id, to_bin_id, reference_type, reference_id, notes, created_at)
                VALUES
                    (:product_id, :lot_id, :movement_type, :quantity, :from_zone_id, :from_bin_id,
                     :to_zone_id, :to_bin_id, :reference_type, :reference_id, :notes, :created_at)
            """),
            r,
        )
    print(f"  OK stock_movements: {len(stock_movements)} rows")

    # ── 13. stock_transfers ──────────────────────────────────────────────────
    stock_transfers = load("stock_transfers.json")
    for r in stock_transfers:
        r.setdefault("shipped_date", None)
        r.setdefault("received_date", None)
        cast_dt_fields(r, ["requested_date", "shipped_date", "received_date", "created_at"])
        await session.execute(
            text("""
                INSERT INTO stock_transfers
                    (transfer_number, from_warehouse_id, to_warehouse_id, from_branch_id,
                     to_branch_id, product_id, quantity, lot_number, status,
                     requested_date, shipped_date, received_date, notes, created_at)
                VALUES
                    (:transfer_number, :from_warehouse_id, :to_warehouse_id, :from_branch_id,
                     :to_branch_id, :product_id, :quantity, :lot_number, :status,
                     :requested_date, :shipped_date, :received_date, :notes, :created_at)
            """),
            r,
        )
    print(f"  OK stock_transfers: {len(stock_transfers)} rows")

    await session.commit()


async def main():
    engine = create_async_engine(DATABASE_URL, poolclass=NullPool, echo=False)
    session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    print("Seeding mock data into PostgreSQL...")
    async with session_maker() as session:
        try:
            await seed(session)
            print("\nDone! All mock data seeded successfully.")
        except Exception as e:
            await session.rollback()
            print(f"\nError: {e}", file=sys.stderr)
            raise
    await engine.dispose()


if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
