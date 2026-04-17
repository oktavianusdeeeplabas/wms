import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.zones import Zones

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class ZonesService:
    """Service layer for Zones operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Zones]:
        """Create a new zones"""
        try:
            obj = Zones(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created zones with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating zones: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Zones]:
        """Get zones by ID"""
        try:
            query = select(Zones).where(Zones.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching zones {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of zoness"""
        try:
            query = select(Zones)
            count_query = select(func.count(Zones.id))
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Zones, field):
                        query = query.where(getattr(Zones, field) == value)
                        count_query = count_query.where(getattr(Zones, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Zones, field_name):
                        query = query.order_by(getattr(Zones, field_name).desc())
                else:
                    if hasattr(Zones, sort):
                        query = query.order_by(getattr(Zones, sort))
            else:
                query = query.order_by(Zones.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching zones list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Zones]:
        """Update zones"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Zones {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated zones {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating zones {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete zones"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Zones {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted zones {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting zones {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Zones]:
        """Get zones by any field"""
        try:
            if not hasattr(Zones, field_name):
                raise ValueError(f"Field {field_name} does not exist on Zones")
            result = await self.db.execute(
                select(Zones).where(getattr(Zones, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching zones by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Zones]:
        """Get list of zoness filtered by field"""
        try:
            if not hasattr(Zones, field_name):
                raise ValueError(f"Field {field_name} does not exist on Zones")
            result = await self.db.execute(
                select(Zones)
                .where(getattr(Zones, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Zones.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching zoness by {field_name}: {str(e)}")
            raise