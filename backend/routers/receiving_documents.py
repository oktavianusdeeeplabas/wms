import json
import logging
from typing import List, Optional


from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.receiving_documents import Receiving_documentsService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/receiving_documents", tags=["receiving_documents"])


# ---------- Pydantic Schemas ----------
class Receiving_documentsData(BaseModel):
    """Entity data schema (for create/update)"""
    document_number: str
    supplier_id: int = None
    warehouse_id: int = None
    status: str = None
    expected_date: str = None
    received_date: str = None
    notes: str = None
    created_at: str = None


class Receiving_documentsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    document_number: Optional[str] = None
    supplier_id: Optional[int] = None
    warehouse_id: Optional[int] = None
    status: Optional[str] = None
    expected_date: Optional[str] = None
    received_date: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[str] = None


class Receiving_documentsResponse(BaseModel):
    """Entity response schema"""
    id: int
    document_number: str
    supplier_id: Optional[int] = None
    warehouse_id: Optional[int] = None
    status: Optional[str] = None
    expected_date: Optional[str] = None
    received_date: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class Receiving_documentsListResponse(BaseModel):
    """List response schema"""
    items: List[Receiving_documentsResponse]
    total: int
    skip: int
    limit: int


class Receiving_documentsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Receiving_documentsData]


class Receiving_documentsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Receiving_documentsUpdateData


class Receiving_documentsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Receiving_documentsBatchUpdateItem]


class Receiving_documentsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Receiving_documentsListResponse)
async def query_receiving_documentss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query receiving_documentss with filtering, sorting, and pagination"""
    logger.debug(f"Querying receiving_documentss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Receiving_documentsService(db)
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
        logger.debug(f"Found {result['total']} receiving_documentss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying receiving_documentss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Receiving_documentsListResponse)
async def query_receiving_documentss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query receiving_documentss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying receiving_documentss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Receiving_documentsService(db)
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
        logger.debug(f"Found {result['total']} receiving_documentss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying receiving_documentss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Receiving_documentsResponse)
async def get_receiving_documents(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single receiving_documents by ID"""
    logger.debug(f"Fetching receiving_documents with id: {id}, fields={fields}")
    
    service = Receiving_documentsService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Receiving_documents with id {id} not found")
            raise HTTPException(status_code=404, detail="Receiving_documents not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching receiving_documents {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Receiving_documentsResponse, status_code=201)
async def create_receiving_documents(
    data: Receiving_documentsData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new receiving_documents"""
    logger.debug(f"Creating new receiving_documents with data: {data}")
    
    service = Receiving_documentsService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create receiving_documents")
        
        logger.info(f"Receiving_documents created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating receiving_documents: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating receiving_documents: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Receiving_documentsResponse], status_code=201)
async def create_receiving_documentss_batch(
    request: Receiving_documentsBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple receiving_documentss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} receiving_documentss")
    
    service = Receiving_documentsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} receiving_documentss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Receiving_documentsResponse])
async def update_receiving_documentss_batch(
    request: Receiving_documentsBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple receiving_documentss in a single request"""
    logger.debug(f"Batch updating {len(request.items)} receiving_documentss")
    
    service = Receiving_documentsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} receiving_documentss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Receiving_documentsResponse)
async def update_receiving_documents(
    id: int,
    data: Receiving_documentsUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing receiving_documents"""
    logger.debug(f"Updating receiving_documents {id} with data: {data}")

    service = Receiving_documentsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Receiving_documents with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Receiving_documents not found")
        
        logger.info(f"Receiving_documents {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating receiving_documents {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating receiving_documents {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_receiving_documentss_batch(
    request: Receiving_documentsBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple receiving_documentss by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} receiving_documentss")
    
    service = Receiving_documentsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} receiving_documentss successfully")
        return {"message": f"Successfully deleted {deleted_count} receiving_documentss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_receiving_documents(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single receiving_documents by ID"""
    logger.debug(f"Deleting receiving_documents with id: {id}")
    
    service = Receiving_documentsService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Receiving_documents with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Receiving_documents not found")
        
        logger.info(f"Receiving_documents {id} deleted successfully")
        return {"message": "Receiving_documents deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting receiving_documents {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")