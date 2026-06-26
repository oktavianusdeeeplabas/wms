import json
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from models.uhf_readers import Uhf_readers
from services.uhf_tracking import CrudService

router = APIRouter(prefix="/api/v1/entities/uhf_readers", tags=["uhf_readers"])


class UhfReaderData(BaseModel):
    name: str
    code: str
    device_identifier: Optional[str] = None
    ip_address: Optional[str] = None
    antenna_port: Optional[int] = None
    zone_id: Optional[int] = None
    bin_id: Optional[int] = None
    status: Optional[str] = "active"
    last_seen_at: Optional[datetime] = None


class UhfReaderUpdateData(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    device_identifier: Optional[str] = None
    ip_address: Optional[str] = None
    antenna_port: Optional[int] = None
    zone_id: Optional[int] = None
    bin_id: Optional[int] = None
    status: Optional[str] = None
    last_seen_at: Optional[datetime] = None


class UhfReaderResponse(UhfReaderData):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UhfReaderListResponse(BaseModel):
    items: List[UhfReaderResponse]
    total: int
    skip: int
    limit: int


@router.get("", response_model=UhfReaderListResponse)
async def query_uhf_readers(
    query: str = Query(None),
    sort: str = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=2000),
    db: AsyncSession = Depends(get_db),
):
    query_dict = _parse_query(query)
    return await CrudService(db, Uhf_readers).get_list(skip, limit, query_dict, sort)


@router.get("/{id}", response_model=UhfReaderResponse)
async def get_uhf_reader(id: int, db: AsyncSession = Depends(get_db)):
    result = await CrudService(db, Uhf_readers).get_by_id(id)
    if not result:
        raise HTTPException(status_code=404, detail="UHF reader not found")
    return result


@router.post("", response_model=UhfReaderResponse, status_code=201)
async def create_uhf_reader(data: UhfReaderData, db: AsyncSession = Depends(get_db)):
    return await CrudService(db, Uhf_readers).create(data.model_dump())


@router.put("/{id}", response_model=UhfReaderResponse)
async def update_uhf_reader(id: int, data: UhfReaderUpdateData, db: AsyncSession = Depends(get_db)):
    result = await CrudService(db, Uhf_readers).update(
        id, {k: v for k, v in data.model_dump().items() if v is not None}
    )
    if not result:
        raise HTTPException(status_code=404, detail="UHF reader not found")
    return result


@router.delete("/{id}")
async def delete_uhf_reader(id: int, db: AsyncSession = Depends(get_db)):
    deleted = await CrudService(db, Uhf_readers).delete(id)
    if not deleted:
        raise HTTPException(status_code=404, detail="UHF reader not found")
    return {"message": "UHF reader deleted successfully", "id": id}


def _parse_query(query: Optional[str]):
    if not query:
        return None
    try:
        return json.loads(query)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid query JSON format")
