import json
import logging
from typing import List, Optional


from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.bins import BinsService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/bins", tags=["bins"])


# ---------- Pydantic Schemas ----------
class BinsData(BaseModel):
    """Entity data schema (for create/update)"""
    zone_id: int
    name: str
    code: str
    capacity: int = None
    status: str = None


class BinsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    zone_id: Optional[int] = None
    name: Optional[str] = None
    code: Optional[str] = None
    capacity: Optional[int] = None
    status: Optional[str] = None


class BinsResponse(BaseModel):
    """Entity response schema"""
    id: int
    zone_id: int
    name: str
    code: str
    capacity: Optional[int] = None
    status: Optional[str] = None

    class Config:
        from_attributes = True


class BinsListResponse(BaseModel):
    """List response schema"""
    items: List[BinsResponse]
    total: int
    skip: int
    limit: int


class BinsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[BinsData]


class BinsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: BinsUpdateData


class BinsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[BinsBatchUpdateItem]


class BinsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=BinsListResponse)
async def query_binss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query binss with filtering, sorting, and pagination"""
    logger.debug(f"Querying binss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = BinsService(db)
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
        logger.debug(f"Found {result['total']} binss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying binss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=BinsListResponse)
async def query_binss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query binss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying binss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = BinsService(db)
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
        logger.debug(f"Found {result['total']} binss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying binss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=BinsResponse)
async def get_bins(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single bins by ID"""
    logger.debug(f"Fetching bins with id: {id}, fields={fields}")
    
    service = BinsService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Bins with id {id} not found")
            raise HTTPException(status_code=404, detail="Bins not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching bins {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=BinsResponse, status_code=201)
async def create_bins(
    data: BinsData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new bins"""
    logger.debug(f"Creating new bins with data: {data}")
    
    service = BinsService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create bins")
        
        logger.info(f"Bins created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating bins: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating bins: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[BinsResponse], status_code=201)
async def create_binss_batch(
    request: BinsBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple binss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} binss")
    
    service = BinsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} binss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[BinsResponse])
async def update_binss_batch(
    request: BinsBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple binss in a single request"""
    logger.debug(f"Batch updating {len(request.items)} binss")
    
    service = BinsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} binss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=BinsResponse)
async def update_bins(
    id: int,
    data: BinsUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing bins"""
    logger.debug(f"Updating bins {id} with data: {data}")

    service = BinsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Bins with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Bins not found")
        
        logger.info(f"Bins {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating bins {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating bins {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_binss_batch(
    request: BinsBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple binss by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} binss")
    
    service = BinsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} binss successfully")
        return {"message": f"Successfully deleted {deleted_count} binss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_bins(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single bins by ID"""
    logger.debug(f"Deleting bins with id: {id}")
    
    service = BinsService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Bins with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Bins not found")
        
        logger.info(f"Bins {id} deleted successfully")
        return {"message": "Bins deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting bins {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")