import csv
import json
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Iterable

from core.database import db_manager
from sqlalchemy import Boolean, Date, DateTime, Float, Integer, MetaData, Numeric, Table, func, select, text
from sqlalchemy.dialects.postgresql import insert as postgresql_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.exc import NoSuchTableError, SQLAlchemyError

logger = logging.getLogger(__name__)

DEMO_DATA_DIR = Path(__file__).resolve().parent.parent / "mock_data"
MASTER_DATA_CSV_DIR = Path(__file__).resolve().parent.parent / "master_data_csv"

DEMO_TABLE_LOAD_ORDER = [
    "payment_types",
    "units",
    "branches",
    "warehouses",
    "zones",
    "bins",
    "product_categories",
    "product_sub_categories",
    "brands",
    "manufacturers",
    "product_types",
    "item_groups",
    "products",
    "suppliers",
    "supplier_products",
    "bom_recipes",
    "bom_lines",
    "receiving_documents",
    "receiving_lines",
    "inventory_lots",
    "stock_movements",
    "stock_transfers",
    "label_templates",
    "uhf_readers",
    "uhf_tags",
    "uhf_tag_reads",
]


async def initialize_mock_data():
    """Backward-compatible alias for demo data initialization."""
    await initialize_demo_data()


async def initialize_demo_data():
    """Populate empty database tables with bundled demo seed data."""
    if "MGX_IGNORE_INIT_DATA" in os.environ:
        logger.info("Ignore initialize data")
        return
    if not db_manager.engine:
        logger.warning("Database engine is not ready; skipping demo data initialization")
        return

    data_files = _discover_seed_files()
    if not data_files:
        logger.info("No demo seed files detected; skipping demo initialization")
        return

    for data_file in data_files:
        try:
            await _load_table_from_file(data_file)
        except Exception as exc:  # pragma: no cover - defensive
            logger.error("Unexpected error loading %s: %s", data_file.name, exc)


async def sync_demo_data() -> dict[str, int]:
    """Upsert bundled demo seed data into database tables."""
    if not db_manager.engine:
        logger.warning("Database engine is not ready; skipping demo data sync")
        return {}

    synced_counts: dict[str, int] = {}
    for data_file in _discover_seed_files():
        try:
            synced_counts[data_file.stem] = await _upsert_table_from_file(data_file)
        except Exception as exc:  # pragma: no cover - defensive
            logger.error("Unexpected error syncing %s: %s", data_file.name, exc)
            synced_counts[data_file.stem] = 0
    return synced_counts


def _discover_seed_files() -> list[Path]:
    """Return demo seed files in dependency-safe table order."""
    files_by_table: dict[str, Path] = {}

    for data_dir, pattern in ((DEMO_DATA_DIR, "*.json"), (MASTER_DATA_CSV_DIR, "*.csv")):
        if not data_dir.exists():
            continue
        for data_file in data_dir.glob(pattern):
            files_by_table.setdefault(data_file.stem, data_file)

    ordered_files = [files_by_table.pop(table_name) for table_name in DEMO_TABLE_LOAD_ORDER if table_name in files_by_table]
    ordered_files.extend(files_by_table[table_name] for table_name in sorted(files_by_table))
    return ordered_files


def _prepare_records(raw_data: Any, table: Table) -> list[dict[str, Any]]:
    """Filter seed payloads to match the table definition and coerce values."""
    if isinstance(raw_data, dict):
        records_iterable: Iterable[dict[str, Any]] = [raw_data]
    elif isinstance(raw_data, list):
        records_iterable = [item for item in raw_data if isinstance(item, dict)]
    else:
        return []

    column_map = {column.name: column for column in table.columns}
    prepared: list[dict[str, Any]] = []

    for entry in records_iterable:
        filtered = {}
        for key, value in entry.items():
            if key not in column_map:
                continue
            column = column_map[key]
            typed_value = _coerce_empty_value(value, column)
            typed_value = _coerce_optional_foreign_key(key, typed_value, column)
            typed_value = _coerce_temporal_value(typed_value, column)
            typed_value = _coerce_scalar_value(typed_value, column)
            filtered[key] = _coerce_value(typed_value, column)
        if filtered:
            prepared.append(filtered)

    return _normalize_record_keys(prepared)


