import json
import logging
from typing import List, Optional


from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.receiving_lines import Receiving_linesService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/receiving_lines", tags=["receiving_lines"])


# ---------- Pydantic Schemas ----------
class Receiving_linesData(BaseModel):
    """Entity data schema (for create/update)"""
    receiving_document_id: int
    product_id: int
    expected_quantity: float = None
    received_quantity: float = None
    lot_number: str = None
    expiry_date: str = None
    qc_status: str = None
    notes: str = None


class Receiving_linesUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    receiving_document_id: Optional[int] = None
    product_id: Optional[int] = None
    expected_quantity: Optional[float] = None
    received_quantity: Optional[float] = None
    lot_number: Optional[str] = None
    expiry_date: Optional[str] = None
    qc_status: Optional[str] = None
    notes: Optional[str] = None


class Receiving_linesResponse(BaseModel):
    """Entity response schema"""
    id: int
    receiving_document_id: int
    product_id: int
    expected_quantity: Optional[float] = None
    received_quantity: Optional[float] = None
    lot_number: Optional[str] = None
    expiry_date: Optional[str] = None
    qc_status: Optional[str] = None
    notes: Optional[str] = None

    class Config:
        from_attributes = True


class Receiving_linesListResponse(BaseModel):
    """List response schema"""
    items: List[Receiving_linesResponse]
    total: int
    skip: int
    limit: int


class Receiving_linesBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Receiving_linesData]


class Receiving_linesBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Receiving_linesUpdateData


class Receiving_linesBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Receiving_linesBatchUpdateItem]


class Receiving_linesBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Receiving_linesListResponse)
async def query_receiving_liness(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query receiving_liness with filtering, sorting, and pagination"""
    logger.debug(f"Querying receiving_liness: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Receiving_linesService(db)
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
        logger.debug(f"Found {result['total']} receiving_liness")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying receiving_liness: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Receiving_linesListResponse)
async def query_receiving_liness_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query receiving_liness with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying receiving_liness: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Receiving_linesService(db)
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
        logger.debug(f"Found {result['total']} receiving_liness")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying receiving_liness: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Receiving_linesResponse)
async def get_receiving_lines(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single receiving_lines by ID"""
    logger.debug(f"Fetching receiving_lines with id: {id}, fields={fields}")
    
    service = Receiving_linesService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Receiving_lines with id {id} not found")
            raise HTTPException(status_code=404, detail="Receiving_lines not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching receiving_lines {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Receiving_linesResponse, status_code=201)
async def create_receiving_lines(
    data: Receiving_linesData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new receiving_lines"""
    logger.debug(f"Creating new receiving_lines with data: {data}")
    
    service = Receiving_linesService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create receiving_lines")
        
        logger.info(f"Receiving_lines created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating receiving_lines: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating receiving_lines: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Receiving_linesResponse], status_code=201)
async def create_receiving_liness_batch(
    request: Receiving_linesBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple receiving_liness in a single request"""
    logger.debug(f"Batch creating {len(request.items)} receiving_liness")
    
    service = Receiving_linesService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} receiving_liness successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Receiving_linesResponse])
async def update_receiving_liness_batch(
    request: Receiving_linesBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple receiving_liness in a single request"""
    logger.debug(f"Batch updating {len(request.items)} receiving_liness")
    
    service = Receiving_linesService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} receiving_liness successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Receiving_linesResponse)
async def update_receiving_lines(
    id: int,
    data: Receiving_linesUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing receiving_lines"""
    logger.debug(f"Updating receiving_lines {id} with data: {data}")

    service = Receiving_linesService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Receiving_lines with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Receiving_lines not found")
        
        logger.info(f"Receiving_lines {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating receiving_lines {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating receiving_lines {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_receiving_liness_batch(
    request: Receiving_linesBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple receiving_liness by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} receiving_liness")
    
    service = Receiving_linesService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} receiving_liness successfully")
        return {"message": f"Successfully deleted {deleted_count} receiving_liness", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_receiving_lines(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single receiving_lines by ID"""
    logger.debug(f"Deleting receiving_lines with id: {id}")
    
    service = Receiving_linesService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Receiving_lines with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Receiving_lines not found")
        
        logger.info(f"Receiving_lines {id} deleted successfully")
        return {"message": "Receiving_lines deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting receiving_lines {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")