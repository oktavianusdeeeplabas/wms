import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.bom_lines import Bom_lines

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class Bom_linesService:
    """Service layer for Bom_lines operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Bom_lines]:
        """Create a new bom_lines"""
        try:
            obj = Bom_lines(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created bom_lines with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating bom_lines: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Bom_lines]:
        """Get bom_lines by ID"""
        try:
            query = select(Bom_lines).where(Bom_lines.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching bom_lines {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of bom_liness"""
        try:
            query = select(Bom_lines)
            count_query = select(func.count(Bom_lines.id))
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Bom_lines, field):
                        query = query.where(getattr(Bom_lines, field) == value)
                        count_query = count_query.where(getattr(Bom_lines, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Bom_lines, field_name):
                        query = query.order_by(getattr(Bom_lines, field_name).desc())
                else:
                    if hasattr(Bom_lines, sort):
                        query = query.order_by(getattr(Bom_lines, sort))
            else:
                query = query.order_by(Bom_lines.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching bom_lines list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Bom_lines]:
        """Update bom_lines"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Bom_lines {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated bom_lines {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating bom_lines {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete bom_lines"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Bom_lines {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted bom_lines {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting bom_lines {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Bom_lines]:
        """Get bom_lines by any field"""
        try:
            if not hasattr(Bom_lines, field_name):
                raise ValueError(f"Field {field_name} does not exist on Bom_lines")
            result = await self.db.execute(
                select(Bom_lines).where(getattr(Bom_lines, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching bom_lines by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Bom_lines]:
        """Get list of bom_liness filtered by field"""
        try:
            if not hasattr(Bom_lines, field_name):
                raise ValueError(f"Field {field_name} does not exist on Bom_lines")
            result = await self.db.execute(
                select(Bom_lines)
                .where(getattr(Bom_lines, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Bom_lines.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching bom_liness by {field_name}: {str(e)}")
            raise