import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.branches import BranchesService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/branches", tags=["branches"])


# ---------- Pydantic Schemas ----------
class BranchesData(BaseModel):
    """Entity data schema (for create/update)"""
    name: str
    code: str
    address: str = None
    contact_name: str = None
    phone: str = None
    email: str = None
    status: str = None
    created_at: Optional[datetime] = None


class BranchesUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    name: Optional[str] = None
    code: Optional[str] = None
    address: Optional[str] = None
    contact_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    status: Optional[str] = None
    created_at: Optional[datetime] = None


class BranchesResponse(BaseModel):
    """Entity response schema"""
    id: int
    name: str
    code: str
    address: Optional[str] = None
    contact_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    status: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class BranchesListResponse(BaseModel):
    """List response schema"""
    items: List[BranchesResponse]
    total: int
    skip: int
    limit: int


class BranchesBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[BranchesData]


class BranchesBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: BranchesUpdateData


class BranchesBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[BranchesBatchUpdateItem]


class BranchesBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=BranchesListResponse)
async def query_branchess(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query branchess with filtering, sorting, and pagination"""
    logger.debug(f"Querying branchess: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = BranchesService(db)
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
        logger.debug(f"Found {result['total']} branchess")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying branchess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=BranchesListResponse)
async def query_branchess_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query branchess with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying branchess: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = BranchesService(db)
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
        logger.debug(f"Found {result['total']} branchess")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying branchess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=BranchesResponse)
async def get_branches(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single branches by ID"""
    logger.debug(f"Fetching branches with id: {id}, fields={fields}")
    
    service = BranchesService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Branches with id {id} not found")
            raise HTTPException(status_code=404, detail="Branches not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching branches {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=BranchesResponse, status_code=201)
async def create_branches(
    data: BranchesData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new branches"""
    logger.debug(f"Creating new branches with data: {data}")
    
    service = BranchesService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create branches")
        
        logger.info(f"Branches created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating branches: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating branches: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[BranchesResponse], status_code=201)
async def create_branchess_batch(
    request: BranchesBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple branchess in a single request"""
    logger.debug(f"Batch creating {len(request.items)} branchess")
    
    service = BranchesService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} branchess successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[BranchesResponse])
async def update_branchess_batch(
    request: BranchesBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple branchess in a single request"""
    logger.debug(f"Batch updating {len(request.items)} branchess")
    
    service = BranchesService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} branchess successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=BranchesResponse)
async def update_branches(
    id: int,
    data: BranchesUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing branches"""
    logger.debug(f"Updating branches {id} with data: {data}")

    service = BranchesService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Branches with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Branches not found")
        
        logger.info(f"Branches {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating branches {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating branches {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_branchess_batch(
    request: BranchesBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple branchess by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} branchess")
    
    service = BranchesService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} branchess successfully")
        return {"message": f"Successfully deleted {deleted_count} branchess", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_branches(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single branches by ID"""
    logger.debug(f"Deleting branches with id: {id}")
    
    service = BranchesService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Branches with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Branches not found")
        
        logger.info(f"Branches {id} deleted successfully")
        return {"message": "Branches deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting branches {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")