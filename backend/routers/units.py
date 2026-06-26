import json
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.units import UnitsService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/units", tags=["units"])


class UnitData(BaseModel):
    name: str
    code: str
    symbol: Optional[str] = None
    unit_type: Optional[str] = None
    decimal_places: Optional[int] = None
    base_unit_code: Optional[str] = None
    conversion_factor: Optional[float] = None
    status: Optional[str] = "active"


class UnitUpdateData(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    symbol: Optional[str] = None
    unit_type: Optional[str] = None
    decimal_places: Optional[int] = None
    base_unit_code: Optional[str] = None
    conversion_factor: Optional[float] = None
    status: Optional[str] = None


class UnitResponse(BaseModel):
    id: int
    name: str
    code: str
    symbol: Optional[str] = None
    unit_type: Optional[str] = None
    decimal_places: Optional[int] = None
    base_unit_code: Optional[str] = None
    conversion_factor: Optional[float] = None
    status: Optional[str] = None

    class Config:
        from_attributes = True


class UnitListResponse(BaseModel):
    items: List[UnitResponse]
    total: int
    skip: int
    limit: int


@router.get("", response_model=UnitListResponse)
async def query_units(
    query: str = Query(None),
    sort: str = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    service = UnitsService(db)
    query_dict = None
    if query:
        try:
            query_dict = json.loads(query)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid query JSON")
    return await service.get_list(skip=skip, limit=limit, query_dict=query_dict, sort=sort)


@router.get("/{id}", response_model=UnitResponse)
async def get_unit(id: int, db: AsyncSession = Depends(get_db)):
    service = UnitsService(db)
    result = await service.get_by_id(id)
    if not result:
        raise HTTPException(status_code=404, detail="Unit not found")
    return result


@router.post("", response_model=UnitResponse, status_code=201)
async def create_unit(data: UnitData, db: AsyncSession = Depends(get_db)):
    service = UnitsService(db)
    try:
        return await service.create(data.model_dump())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{id}", response_model=UnitResponse)
async def update_unit(id: int, data: UnitUpdateData, db: AsyncSession = Depends(get_db)):
    service = UnitsService(db)
    update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
    result = await service.update(id, update_dict)
    if not result:
        raise HTTPException(status_code=404, detail="Unit not found")
    return result


@router.delete("/{id}")
async def delete_unit(id: int, db: AsyncSession = Depends(get_db)):
    service = UnitsService(db)
    success = await service.delete(id)
    if not success:
        raise HTTPException(status_code=404, detail="Unit not found")
    return {"message": "Deleted", "id": id}
