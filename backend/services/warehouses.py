import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.warehouses import Warehouses

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class WarehousesService:
    """Service layer for Warehouses operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Warehouses]:
        """Create a new warehouses"""
        try:
            obj = Warehouses(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created warehouses with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating warehouses: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Warehouses]:
        """Get warehouses by ID"""
        try:
            query = select(Warehouses).where(Warehouses.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching warehouses {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of warehousess"""
        try:
            query = select(Warehouses)
            count_query = select(func.count(Warehouses.id))
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Warehouses, field):
                        query = query.where(getattr(Warehouses, field) == value)
                        count_query = count_query.where(getattr(Warehouses, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Warehouses, field_name):
                        query = query.order_by(getattr(Warehouses, field_name).desc())
                else:
                    if hasattr(Warehouses, sort):
                        query = query.order_by(getattr(Warehouses, sort))
            else:
                query = query.order_by(Warehouses.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching warehouses list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Warehouses]:
        """Update warehouses"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Warehouses {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated warehouses {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating warehouses {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete warehouses"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Warehouses {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted warehouses {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting warehouses {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Warehouses]:
        """Get warehouses by any field"""
        try:
            if not hasattr(Warehouses, field_name):
                raise ValueError(f"Field {field_name} does not exist on Warehouses")
            result = await self.db.execute(
                select(Warehouses).where(getattr(Warehouses, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching warehouses by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Warehouses]:
        """Get list of warehousess filtered by field"""
        try:
            if not hasattr(Warehouses, field_name):
                raise ValueError(f"Field {field_name} does not exist on Warehouses")
            result = await self.db.execute(
                select(Warehouses)
                .where(getattr(Warehouses, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Warehouses.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching warehousess by {field_name}: {str(e)}")
            raise