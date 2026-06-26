import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.warehouses import WarehousesService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/warehouses", tags=["warehouses"])


# ---------- Pydantic Schemas ----------
class WarehousesData(BaseModel):
    """Entity data schema (for create/update)"""
    name: str
    code: str
    address: str = None
    detail: str = None
    capacity: int = None
    manager: str = None
    branch_id: int = None
    status: str = None
    created_at: Optional[datetime] = None


class WarehousesUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    name: Optional[str] = None
    code: Optional[str] = None
    address: Optional[str] = None
    detail: Optional[str] = None
    capacity: Optional[int] = None
    manager: Optional[str] = None
    branch_id: Optional[int] = None
    status: Optional[str] = None
    created_at: Optional[datetime] = None


class WarehousesResponse(BaseModel):
    """Entity response schema"""
    id: int
    name: str
    code: str
    address: Optional[str] = None
    detail: Optional[str] = None
    capacity: Optional[int] = None
    manager: Optional[str] = None
    branch_id: Optional[int] = None
    status: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class WarehousesListResponse(BaseModel):
    """List response schema"""
    items: List[WarehousesResponse]
    total: int
    skip: int
    limit: int


class WarehousesBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[WarehousesData]


class WarehousesBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: WarehousesUpdateData


class WarehousesBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[WarehousesBatchUpdateItem]


class WarehousesBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=WarehousesListResponse)
async def query_warehousess(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query warehousess with filtering, sorting, and pagination"""
    logger.debug(f"Querying warehousess: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = WarehousesService(db)
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
        logger.debug(f"Found {result['total']} warehousess")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying warehousess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=WarehousesListResponse)
async def query_warehousess_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query warehousess with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying warehousess: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = WarehousesService(db)
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
        logger.debug(f"Found {result['total']} warehousess")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying warehousess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=WarehousesResponse)
async def get_warehouses(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single warehouses by ID"""
    logger.debug(f"Fetching warehouses with id: {id}, fields={fields}")
    
    service = WarehousesService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Warehouses with id {id} not found")
            raise HTTPException(status_code=404, detail="Warehouses not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching warehouses {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=WarehousesResponse, status_code=201)
async def create_warehouses(
    data: WarehousesData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new warehouses"""
    logger.debug(f"Creating new warehouses with data: {data}")
    
    service = WarehousesService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create warehouses")
        
        logger.info(f"Warehouses created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating warehouses: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating warehouses: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[WarehousesResponse], status_code=201)
async def create_warehousess_batch(
    request: WarehousesBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple warehousess in a single request"""
    logger.debug(f"Batch creating {len(request.items)} warehousess")
    
    service = WarehousesService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} warehousess successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[WarehousesResponse])
async def update_warehousess_batch(
    request: WarehousesBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple warehousess in a single request"""
    logger.debug(f"Batch updating {len(request.items)} warehousess")
    
    service = WarehousesService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} warehousess successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=WarehousesResponse)
async def update_warehouses(
    id: int,
    data: WarehousesUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing warehouses"""
    logger.debug(f"Updating warehouses {id} with data: {data}")

    service = WarehousesService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Warehouses with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Warehouses not found")
        
        logger.info(f"Warehouses {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating warehouses {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating warehouses {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_warehousess_batch(
    request: WarehousesBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple warehousess by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} warehousess")
    
    service = WarehousesService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} warehousess successfully")
        return {"message": f"Successfully deleted {deleted_count} warehousess", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_warehouses(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single warehouses by ID"""
    logger.debug(f"Deleting warehouses with id: {id}")
    
    service = WarehousesService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Warehouses with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Warehouses not found")
        
        logger.info(f"Warehouses {id} deleted successfully")
        return {"message": "Warehouses deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting warehouses {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
