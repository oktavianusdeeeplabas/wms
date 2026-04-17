import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.bins import Bins

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class BinsService:
    """Service layer for Bins operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Bins]:
        """Create a new bins"""
        try:
            obj = Bins(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created bins with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating bins: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Bins]:
        """Get bins by ID"""
        try:
            query = select(Bins).where(Bins.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching bins {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of binss"""
        try:
            query = select(Bins)
            count_query = select(func.count(Bins.id))
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Bins, field):
                        query = query.where(getattr(Bins, field) == value)
                        count_query = count_query.where(getattr(Bins, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Bins, field_name):
                        query = query.order_by(getattr(Bins, field_name).desc())
                else:
                    if hasattr(Bins, sort):
                        query = query.order_by(getattr(Bins, sort))
            else:
                query = query.order_by(Bins.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching bins list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Bins]:
        """Update bins"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Bins {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated bins {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating bins {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete bins"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Bins {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted bins {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting bins {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Bins]:
        """Get bins by any field"""
        try:
            if not hasattr(Bins, field_name):
                raise ValueError(f"Field {field_name} does not exist on Bins")
            result = await self.db.execute(
                select(Bins).where(getattr(Bins, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching bins by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Bins]:
        """Get list of binss filtered by field"""
        try:
            if not hasattr(Bins, field_name):
                raise ValueError(f"Field {field_name} does not exist on Bins")
            result = await self.db.execute(
                select(Bins)
                .where(getattr(Bins, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Bins.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching binss by {field_name}: {str(e)}")
            raise