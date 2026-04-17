import json
import logging
from typing import List, Optional


from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.stock_movements import Stock_movementsService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/stock_movements", tags=["stock_movements"])


# ---------- Pydantic Schemas ----------
class Stock_movementsData(BaseModel):
    """Entity data schema (for create/update)"""
    product_id: int
    lot_id: int = None
    movement_type: str
    quantity: float
    from_zone_id: int = None
    from_bin_id: int = None
    to_zone_id: int = None
    to_bin_id: int = None
    reference_type: str = None
    reference_id: int = None
    notes: str = None
    created_at: str = None


class Stock_movementsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    product_id: Optional[int] = None
    lot_id: Optional[int] = None
    movement_type: Optional[str] = None
    quantity: Optional[float] = None
    from_zone_id: Optional[int] = None
    from_bin_id: Optional[int] = None
    to_zone_id: Optional[int] = None
    to_bin_id: Optional[int] = None
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    notes: Optional[str] = None
    created_at: Optional[str] = None


class Stock_movementsResponse(BaseModel):
    """Entity response schema"""
    id: int
    product_id: int
    lot_id: Optional[int] = None
    movement_type: str
    quantity: float
    from_zone_id: Optional[int] = None
    from_bin_id: Optional[int] = None
    to_zone_id: Optional[int] = None
    to_bin_id: Optional[int] = None
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    notes: Optional[str] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class Stock_movementsListResponse(BaseModel):
    """List response schema"""
    items: List[Stock_movementsResponse]
    total: int
    skip: int
    limit: int


class Stock_movementsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Stock_movementsData]


class Stock_movementsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Stock_movementsUpdateData


class Stock_movementsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Stock_movementsBatchUpdateItem]


class Stock_movementsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Stock_movementsListResponse)
async def query_stock_movementss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query stock_movementss with filtering, sorting, and pagination"""
    logger.debug(f"Querying stock_movementss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Stock_movementsService(db)
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
        logger.debug(f"Found {result['total']} stock_movementss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying stock_movementss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Stock_movementsListResponse)
async def query_stock_movementss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query stock_movementss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying stock_movementss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Stock_movementsService(db)
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
        logger.debug(f"Found {result['total']} stock_movementss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying stock_movementss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Stock_movementsResponse)
async def get_stock_movements(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single stock_movements by ID"""
    logger.debug(f"Fetching stock_movements with id: {id}, fields={fields}")
    
    service = Stock_movementsService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Stock_movements with id {id} not found")
            raise HTTPException(status_code=404, detail="Stock_movements not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching stock_movements {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Stock_movementsResponse, status_code=201)
async def create_stock_movements(
    data: Stock_movementsData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new stock_movements"""
    logger.debug(f"Creating new stock_movements with data: {data}")
    
    service = Stock_movementsService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create stock_movements")
        
        logger.info(f"Stock_movements created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating stock_movements: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating stock_movements: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Stock_movementsResponse], status_code=201)
async def create_stock_movementss_batch(
    request: Stock_movementsBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple stock_movementss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} stock_movementss")
    
    service = Stock_movementsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} stock_movementss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Stock_movementsResponse])
async def update_stock_movementss_batch(
    request: Stock_movementsBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple stock_movementss in a single request"""
    logger.debug(f"Batch updating {len(request.items)} stock_movementss")
    
    service = Stock_movementsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} stock_movementss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Stock_movementsResponse)
async def update_stock_movements(
    id: int,
    data: Stock_movementsUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing stock_movements"""
    logger.debug(f"Updating stock_movements {id} with data: {data}")

    service = Stock_movementsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Stock_movements with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Stock_movements not found")
        
        logger.info(f"Stock_movements {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating stock_movements {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating stock_movements {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_stock_movementss_batch(
    request: Stock_movementsBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple stock_movementss by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} stock_movementss")
    
    service = Stock_movementsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} stock_movementss successfully")
        return {"message": f"Successfully deleted {deleted_count} stock_movementss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_stock_movements(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single stock_movements by ID"""
    logger.debug(f"Deleting stock_movements with id: {id}")
    
    service = Stock_movementsService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Stock_movements with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Stock_movements not found")
        
        logger.info(f"Stock_movements {id} deleted successfully")
        return {"message": "Stock_movements deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting stock_movements {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")