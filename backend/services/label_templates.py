import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.label_templates import LabelTemplates

logger = logging.getLogger(__name__)


class LabelTemplatesService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[LabelTemplates]:
        try:
            obj = LabelTemplates(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating label template: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[LabelTemplates]:
        try:
            result = await self.db.execute(select(LabelTemplates).where(LabelTemplates.id == obj_id))
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching label template {obj_id}: {str(e)}")
            raise

    async def get_list(
        self,
        skip: int = 0,
        limit: int = 20,
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        try:
            query = select(LabelTemplates)
            count_query = select(func.count(LabelTemplates.id))

            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(LabelTemplates, field):
                        query = query.where(getattr(LabelTemplates, field) == value)
                        count_query = count_query.where(getattr(LabelTemplates, field) == value)

            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(LabelTemplates, field_name):
                        query = query.order_by(getattr(LabelTemplates, field_name).desc())
                else:
                    if hasattr(LabelTemplates, sort):
                        query = query.order_by(getattr(LabelTemplates, sort))
            else:
                query = query.order_by(LabelTemplates.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {"items": items, "total": total, "skip": skip, "limit": limit}
        except Exception as e:
            logger.error(f"Error fetching label templates list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[LabelTemplates]:
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
            logger.error(f"Error updating label template {obj_id}: {str(e)}")
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
            logger.error(f"Error deleting label template {obj_id}: {str(e)}")
            raise
