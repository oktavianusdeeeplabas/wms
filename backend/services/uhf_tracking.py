import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Type

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.uhf_readers import Uhf_readers
from models.uhf_tag_reads import Uhf_tag_reads
from models.uhf_tags import Uhf_tags

logger = logging.getLogger(__name__)


def normalize_epc(epc: str) -> str:
    return "".join(epc.upper().split())


class CrudService:
    def __init__(self, db: AsyncSession, model: Type):
        self.db = db
        self.model = model

    async def create(self, data: Dict[str, Any]):
        obj = self.model(**data)
        self.db.add(obj)
        await self.db.commit()
        await self.db.refresh(obj)
        return obj

    async def get_by_id(self, obj_id: int):
        result = await self.db.execute(select(self.model).where(self.model.id == obj_id))
        return result.scalar_one_or_none()

    async def get_list(
        self,
        skip: int = 0,
        limit: int = 20,
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        query = select(self.model)
        count_query = select(func.count(self.model.id))

        if query_dict:
            for field, value in query_dict.items():
                if hasattr(self.model, field):
                    query = query.where(getattr(self.model, field) == value)
                    count_query = count_query.where(getattr(self.model, field) == value)

        total = (await self.db.execute(count_query)).scalar()

        if sort:
            field_name = sort[1:] if sort.startswith("-") else sort
            if hasattr(self.model, field_name):
                column = getattr(self.model, field_name)
                query = query.order_by(column.desc() if sort.startswith("-") else column)
        else:
            query = query.order_by(self.model.id.desc())

        result = await self.db.execute(query.offset(skip).limit(limit))
        return {"items": result.scalars().all(), "total": total, "skip": skip, "limit": limit}

    async def update(self, obj_id: int, update_data: Dict[str, Any]):
        obj = await self.get_by_id(obj_id)
        if not obj:
            return None
        for key, value in update_data.items():
            if hasattr(obj, key):
                setattr(obj, key, value)
        await self.db.commit()
        await self.db.refresh(obj)
        return obj

    async def delete(self, obj_id: int) -> bool:
        obj = await self.get_by_id(obj_id)
        if not obj:
            return False
        await self.db.delete(obj)
        await self.db.commit()
        return True


class UhfTrackingService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_tag_by_epc(self, epc: str) -> Optional[Uhf_tags]:
        result = await self.db.execute(select(Uhf_tags).where(Uhf_tags.epc == normalize_epc(epc)))
        return result.scalar_one_or_none()

    async def ingest_read(self, data: Dict[str, Any]) -> Uhf_tag_reads:
        epc = normalize_epc(data["epc"])
        now = datetime.now(timezone.utc)
        reader = await self._resolve_reader(data)
        tag = await self.get_tag_by_epc(epc)

        zone_id = data.get("zone_id")
        bin_id = data.get("bin_id")
        if reader:
            reader.last_seen_at = now
            zone_id = zone_id if zone_id is not None else reader.zone_id
            bin_id = bin_id if bin_id is not None else reader.bin_id

        if tag:
            tag.last_seen_at = now
            if zone_id is not None:
                tag.current_zone_id = zone_id
            if bin_id is not None:
                tag.current_bin_id = bin_id

        read = Uhf_tag_reads(
            tag_id=tag.id if tag else None,
            epc=epc,
            reader_id=reader.id if reader else data.get("reader_id"),
            zone_id=zone_id,
            bin_id=bin_id,
            rssi=data.get("rssi"),
            read_count=data.get("read_count") or 1,
            direction=data.get("direction"),
            event_type=data.get("event_type") or "read",
            seen_at=now,
        )
        self.db.add(read)
        await self.db.commit()
        await self.db.refresh(read)
        logger.info("Ingested UHF read for EPC %s", epc)
        return read

    async def _resolve_reader(self, data: Dict[str, Any]) -> Optional[Uhf_readers]:
        if data.get("reader_id"):
            result = await self.db.execute(select(Uhf_readers).where(Uhf_readers.id == data["reader_id"]))
            return result.scalar_one_or_none()
        if data.get("reader_code"):
            result = await self.db.execute(select(Uhf_readers).where(Uhf_readers.code == data["reader_code"]))
            return result.scalar_one_or_none()
        return None