def _normalize_record_keys(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Ensure bulk inserts/upserts receive the same keys for every row."""
    if not records:
        return records

    keys = set().union(*(record.keys() for record in records))
    return [{key: record.get(key) for key in keys} for record in records]


def _coerce_empty_value(value: Any, column) -> Any:
    """Treat blank values as NULL for non-string columns."""
    if value != "":
        return value

    visit_name = getattr(column.type, "__visit_name__", "").lower()
    if "string" in visit_name or "text" in visit_name:
        return value
    return None


def _coerce_optional_foreign_key(key: str, value: Any, column) -> Any:
    """Convert demo-data zero placeholders to NULL for nullable FK-like columns."""
    if value != 0 or not key.endswith("_id") or not column.nullable:
        return value
    return None


def _coerce_temporal_value(value: Any, column) -> Any:
    """Convert ISO-like strings to Date/DateTime objects when needed."""
    if value is None or not isinstance(value, str):
        return value

    column_type = column.type
    if isinstance(column_type, DateTime):
        val_wo_z = value.replace("Z", "+00:00")
        for parser in (lambda v: datetime.fromisoformat(v), lambda v: datetime.strptime(v, "%Y-%m-%d %H:%M:%S")):
            try:
                return parser(val_wo_z)
            except ValueError:
                continue
        return value

    if isinstance(column_type, Date):
        try:
            return datetime.strptime(value, "%Y-%m-%d").date()
        except ValueError:
            return value

    return value


def _coerce_scalar_value(value: Any, column) -> Any:
    """Convert CSV string scalars to the reflected column's Python type."""
    if value is None or not isinstance(value, str):
        return value

    column_type = column.type
    if isinstance(column_type, Integer):
        try:
            return int(value)
        except ValueError:
            return value

    if isinstance(column_type, (Float, Numeric)):
        try:
            return float(value)
        except ValueError:
            return value

    if isinstance(column_type, Boolean):
        normalized = value.strip().lower()
        if normalized in {"1", "true", "yes", "y"}:
            return True
        if normalized in {"0", "false", "no", "n"}:
            return False

    return value


def _coerce_value(value: Any, column) -> Any:
    """Coerce nested structures to JSON strings when the column is not JSON."""
    if value is None:
        return None

    if isinstance(value, (dict, list)):
        visit_name = getattr(column.type, "__visit_name__", "").lower()
        if "json" in visit_name:
            return value
        return json.dumps(value, ensure_ascii=False)

    return value


def _load_records_from_file(data_file: Path) -> Any:
    if data_file.suffix == ".json":
        return json.loads(data_file.read_text(encoding="utf-8"))
    if data_file.suffix == ".csv":
        with data_file.open(newline="", encoding="utf-8") as handle:
            return list(csv.DictReader(handle))
    return []


async def _reflect_table(conn, table_name: str) -> Table:
    """Reflect a table definition inside a synchronous context."""

    def _reflect(sync_conn):
        metadata = MetaData()
        return Table(table_name, metadata, autoload_with=sync_conn)

    return await conn.run_sync(_reflect)


async def _load_table_from_file(data_file: Path):
    table_name = data_file.stem
    logger.info("Processing demo data file %s for table %s", data_file.name, table_name)

    async with db_manager.engine.begin() as conn:
        try:
            table = await _reflect_table(conn, table_name)
        except NoSuchTableError:
            logger.warning("Table %s does not exist; skipping %s", table_name, data_file.name)
            return
        except SQLAlchemyError as exc:
            logger.error("Failed to reflect table %s: %s", table_name, exc)
            return

        row_count = await conn.scalar(select(func.count()).select_from(table))
        if row_count and row_count > 0:
            await _reset_primary_key_sequence(conn, table)
            logger.info("Table %s already has %d rows; skipping demo insert", table_name, row_count)
            return

        try:
            raw_records = _load_records_from_file(data_file)
        except (csv.Error, json.JSONDecodeError) as exc:
            logger.error("Invalid seed data in %s: %s", data_file.name, exc)
            return

        records = _prepare_records(raw_records, table)
        if not records:
            logger.warning("No valid records found in %s after preparing data", data_file.name)
            return

        try:
            await conn.execute(table.insert(), records)
            await _reset_primary_key_sequence(conn, table)
            logger.info("Inserted %d demo records into %s", len(records), table_name)
        except SQLAlchemyError as exc:
            logger.error("Failed to insert demo data into %s: %s", table_name, exc)


async def _upsert_table_from_file(data_file: Path) -> int:
    table_name = data_file.stem
    logger.info("Syncing demo data file %s for table %s", data_file.name, table_name)

    async with db_manager.engine.begin() as conn:
        try:
            table = await _reflect_table(conn, table_name)
        except NoSuchTableError:
            logger.warning("Table %s does not exist; skipping %s", table_name, data_file.name)
            return 0
        except SQLAlchemyError as exc:
            logger.error("Failed to reflect table %s: %s", table_name, exc)
            return 0

        try:
            raw_records = _load_records_from_file(data_file)
        except (csv.Error, json.JSONDecodeError) as exc:
            logger.error("Invalid seed data in %s: %s", data_file.name, exc)
            return 0

        records = _prepare_records(raw_records, table)
        if not records:
            logger.warning("No valid records found in %s after preparing data", data_file.name)
            return 0

        pk_columns = list(table.primary_key.columns)
        if len(pk_columns) != 1:
            logger.warning("Table %s does not have a single-column primary key; skipping upsert", table_name)
            return 0

        try:
            await conn.execute(_build_upsert_statement(conn.dialect.name, table, records, pk_columns[0].name))
            await _reset_primary_key_sequence(conn, table)
            logger.info("Synced %d demo records into %s", len(records), table_name)
            return len(records)
        except SQLAlchemyError as exc:
            logger.error("Failed to sync demo data into %s: %s", table_name, exc)
            return 0


def _build_upsert_statement(dialect_name: str, table: Table, records: list[dict[str, Any]], pk_column_name: str):
    if dialect_name == "postgresql":
        statement = postgresql_insert(table).values(records)
    elif dialect_name == "sqlite":
        statement = sqlite_insert(table).values(records)
    else:
        raise SQLAlchemyError(f"Unsupported demo-data upsert dialect: {dialect_name}")

    update_columns = {
        column.name: getattr(statement.excluded, column.name)
        for column in table.columns
        if column.name != pk_column_name
    }
    return statement.on_conflict_do_update(index_elements=[pk_column_name], set_=update_columns)


async def _reset_primary_key_sequence(conn, table: Table):
    """Keep PostgreSQL serial sequences ahead of demo rows with explicit IDs."""
    pk_columns = list(table.primary_key.columns)
    if len(pk_columns) != 1:
        return

    pk_column = pk_columns[0]
    if not isinstance(pk_column.type, Integer):
        return

    dialect_name = conn.dialect.name
    if dialect_name != "postgresql":
        return

    sequence_name = await conn.scalar(
        text("select pg_get_serial_sequence(:table_name, :column_name)"),
        {"table_name": table.name, "column_name": pk_column.name},
    )
    if not sequence_name:
        return

    await conn.execute(
        text(
            """
            select setval(
                to_regclass(:sequence_name),
                greatest(coalesce((select max("{pk_column}") from "{table_name}"), 0), 1),
                true
            )
            """.format(table_name=table.name, pk_column=pk_column.name)
        ),
        {"sequence_name": sequence_name},
    )
