"""Sync bundled demo seed data into the configured database."""
import asyncio
import sys

import models.product_lookups  # noqa: F401 - register lookup tables with SQLAlchemy metadata
from services.database import close_database, initialize_database
from services.mock_data import sync_demo_data


async def main():
    print("Syncing demo seed data into database...")
    await initialize_database()
    try:
        synced_counts = await sync_demo_data()
    finally:
        await close_database()

    total = sum(synced_counts.values())
    for table_name, row_count in synced_counts.items():
        print(f"  OK {table_name}: {row_count} rows")
    print(f"\nDone. Synced {total} rows across {len(synced_counts)} seed tables.")


if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
