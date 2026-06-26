import logging
from typing import Any, Dict, Optional, Type

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.product_lookups import (
    Brands,
    ItemGroups,
    Manufacturers,
    ProductCategories,
    ProductSubCategories,
    ProductTypes,
)

logger = logging.getLogger(__name__)

LOOKUP_MODELS = {
    "product_categories": ProductCategories,
    "product_sub_categories": ProductSubCategories,
    "brands": Brands,
    "manufacturers": Manufacturers,
    "product_types": ProductTypes,
    "item_groups": ItemGroups,
}


class ProductLookupService:
    def __init__(self, db: AsyncSession, model: Type):
        self.db = db
        self.model = model

    async def create(self, data: Dict[str, Any]):
        try:
            obj = self.model(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error("Error creating product lookup: %s", e)
            raise

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

        total = await self.db.scalar(count_query)

        if sort:
            if sort.startswith("-"):
                field_name = sort[1:]
                if hasattr(self.model, field_name):
                    query = query.order_by(getattr(self.model, field_name).desc())
            elif hasattr(self.model, sort):
                query = query.order_by(getattr(self.model, sort))
        else:
            query = query.order_by(self.model.name.asc())

        result = await self.db.execute(query.offset(skip).limit(limit))
        return {"items": result.scalars().all(), "total": total or 0, "skip": skip, "limit": limit}

    async def update(self, obj_id: int, update_data: Dict[str, Any]):
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
            logger.error("Error updating product lookup %s: %s", obj_id, e)
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
            logger.error("Error deleting product lookup %s: %s", obj_id, e)
            raise
