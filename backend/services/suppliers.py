import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import delete, select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.suppliers import SupplierProducts, Suppliers

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class SuppliersService:
    """Service layer for Suppliers operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_product_ids(self, supplier_id: int) -> List[int]:
        result = await self.db.execute(
            select(SupplierProducts.product_id)
            .where(SupplierProducts.supplier_id == supplier_id)
            .order_by(SupplierProducts.product_id.asc())
        )
        return [int(product_id) for product_id in result.scalars().all()]

    async def _sync_product_ids(self, supplier_id: int, product_ids: Optional[List[int]]) -> None:
        if product_ids is None:
            return

        cleaned_ids = sorted({int(product_id) for product_id in product_ids if product_id})
        await self.db.execute(delete(SupplierProducts).where(SupplierProducts.supplier_id == supplier_id))
        for product_id in cleaned_ids:
            self.db.add(SupplierProducts(supplier_id=supplier_id, product_id=product_id))

    async def _to_response(self, obj: Suppliers) -> Dict[str, Any]:
        data = {
            "id": obj.id,
            "name": obj.name,
            "code": obj.code,
            "contact_person": obj.contact_person,
            "phone": obj.phone,
            "email": obj.email,
            "address": obj.address,
            "marketing_name": obj.marketing_name,
            "marketing_phone": obj.marketing_phone,
            "marketing_email": obj.marketing_email,
            "branch_id": obj.branch_id,
            "warehouse_id": obj.warehouse_id,
            "payment_type_id": obj.payment_type_id,
            "payment_terms": obj.payment_terms,
            "lead_time_days": obj.lead_time_days,
            "tax_number": obj.tax_number,
            "notes": obj.notes,
            "status": obj.status,
            "created_at": obj.created_at,
            "product_ids": await self._get_product_ids(obj.id),
        }
        return data

    async def create(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create a new suppliers"""
        try:
            product_ids = data.pop("product_ids", None)
            obj = Suppliers(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            await self._sync_product_ids(obj.id, product_ids)
            await self.db.commit()
            logger.info(f"Created suppliers with id: {obj.id}")
            return await self._to_response(obj)
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating suppliers: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Dict[str, Any]]:
        """Get suppliers by ID"""
        try:
            query = select(Suppliers).where(Suppliers.id == obj_id)
            result = await self.db.execute(query)
            obj = result.scalar_one_or_none()
            if not obj:
                return None
            return await self._to_response(obj)
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
            response_items = [await self._to_response(item) for item in items]

            return {
                "items": response_items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching suppliers list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update suppliers"""
        try:
            result = await self.db.execute(select(Suppliers).where(Suppliers.id == obj_id))
            obj = result.scalar_one_or_none()
            if not obj:
                logger.warning(f"Suppliers {obj_id} not found for update")
                return None
            product_ids = update_data.pop("product_ids", None)
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            await self._sync_product_ids(obj_id, product_ids)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated suppliers {obj_id}")
            return await self._to_response(obj)
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating suppliers {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete suppliers"""
        try:
            result = await self.db.execute(select(Suppliers).where(Suppliers.id == obj_id))
            obj = result.scalar_one_or_none()
            if not obj:
                logger.warning(f"Suppliers {obj_id} not found for deletion")
                return False
            await self.db.execute(delete(SupplierProducts).where(SupplierProducts.supplier_id == obj_id))
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
