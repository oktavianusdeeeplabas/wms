import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.stock_transfers import Stock_transfers

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class Stock_transfersService:
    """Service layer for Stock_transfers operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Stock_transfers]:
        """Create a new stock_transfers"""
        try:
            obj = Stock_transfers(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created stock_transfers with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating stock_transfers: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Stock_transfers]:
        """Get stock_transfers by ID"""
        try:
            query = select(Stock_transfers).where(Stock_transfers.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching stock_transfers {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of stock_transferss"""
        try:
            query = select(Stock_transfers)
            count_query = select(func.count(Stock_transfers.id))
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Stock_transfers, field):
                        query = query.where(getattr(Stock_transfers, field) == value)
                        count_query = count_query.where(getattr(Stock_transfers, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Stock_transfers, field_name):
                        query = query.order_by(getattr(Stock_transfers, field_name).desc())
                else:
                    if hasattr(Stock_transfers, sort):
                        query = query.order_by(getattr(Stock_transfers, sort))
            else:
                query = query.order_by(Stock_transfers.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching stock_transfers list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Stock_transfers]:
        """Update stock_transfers"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Stock_transfers {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated stock_transfers {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating stock_transfers {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete stock_transfers"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Stock_transfers {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted stock_transfers {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting stock_transfers {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Stock_transfers]:
        """Get stock_transfers by any field"""
        try:
            if not hasattr(Stock_transfers, field_name):
                raise ValueError(f"Field {field_name} does not exist on Stock_transfers")
            result = await self.db.execute(
                select(Stock_transfers).where(getattr(Stock_transfers, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching stock_transfers by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Stock_transfers]:
        """Get list of stock_transferss filtered by field"""
        try:
            if not hasattr(Stock_transfers, field_name):
                raise ValueError(f"Field {field_name} does not exist on Stock_transfers")
            result = await self.db.execute(
                select(Stock_transfers)
                .where(getattr(Stock_transfers, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Stock_transfers.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching stock_transferss by {field_name}: {str(e)}")
            raise