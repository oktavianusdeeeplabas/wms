import json
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, field_validator
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from models.uhf_tag_reads import Uhf_tag_reads
from services.uhf_tracking import CrudService, UhfTrackingService, normalize_epc

router = APIRouter(prefix="/api/v1/entities/uhf_tag_reads", tags=["uhf_tag_reads"])


class UhfTagReadData(BaseModel):
    tag_id: Optional[int] = None
    epc: str
    reader_id: Optional[int] = None
    zone_id: Optional[int] = None
    bin_id: Optional[int] = None
    rssi: Optional[float] = None
    read_count: Optional[int] = 1
    direction: Optional[str] = None
    event_type: Optional[str] = "read"
    seen_at: Optional[datetime] = None

    @field_validator("epc")
    @classmethod
    def clean_epc(cls, value: str) -> str:
        normalized = normalize_epc(value)
        if not normalized:
            raise ValueError("EPC is required")
        return normalized


class UhfScanData(BaseModel):
    epc: str
    reader_id: Optional[int] = None
    reader_code: Optional[str] = None
    zone_id: Optional[int] = None
    bin_id: Optional[int] = None
    rssi: Optional[float] = None
    read_count: Optional[int] = 1
    direction: Optional[str] = None
    event_type: Optional[str] = "read"

    @field_validator("epc")
    @classmethod
    def clean_epc(cls, value: str) -> str:
        normalized = normalize_epc(value)
        if not normalized:
            raise ValueError("EPC is required")
        return normalized


class UhfTagReadUpdateData(BaseModel):
    tag_id: Optional[int] = None
    epc: Optional[str] = None
    reader_id: Optional[int] = None
    zone_id: Optional[int] = None
    bin_id: Optional[int] = None
    rssi: Optional[float] = None
    read_count: Optional[int] = None
    direction: Optional[str] = None
    event_type: Optional[str] = None
    seen_at: Optional[datetime] = None


class UhfTagReadResponse(UhfTagReadData):
    id: int

    class Config:
        from_attributes = True


class UhfTagReadListResponse(BaseModel):
    items: List[UhfTagReadResponse]
    total: int
    skip: int
    limit: int


@router.get("", response_model=UhfTagReadListResponse)
async def query_uhf_tag_reads(
    query: str = Query(None),
    sort: str = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=2000),
    db: AsyncSession = Depends(get_db),
):
    query_dict = _parse_query(query)
    if query_dict and query_dict.get("epc"):
        query_dict["epc"] = normalize_epc(query_dict["epc"])
    return await CrudService(db, Uhf_tag_reads).get_list(skip, limit, query_dict, sort)


@router.post("/scan", response_model=UhfTagReadResponse, status_code=201)
async def ingest_uhf_scan(data: UhfScanData, db: AsyncSession = Depends(get_db)):
    return await UhfTrackingService(db).ingest_read(data.model_dump())


@router.get("/{id}", response_model=UhfTagReadResponse)
async def get_uhf_tag_read(id: int, db: AsyncSession = Depends(get_db)):
    result = await CrudService(db, Uhf_tag_reads).get_by_id(id)
    if not result:
        raise HTTPException(status_code=404, detail="UHF tag read not found")
    return result


@router.post("", response_model=UhfTagReadResponse, status_code=201)
async def create_uhf_tag_read(data: UhfTagReadData, db: AsyncSession = Depends(get_db)):
    return await CrudService(db, Uhf_tag_reads).create(data.model_dump())


@router.put("/{id}", response_model=UhfTagReadResponse)
async def update_uhf_tag_read(id: int, data: UhfTagReadUpdateData, db: AsyncSession = Depends(get_db)):
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if updates.get("epc"):
        updates["epc"] = normalize_epc(updates["epc"])
    result = await CrudService(db, Uhf_tag_reads).update(id, updates)
    if not result:
        raise HTTPException(status_code=404, detail="UHF tag read not found")
    return result


@router.delete("/{id}")
async def delete_uhf_tag_read(id: int, db: AsyncSession = Depends(get_db)):
    deleted = await CrudService(db, Uhf_tag_reads).delete(id)
    if not deleted:
        raise HTTPException(status_code=404, detail="UHF tag read not found")
    return {"message": "UHF tag read deleted successfully", "id": id}


def _parse_query(query: Optional[str]):
    if not query:
        return None
    try:
        return json.loads(query)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid query JSON format")
