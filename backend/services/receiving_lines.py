import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.receiving_lines import Receiving_lines

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class Receiving_linesService:
    """Service layer for Receiving_lines operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Receiving_lines]:
        """Create a new receiving_lines"""
        try:
            obj = Receiving_lines(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created receiving_lines with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating receiving_lines: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Receiving_lines]:
        """Get receiving_lines by ID"""
        try:
            query = select(Receiving_lines).where(Receiving_lines.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching receiving_lines {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of receiving_liness"""
        try:
            query = select(Receiving_lines)
            count_query = select(func.count(Receiving_lines.id))
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Receiving_lines, field):
                        query = query.where(getattr(Receiving_lines, field) == value)
                        count_query = count_query.where(getattr(Receiving_lines, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Receiving_lines, field_name):
                        query = query.order_by(getattr(Receiving_lines, field_name).desc())
                else:
                    if hasattr(Receiving_lines, sort):
                        query = query.order_by(getattr(Receiving_lines, sort))
            else:
                query = query.order_by(Receiving_lines.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching receiving_lines list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Receiving_lines]:
        """Update receiving_lines"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Receiving_lines {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated receiving_lines {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating receiving_lines {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete receiving_lines"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Receiving_lines {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted receiving_lines {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting receiving_lines {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Receiving_lines]:
        """Get receiving_lines by any field"""
        try:
            if not hasattr(Receiving_lines, field_name):
                raise ValueError(f"Field {field_name} does not exist on Receiving_lines")
            result = await self.db.execute(
                select(Receiving_lines).where(getattr(Receiving_lines, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching receiving_lines by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Receiving_lines]:
        """Get list of receiving_liness filtered by field"""
        try:
            if not hasattr(Receiving_lines, field_name):
                raise ValueError(f"Field {field_name} does not exist on Receiving_lines")
            result = await self.db.execute(
                select(Receiving_lines)
                .where(getattr(Receiving_lines, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Receiving_lines.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching receiving_liness by {field_name}: {str(e)}")
            raise