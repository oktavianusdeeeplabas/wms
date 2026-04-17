import json
import logging
from typing import List, Optional


from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.inventory_lots import Inventory_lotsService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/inventory_lots", tags=["inventory_lots"])


# ---------- Pydantic Schemas ----------
class Inventory_lotsData(BaseModel):
    """Entity data schema (for create/update)"""
    product_id: int
    lot_number: str
    batch_number: str = None
    zone_id: int = None
    bin_id: int = None
    quantity: float = None
    received_date: str = None
    expiry_date: str = None
    status: str = None
    supplier_id: int = None
    cost_per_unit: float = None


class Inventory_lotsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    product_id: Optional[int] = None
    lot_number: Optional[str] = None
    batch_number: Optional[str] = None
    zone_id: Optional[int] = None
    bin_id: Optional[int] = None
    quantity: Optional[float] = None
    received_date: Optional[str] = None
    expiry_date: Optional[str] = None
    status: Optional[str] = None
    supplier_id: Optional[int] = None
    cost_per_unit: Optional[float] = None


class Inventory_lotsResponse(BaseModel):
    """Entity response schema"""
    id: int
    product_id: int
    lot_number: str
    batch_number: Optional[str] = None
    zone_id: Optional[int] = None
    bin_id: Optional[int] = None
    quantity: Optional[float] = None
    received_date: Optional[str] = None
    expiry_date: Optional[str] = None
    status: Optional[str] = None
    supplier_id: Optional[int] = None
    cost_per_unit: Optional[float] = None

    class Config:
        from_attributes = True


class Inventory_lotsListResponse(BaseModel):
    """List response schema"""
    items: List[Inventory_lotsResponse]
    total: int
    skip: int
    limit: int


class Inventory_lotsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Inventory_lotsData]


class Inventory_lotsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Inventory_lotsUpdateData


class Inventory_lotsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Inventory_lotsBatchUpdateItem]


class Inventory_lotsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Inventory_lotsListResponse)
async def query_inventory_lotss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query inventory_lotss with filtering, sorting, and pagination"""
    logger.debug(f"Querying inventory_lotss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Inventory_lotsService(db)
    try:
        # Parse query JSON if provided
        query_dict = None
        if query:
            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid query JSON format")
        
        result = await service.get_list(
            skip=skip, 
            limit=limit,
            query_dict=query_dict,
            sort=sort,
        )
        logger.debug(f"Found {result['total']} inventory_lotss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying inventory_lotss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Inventory_lotsListResponse)
async def query_inventory_lotss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query inventory_lotss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying inventory_lotss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Inventory_lotsService(db)
    try:
        # Parse query JSON if provided
        query_dict = None
        if query:
            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid query JSON format")

        result = await service.get_list(
            skip=skip,
            limit=limit,
            query_dict=query_dict,
            sort=sort
        )
        logger.debug(f"Found {result['total']} inventory_lotss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying inventory_lotss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Inventory_lotsResponse)
async def get_inventory_lots(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single inventory_lots by ID"""
    logger.debug(f"Fetching inventory_lots with id: {id}, fields={fields}")
    
    service = Inventory_lotsService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Inventory_lots with id {id} not found")
            raise HTTPException(status_code=404, detail="Inventory_lots not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching inventory_lots {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Inventory_lotsResponse, status_code=201)
async def create_inventory_lots(
    data: Inventory_lotsData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new inventory_lots"""
    logger.debug(f"Creating new inventory_lots with data: {data}")
    
    service = Inventory_lotsService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create inventory_lots")
        
        logger.info(f"Inventory_lots created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating inventory_lots: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating inventory_lots: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Inventory_lotsResponse], status_code=201)
async def create_inventory_lotss_batch(
    request: Inventory_lotsBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple inventory_lotss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} inventory_lotss")
    
    service = Inventory_lotsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} inventory_lotss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Inventory_lotsResponse])
async def update_inventory_lotss_batch(
    request: Inventory_lotsBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple inventory_lotss in a single request"""
    logger.debug(f"Batch updating {len(request.items)} inventory_lotss")
    
    service = Inventory_lotsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} inventory_lotss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Inventory_lotsResponse)
async def update_inventory_lots(
    id: int,
    data: Inventory_lotsUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing inventory_lots"""
    logger.debug(f"Updating inventory_lots {id} with data: {data}")

    service = Inventory_lotsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Inventory_lots with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Inventory_lots not found")
        
        logger.info(f"Inventory_lots {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating inventory_lots {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating inventory_lots {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_inventory_lotss_batch(
    request: Inventory_lotsBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple inventory_lotss by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} inventory_lotss")
    
    service = Inventory_lotsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} inventory_lotss successfully")
        return {"message": f"Successfully deleted {deleted_count} inventory_lotss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_inventory_lots(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single inventory_lots by ID"""
    logger.debug(f"Deleting inventory_lots with id: {id}")
    
    service = Inventory_lotsService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Inventory_lots with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Inventory_lots not found")
        
        logger.info(f"Inventory_lots {id} deleted successfully")
        return {"message": "Inventory_lots deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting inventory_lots {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")