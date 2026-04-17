import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.stock_movements import Stock_movements

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class Stock_movementsService:
    """Service layer for Stock_movements operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Stock_movements]:
        """Create a new stock_movements"""
        try:
            obj = Stock_movements(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created stock_movements with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating stock_movements: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Stock_movements]:
        """Get stock_movements by ID"""
        try:
            query = select(Stock_movements).where(Stock_movements.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching stock_movements {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of stock_movementss"""
        try:
            query = select(Stock_movements)
            count_query = select(func.count(Stock_movements.id))
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Stock_movements, field):
                        query = query.where(getattr(Stock_movements, field) == value)
                        count_query = count_query.where(getattr(Stock_movements, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Stock_movements, field_name):
                        query = query.order_by(getattr(Stock_movements, field_name).desc())
                else:
                    if hasattr(Stock_movements, sort):
                        query = query.order_by(getattr(Stock_movements, sort))
            else:
                query = query.order_by(Stock_movements.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching stock_movements list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Stock_movements]:
        """Update stock_movements"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Stock_movements {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated stock_movements {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating stock_movements {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete stock_movements"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Stock_movements {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted stock_movements {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting stock_movements {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Stock_movements]:
        """Get stock_movements by any field"""
        try:
            if not hasattr(Stock_movements, field_name):
                raise ValueError(f"Field {field_name} does not exist on Stock_movements")
            result = await self.db.execute(
                select(Stock_movements).where(getattr(Stock_movements, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching stock_movements by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Stock_movements]:
        """Get list of stock_movementss filtered by field"""
        try:
            if not hasattr(Stock_movements, field_name):
                raise ValueError(f"Field {field_name} does not exist on Stock_movements")
            result = await self.db.execute(
                select(Stock_movements)
                .where(getattr(Stock_movements, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Stock_movements.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching stock_movementss by {field_name}: {str(e)}")
            raise