import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.suppliers import Suppliers

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class SuppliersService:
    """Service layer for Suppliers operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Suppliers]:
        """Create a new suppliers"""
        try:
            obj = Suppliers(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created suppliers with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating suppliers: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Suppliers]:
        """Get suppliers by ID"""
        try:
            query = select(Suppliers).where(Suppliers.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching suppliers {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of supplierss"""
        try:
            query = select(Suppliers)
            count_query = select(func.count(Suppliers.id))
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Suppliers, field):
                        query = query.where(getattr(Suppliers, field) == value)
                        count_query = count_query.where(getattr(Suppliers, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Suppliers, field_name):
                        query = query.order_by(getattr(Suppliers, field_name).desc())
                else:
                    if hasattr(Suppliers, sort):
                        query = query.order_by(getattr(Suppliers, sort))
            else:
                query = query.order_by(Suppliers.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching suppliers list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Suppliers]:
        """Update suppliers"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Suppliers {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated suppliers {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating suppliers {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete suppliers"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Suppliers {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted suppliers {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting suppliers {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Suppliers]:
        """Get suppliers by any field"""
        try:
            if not hasattr(Suppliers, field_name):
                raise ValueError(f"Field {field_name} does not exist on Suppliers")
            result = await self.db.execute(
                select(Suppliers).where(getattr(Suppliers, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching suppliers by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Suppliers]:
        """Get list of supplierss filtered by field"""
        try:
            if not hasattr(Suppliers, field_name):
                raise ValueError(f"Field {field_name} does not exist on Suppliers")
            result = await self.db.execute(
                select(Suppliers)
                .where(getattr(Suppliers, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Suppliers.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching supplierss by {field_name}: {str(e)}")
            raise