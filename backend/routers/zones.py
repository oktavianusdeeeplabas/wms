import json
import logging
from typing import List, Optional


from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.zones import ZonesService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/zones", tags=["zones"])


# ---------- Pydantic Schemas ----------
class ZonesData(BaseModel):
    """Entity data schema (for create/update)"""
    warehouse_id: int
    name: str
    code: str
    temperature_type: str = None
    status: str = None


class ZonesUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    warehouse_id: Optional[int] = None
    name: Optional[str] = None
    code: Optional[str] = None
    temperature_type: Optional[str] = None
    status: Optional[str] = None


class ZonesResponse(BaseModel):
    """Entity response schema"""
    id: int
    warehouse_id: int
    name: str
    code: str
    temperature_type: Optional[str] = None
    status: Optional[str] = None

    class Config:
        from_attributes = True


class ZonesListResponse(BaseModel):
    """List response schema"""
    items: List[ZonesResponse]
    total: int
    skip: int
    limit: int


class ZonesBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[ZonesData]


class ZonesBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: ZonesUpdateData


class ZonesBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[ZonesBatchUpdateItem]


class ZonesBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=ZonesListResponse)
async def query_zoness(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query zoness with filtering, sorting, and pagination"""
    logger.debug(f"Querying zoness: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = ZonesService(db)
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
        logger.debug(f"Found {result['total']} zoness")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying zoness: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=ZonesListResponse)
async def query_zoness_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query zoness with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying zoness: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = ZonesService(db)
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
        logger.debug(f"Found {result['total']} zoness")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying zoness: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=ZonesResponse)
async def get_zones(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single zones by ID"""
    logger.debug(f"Fetching zones with id: {id}, fields={fields}")
    
    service = ZonesService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Zones with id {id} not found")
            raise HTTPException(status_code=404, detail="Zones not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching zones {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=ZonesResponse, status_code=201)
async def create_zones(
    data: ZonesData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new zones"""
    logger.debug(f"Creating new zones with data: {data}")
    
    service = ZonesService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create zones")
        
        logger.info(f"Zones created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating zones: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating zones: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[ZonesResponse], status_code=201)
async def create_zoness_batch(
    request: ZonesBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple zoness in a single request"""
    logger.debug(f"Batch creating {len(request.items)} zoness")
    
    service = ZonesService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} zoness successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[ZonesResponse])
async def update_zoness_batch(
    request: ZonesBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple zoness in a single request"""
    logger.debug(f"Batch updating {len(request.items)} zoness")
    
    service = ZonesService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} zoness successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=ZonesResponse)
async def update_zones(
    id: int,
    data: ZonesUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing zones"""
    logger.debug(f"Updating zones {id} with data: {data}")

    service = ZonesService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Zones with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Zones not found")
        
        logger.info(f"Zones {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating zones {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating zones {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_zoness_batch(
    request: ZonesBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple zoness by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} zoness")
    
    service = ZonesService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} zoness successfully")
        return {"message": f"Successfully deleted {deleted_count} zoness", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_zones(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single zones by ID"""
    logger.debug(f"Deleting zones with id: {id}")
    
    service = ZonesService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Zones with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Zones not found")
        
        logger.info(f"Zones {id} deleted successfully")
        return {"message": "Zones deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting zones {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")