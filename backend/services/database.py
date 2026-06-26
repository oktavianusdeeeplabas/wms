import logging
import os
import time

from core.database import db_manager
from sqlalchemy import text

logger = logging.getLogger(__name__)


async def check_database_health() -> bool:
    """Check if database is healthy"""
    start_time = time.time()
    logger.debug("[DB_OP] Starting database health check")
    try:
        if not db_manager.async_session_maker:
            return False

        async with db_manager.async_session_maker() as session:
            await session.execute(text("SELECT 1"))
            logger.debug(f"[DB_OP] Database health check completed in {time.time() - start_time:.4f}s - healthy: True")
            return True
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        logger.debug(f"[DB_OP] Database health check failed in {time.time() - start_time:.4f}s - healthy: False")
        return False


async def initialize_database():
    """Initialize database and create tables"""
    if "MGX_IGNORE_INIT_DB" in os.environ:
        logger.info("Ignore creating tables")
        return
    start_time = time.time()
    logger.debug("[DB_OP] Starting database initialization")
    try:
        logger.info("🔧 Starting database initialization...")
        await db_manager.init_db()
        logger.info("🔧 Database connection initialized, now creating tables if tables not exist...")
        await db_manager.create_tables()
        logger.info("🔧 Table creation completed")
        await ensure_user_scope_columns()
        await ensure_product_detail_schema()
        await ensure_supplier_detail_schema()
        await ensure_warehouse_detail_schema()
        logger.info("Database initialized successfully")
        logger.debug(f"[DB_OP] Database initialization completed in {time.time() - start_time:.4f}s")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise


async def ensure_user_scope_columns():
    """Add branch/warehouse scope columns for existing users tables."""
    if not db_manager.engine:
        return

    try:
        async with db_manager.engine.begin() as conn:
            if db_manager.engine.dialect.name == "postgresql":
                await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS branch_id INTEGER"))
                await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS warehouse_id INTEGER"))
            elif db_manager.engine.dialect.name == "sqlite":
                result = await conn.execute(text("PRAGMA table_info(users)"))
                existing_columns = {row[1] for row in result.fetchall()}
                if "branch_id" not in existing_columns:
                    await conn.execute(text("ALTER TABLE users ADD COLUMN branch_id INTEGER"))
                if "warehouse_id" not in existing_columns:
                    await conn.execute(text("ALTER TABLE users ADD COLUMN warehouse_id INTEGER"))
        logger.info("User branch/warehouse scope columns are ready")
    except Exception as e:
        logger.error(f"Failed to ensure user scope columns: {e}")
        raise


async def ensure_supplier_detail_schema():
    """Add supplier detail columns and product link table for existing databases."""
    if not db_manager.engine:
        return

    supplier_columns = {
        "marketing_name": "VARCHAR",
        "marketing_phone": "VARCHAR",
        "marketing_email": "VARCHAR",
        "branch_id": "INTEGER",
        "warehouse_id": "INTEGER",
        "payment_type_id": "INTEGER",
        "payment_terms": "VARCHAR",
        "lead_time_days": "INTEGER",
        "tax_number": "VARCHAR",
        "notes": "VARCHAR",
    }

    try:
        async with db_manager.engine.begin() as conn:
            if db_manager.engine.dialect.name == "postgresql":
                for column_name, column_type in supplier_columns.items():
                    await conn.execute(
                        text(f"ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS {column_name} {column_type}")
                    )
                await conn.execute(
                    text(
                        """
                        CREATE TABLE IF NOT EXISTS supplier_products (
                            id SERIAL PRIMARY KEY,
                            supplier_id INTEGER NOT NULL,
                            product_id INTEGER NOT NULL
                        )
                        """
                    )
                )
                await conn.execute(
                    text(
                        """
                        CREATE UNIQUE INDEX IF NOT EXISTS ux_supplier_products_supplier_product
                        ON supplier_products (supplier_id, product_id)
                        """
                    )
                )
            elif db_manager.engine.dialect.name == "sqlite":
                result = await conn.execute(text("PRAGMA table_info(suppliers)"))
                existing_columns = {row[1] for row in result.fetchall()}
                for column_name, column_type in supplier_columns.items():
                    if column_name not in existing_columns:
                        await conn.execute(text(f"ALTER TABLE suppliers ADD COLUMN {column_name} {column_type}"))
                await conn.execute(
                    text(
                        """
                        CREATE TABLE IF NOT EXISTS supplier_products (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            supplier_id INTEGER NOT NULL,
                            product_id INTEGER NOT NULL
                        )
                        """
                    )
                )
                await conn.execute(
                    text(
                        """
                        CREATE UNIQUE INDEX IF NOT EXISTS ux_supplier_products_supplier_product
                        ON supplier_products (supplier_id, product_id)
                        """
                    )
                )
        logger.info("Supplier detail schema is ready")
    except Exception as e:
        logger.error(f"Failed to ensure supplier detail schema: {e}")
        raise


