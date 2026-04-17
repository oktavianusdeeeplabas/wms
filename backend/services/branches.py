import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.branches import Branches

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class BranchesService:
    """Service layer for Branches operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Branches]:
        """Create a new branches"""
        try:
            obj = Branches(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created branches with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating branches: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Branches]:
        """Get branches by ID"""
        try:
            query = select(Branches).where(Branches.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching branches {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of branchess"""
        try:
            query = select(Branches)
            count_query = select(func.count(Branches.id))
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Branches, field):
                        query = query.where(getattr(Branches, field) == value)
                        count_query = count_query.where(getattr(Branches, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Branches, field_name):
                        query = query.order_by(getattr(Branches, field_name).desc())
                else:
                    if hasattr(Branches, sort):
                        query = query.order_by(getattr(Branches, sort))
            else:
                query = query.order_by(Branches.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching branches list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Branches]:
        """Update branches"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Branches {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated branches {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating branches {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete branches"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Branches {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted branches {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting branches {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Branches]:
        """Get branches by any field"""
        try:
            if not hasattr(Branches, field_name):
                raise ValueError(f"Field {field_name} does not exist on Branches")
            result = await self.db.execute(
                select(Branches).where(getattr(Branches, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching branches by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Branches]:
        """Get list of branchess filtered by field"""
        try:
            if not hasattr(Branches, field_name):
                raise ValueError(f"Field {field_name} does not exist on Branches")
            result = await self.db.execute(
                select(Branches)
                .where(getattr(Branches, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Branches.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching branchess by {field_name}: {str(e)}")
            raise