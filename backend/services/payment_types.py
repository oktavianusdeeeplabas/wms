import logging
from typing import Any, Dict, Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.payment_types import PaymentTypes

logger = logging.getLogger(__name__)


class PaymentTypesService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[PaymentTypes]:
        try:
            obj = PaymentTypes(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating payment type: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[PaymentTypes]:
        result = await self.db.execute(select(PaymentTypes).where(PaymentTypes.id == obj_id))
        return result.scalar_one_or_none()

    async def get_list(
        self,
        skip: int = 0,
        limit: int = 20,
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        query = select(PaymentTypes)
        count_query = select(func.count(PaymentTypes.id))

        if query_dict:
            for field, value in query_dict.items():
                if hasattr(PaymentTypes, field):
                    query = query.where(getattr(PaymentTypes, field) == value)
                    count_query = count_query.where(getattr(PaymentTypes, field) == value)

        total = (await self.db.execute(count_query)).scalar()

        if sort:
            if sort.startswith("-"):
                field_name = sort[1:]
                if hasattr(PaymentTypes, field_name):
                    query = query.order_by(getattr(PaymentTypes, field_name).desc())
            elif hasattr(PaymentTypes, sort):
                query = query.order_by(getattr(PaymentTypes, sort))
        else:
            query = query.order_by(PaymentTypes.id.asc())

        result = await self.db.execute(query.offset(skip).limit(limit))
        return {"items": result.scalars().all(), "total": total, "skip": skip, "limit": limit}

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[PaymentTypes]:
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
            logger.error(f"Error updating payment type {obj_id}: {str(e)}")
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
            logger.error(f"Error deleting payment type {obj_id}: {str(e)}")
            raise