async def ensure_product_detail_schema():
    """Add product detail columns for existing databases."""
    if not db_manager.engine:
        return

    product_columns = {
        "short_name": "VARCHAR",
        "barcode": "VARCHAR",
        "qr_code": "VARCHAR",
        "alternate_barcode": "VARCHAR",
        "sub_category": "VARCHAR",
        "brand": "VARCHAR",
        "manufacturer": "VARCHAR",
        "product_type": "VARCHAR",
        "item_group": "VARCHAR",
        "product_image": "VARCHAR",
        "description": "VARCHAR",
    }

    try:
        async with db_manager.engine.begin() as conn:
            if db_manager.engine.dialect.name == "postgresql":
                for column_name, column_type in product_columns.items():
                    await conn.execute(
                        text(f"ALTER TABLE products ADD COLUMN IF NOT EXISTS {column_name} {column_type}")
                    )
            elif db_manager.engine.dialect.name == "sqlite":
                result = await conn.execute(text("PRAGMA table_info(products)"))
                existing_columns = {row[1] for row in result.fetchall()}
                for column_name, column_type in product_columns.items():
                    if column_name not in existing_columns:
                        await conn.execute(text(f"ALTER TABLE products ADD COLUMN {column_name} {column_type}"))
        logger.info("Product detail schema is ready")
    except Exception as e:
        logger.error(f"Failed to ensure product detail schema: {e}")
        raise


async def ensure_warehouse_detail_schema():
    """Add warehouse detail columns for existing databases."""
    if not db_manager.engine:
        return

    warehouse_columns = {
        "detail": "VARCHAR",
        "capacity": "INTEGER",
        "manager": "VARCHAR",
    }

    try:
        async with db_manager.engine.begin() as conn:
            if db_manager.engine.dialect.name == "postgresql":
                for column_name, column_type in warehouse_columns.items():
                    await conn.execute(
                        text(f"ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS {column_name} {column_type}")
                    )
            elif db_manager.engine.dialect.name == "sqlite":
                result = await conn.execute(text("PRAGMA table_info(warehouses)"))
                existing_columns = {row[1] for row in result.fetchall()}
                for column_name, column_type in warehouse_columns.items():
                    if column_name not in existing_columns:
                        await conn.execute(text(f"ALTER TABLE warehouses ADD COLUMN {column_name} {column_type}"))
        logger.info("Warehouse detail columns are ready")
    except Exception as e:
        logger.error(f"Failed to ensure warehouse detail schema: {e}")
        raise


async def close_database():
    """Close database connections"""
    start_time = time.time()
    logger.debug("[DB_OP] Starting database close")
    try:
        await db_manager.close_db()
        logger.info("Database connections closed")
        logger.debug(f"[DB_OP] Database close completed in {time.time() - start_time:.4f}s")
    except Exception as e:
        logger.error(f"Error closing database: {e}")
        logger.debug(f"[DB_OP] Database close failed in {time.time() - start_time:.4f}s")
