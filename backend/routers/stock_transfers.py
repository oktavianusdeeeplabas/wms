import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.stock_transfers import Stock_transfersService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/stock_transfers", tags=["stock_transfers"])


# ---------- Pydantic Schemas ----------
class Stock_transfersData(BaseModel):
    """Entity data schema (for create/update)"""
    transfer_number: str
    from_warehouse_id: int
    to_warehouse_id: int
    from_branch_id: int = None
    to_branch_id: int = None
    product_id: int = None
    quantity: float = None
    lot_number: str = None
    status: str = None
    requested_date: Optional[datetime] = None
    shipped_date: Optional[datetime] = None
    received_date: Optional[datetime] = None
    notes: str = None
    created_at: Optional[datetime] = None


class Stock_transfersUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    transfer_number: Optional[str] = None
    from_warehouse_id: Optional[int] = None
    to_warehouse_id: Optional[int] = None
    from_branch_id: Optional[int] = None
    to_branch_id: Optional[int] = None
    product_id: Optional[int] = None
    quantity: Optional[float] = None
    lot_number: Optional[str] = None
    status: Optional[str] = None
    requested_date: Optional[datetime] = None
    shipped_date: Optional[datetime] = None
    received_date: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None


class Stock_transfersResponse(BaseModel):
    """Entity response schema"""
    id: int
    transfer_number: str
    from_warehouse_id: int
    to_warehouse_id: int
    from_branch_id: Optional[int] = None
    to_branch_id: Optional[int] = None
    product_id: Optional[int] = None
    quantity: Optional[float] = None
    lot_number: Optional[str] = None
    status: Optional[str] = None
    requested_date: Optional[datetime] = None
    shipped_date: Optional[datetime] = None
    received_date: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Stock_transfersListResponse(BaseModel):
    """List response schema"""
    items: List[Stock_transfersResponse]
    total: int
    skip: int
    limit: int


class Stock_transfersBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Stock_transfersData]


class Stock_transfersBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Stock_transfersUpdateData


class Stock_transfersBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Stock_transfersBatchUpdateItem]


class Stock_transfersBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Stock_transfersListResponse)
async def query_stock_transferss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query stock_transferss with filtering, sorting, and pagination"""
    logger.debug(f"Querying stock_transferss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Stock_transfersService(db)
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
        logger.debug(f"Found {result['total']} stock_transferss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying stock_transferss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Stock_transfersListResponse)
async def query_stock_transferss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query stock_transferss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying stock_transferss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Stock_transfersService(db)
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
        logger.debug(f"Found {result['total']} stock_transferss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying stock_transferss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Stock_transfersResponse)
async def get_stock_transfers(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single stock_transfers by ID"""
    logger.debug(f"Fetching stock_transfers with id: {id}, fields={fields}")
    
    service = Stock_transfersService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Stock_transfers with id {id} not found")
            raise HTTPException(status_code=404, detail="Stock_transfers not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching stock_transfers {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Stock_transfersResponse, status_code=201)
async def create_stock_transfers(
    data: Stock_transfersData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new stock_transfers"""
    logger.debug(f"Creating new stock_transfers with data: {data}")
    
    service = Stock_transfersService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create stock_transfers")
        
        logger.info(f"Stock_transfers created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating stock_transfers: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating stock_transfers: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Stock_transfersResponse], status_code=201)
async def create_stock_transferss_batch(
    request: Stock_transfersBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple stock_transferss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} stock_transferss")
    
    service = Stock_transfersService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} stock_transferss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Stock_transfersResponse])
async def update_stock_transferss_batch(
    request: Stock_transfersBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple stock_transferss in a single request"""
    logger.debug(f"Batch updating {len(request.items)} stock_transferss")
    
    service = Stock_transfersService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} stock_transferss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Stock_transfersResponse)
async def update_stock_transfers(
    id: int,
    data: Stock_transfersUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing stock_transfers"""
    logger.debug(f"Updating stock_transfers {id} with data: {data}")

    service = Stock_transfersService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Stock_transfers with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Stock_transfers not found")
        
        logger.info(f"Stock_transfers {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating stock_transfers {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating stock_transfers {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_stock_transferss_batch(
    request: Stock_transfersBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple stock_transferss by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} stock_transferss")
    
    service = Stock_transfersService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} stock_transferss successfully")
        return {"message": f"Successfully deleted {deleted_count} stock_transferss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_stock_transfers(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single stock_transfers by ID"""
    logger.debug(f"Deleting stock_transfers with id: {id}")
    
    service = Stock_transfersService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Stock_transfers with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Stock_transfers not found")
        
        logger.info(f"Stock_transfers {id} deleted successfully")
        return {"message": "Stock_transfers deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting stock_transfers {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")