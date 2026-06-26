import logging
from typing import Any, Dict, Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.units import Units

logger = logging.getLogger(__name__)


class UnitsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Units]:
        try:
            obj = Units(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating unit: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Units]:
        try:
            result = await self.db.execute(select(Units).where(Units.id == obj_id))
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching unit {obj_id}: {str(e)}")
            raise

    async def get_list(
        self,
        skip: int = 0,
        limit: int = 20,
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        try:
            query = select(Units)
            count_query = select(func.count(Units.id))

            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Units, field):
                        query = query.where(getattr(Units, field) == value)
                        count_query = count_query.where(getattr(Units, field) == value)

            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith("-"):
                    field_name = sort[1:]
                    if hasattr(Units, field_name):
                        query = query.order_by(getattr(Units, field_name).desc())
                elif hasattr(Units, sort):
                    query = query.order_by(getattr(Units, sort))
            else:
                query = query.order_by(Units.id.asc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {"items": items, "total": total, "skip": skip, "limit": limit}
        except Exception as e:
            logger.error(f"Error fetching units list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Units]:
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)
            await self.db.commit()
            await self.db.refresh(obj)
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating unit {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                return False
            await self.db.delete(obj)
            await self.db.commit()
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting unit {obj_id}: {str(e)}")
            raise
