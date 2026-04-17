import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.inventory_lots import Inventory_lots

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class Inventory_lotsService:
    """Service layer for Inventory_lots operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Inventory_lots]:
        """Create a new inventory_lots"""
        try:
            obj = Inventory_lots(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created inventory_lots with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating inventory_lots: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Inventory_lots]:
        """Get inventory_lots by ID"""
        try:
            query = select(Inventory_lots).where(Inventory_lots.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching inventory_lots {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of inventory_lotss"""
        try:
            query = select(Inventory_lots)
            count_query = select(func.count(Inventory_lots.id))
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Inventory_lots, field):
                        query = query.where(getattr(Inventory_lots, field) == value)
                        count_query = count_query.where(getattr(Inventory_lots, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Inventory_lots, field_name):
                        query = query.order_by(getattr(Inventory_lots, field_name).desc())
                else:
                    if hasattr(Inventory_lots, sort):
                        query = query.order_by(getattr(Inventory_lots, sort))
            else:
                query = query.order_by(Inventory_lots.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching inventory_lots list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Inventory_lots]:
        """Update inventory_lots"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Inventory_lots {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated inventory_lots {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating inventory_lots {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete inventory_lots"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Inventory_lots {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted inventory_lots {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting inventory_lots {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Inventory_lots]:
        """Get inventory_lots by any field"""
        try:
            if not hasattr(Inventory_lots, field_name):
                raise ValueError(f"Field {field_name} does not exist on Inventory_lots")
            result = await self.db.execute(
                select(Inventory_lots).where(getattr(Inventory_lots, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching inventory_lots by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Inventory_lots]:
        """Get list of inventory_lotss filtered by field"""
        try:
            if not hasattr(Inventory_lots, field_name):
                raise ValueError(f"Field {field_name} does not exist on Inventory_lots")
            result = await self.db.execute(
                select(Inventory_lots)
                .where(getattr(Inventory_lots, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Inventory_lots.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching inventory_lotss by {field_name}: {str(e)}")
            raise