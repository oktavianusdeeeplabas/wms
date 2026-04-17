import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.bom_recipes import Bom_recipesService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/bom_recipes", tags=["bom_recipes"])


# ---------- Pydantic Schemas ----------
class Bom_recipesData(BaseModel):
    """Entity data schema (for create/update)"""
    name: str
    code: str
    product_id: int = None
    category: str = None
    yield_quantity: float = None
    yield_unit: str = None
    prep_time_minutes: int = None
    cook_time_minutes: int = None
    version: int = None
    status: str = None
    notes: str = None
    created_at: Optional[datetime] = None


class Bom_recipesUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    name: Optional[str] = None
    code: Optional[str] = None
    product_id: Optional[int] = None
    category: Optional[str] = None
    yield_quantity: Optional[float] = None
    yield_unit: Optional[str] = None
    prep_time_minutes: Optional[int] = None
    cook_time_minutes: Optional[int] = None
    version: Optional[int] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None


class Bom_recipesResponse(BaseModel):
    """Entity response schema"""
    id: int
    name: str
    code: str
    product_id: Optional[int] = None
    category: Optional[str] = None
    yield_quantity: Optional[float] = None
    yield_unit: Optional[str] = None
    prep_time_minutes: Optional[int] = None
    cook_time_minutes: Optional[int] = None
    version: Optional[int] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Bom_recipesListResponse(BaseModel):
    """List response schema"""
    items: List[Bom_recipesResponse]
    total: int
    skip: int
    limit: int


class Bom_recipesBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Bom_recipesData]


class Bom_recipesBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Bom_recipesUpdateData


class Bom_recipesBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Bom_recipesBatchUpdateItem]


class Bom_recipesBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Bom_recipesListResponse)
async def query_bom_recipess(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query bom_recipess with filtering, sorting, and pagination"""
    logger.debug(f"Querying bom_recipess: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Bom_recipesService(db)
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
        logger.debug(f"Found {result['total']} bom_recipess")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying bom_recipess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Bom_recipesListResponse)
async def query_bom_recipess_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query bom_recipess with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying bom_recipess: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Bom_recipesService(db)
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
        logger.debug(f"Found {result['total']} bom_recipess")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying bom_recipess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Bom_recipesResponse)
async def get_bom_recipes(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single bom_recipes by ID"""
    logger.debug(f"Fetching bom_recipes with id: {id}, fields={fields}")
    
    service = Bom_recipesService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Bom_recipes with id {id} not found")
            raise HTTPException(status_code=404, detail="Bom_recipes not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching bom_recipes {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Bom_recipesResponse, status_code=201)
async def create_bom_recipes(
    data: Bom_recipesData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new bom_recipes"""
    logger.debug(f"Creating new bom_recipes with data: {data}")
    
    service = Bom_recipesService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create bom_recipes")
        
        logger.info(f"Bom_recipes created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating bom_recipes: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating bom_recipes: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Bom_recipesResponse], status_code=201)
async def create_bom_recipess_batch(
    request: Bom_recipesBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple bom_recipess in a single request"""
    logger.debug(f"Batch creating {len(request.items)} bom_recipess")
    
    service = Bom_recipesService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} bom_recipess successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Bom_recipesResponse])
async def update_bom_recipess_batch(
    request: Bom_recipesBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple bom_recipess in a single request"""
    logger.debug(f"Batch updating {len(request.items)} bom_recipess")
    
    service = Bom_recipesService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} bom_recipess successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Bom_recipesResponse)
async def update_bom_recipes(
    id: int,
    data: Bom_recipesUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing bom_recipes"""
    logger.debug(f"Updating bom_recipes {id} with data: {data}")

    service = Bom_recipesService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Bom_recipes with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Bom_recipes not found")
        
        logger.info(f"Bom_recipes {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating bom_recipes {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating bom_recipes {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_bom_recipess_batch(
    request: Bom_recipesBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple bom_recipess by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} bom_recipess")
    
    service = Bom_recipesService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} bom_recipess successfully")
        return {"message": f"Successfully deleted {deleted_count} bom_recipess", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_bom_recipes(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single bom_recipes by ID"""
    logger.debug(f"Deleting bom_recipes with id: {id}")
    
    service = Bom_recipesService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Bom_recipes with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Bom_recipes not found")
        
        logger.info(f"Bom_recipes {id} deleted successfully")
        return {"message": "Bom_recipes deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting bom_recipes {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")