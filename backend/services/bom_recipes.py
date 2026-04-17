import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.bom_recipes import Bom_recipes

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class Bom_recipesService:
    """Service layer for Bom_recipes operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Bom_recipes]:
        """Create a new bom_recipes"""
        try:
            obj = Bom_recipes(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created bom_recipes with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating bom_recipes: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Bom_recipes]:
        """Get bom_recipes by ID"""
        try:
            query = select(Bom_recipes).where(Bom_recipes.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching bom_recipes {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of bom_recipess"""
        try:
            query = select(Bom_recipes)
            count_query = select(func.count(Bom_recipes.id))
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Bom_recipes, field):
                        query = query.where(getattr(Bom_recipes, field) == value)
                        count_query = count_query.where(getattr(Bom_recipes, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Bom_recipes, field_name):
                        query = query.order_by(getattr(Bom_recipes, field_name).desc())
                else:
                    if hasattr(Bom_recipes, sort):
                        query = query.order_by(getattr(Bom_recipes, sort))
            else:
                query = query.order_by(Bom_recipes.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching bom_recipes list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Bom_recipes]:
        """Update bom_recipes"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Bom_recipes {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated bom_recipes {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating bom_recipes {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete bom_recipes"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Bom_recipes {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted bom_recipes {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting bom_recipes {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Bom_recipes]:
        """Get bom_recipes by any field"""
        try:
            if not hasattr(Bom_recipes, field_name):
                raise ValueError(f"Field {field_name} does not exist on Bom_recipes")
            result = await self.db.execute(
                select(Bom_recipes).where(getattr(Bom_recipes, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching bom_recipes by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Bom_recipes]:
        """Get list of bom_recipess filtered by field"""
        try:
            if not hasattr(Bom_recipes, field_name):
                raise ValueError(f"Field {field_name} does not exist on Bom_recipes")
            result = await self.db.execute(
                select(Bom_recipes)
                .where(getattr(Bom_recipes, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Bom_recipes.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching bom_recipess by {field_name}: {str(e)}")
            raise