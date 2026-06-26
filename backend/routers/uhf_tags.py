import json
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, field_validator
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from models.uhf_tags import Uhf_tags
from services.uhf_tracking import CrudService, UhfTrackingService, normalize_epc

router = APIRouter(prefix="/api/v1/entities/uhf_tags", tags=["uhf_tags"])


class UhfTagData(BaseModel):
    epc: str
    tid: Optional[str] = None
    sticker_label: Optional[str] = None
    product_id: Optional[int] = None
    lot_id: Optional[int] = None
    assigned_quantity: Optional[float] = None
    current_zone_id: Optional[int] = None
    current_bin_id: Optional[int] = None
    status: Optional[str] = "available"
    encoded_at: Optional[datetime] = None
    assigned_at: Optional[datetime] = None
    last_seen_at: Optional[datetime] = None
    notes: Optional[str] = None

    @field_validator("epc")
    @classmethod
    def clean_epc(cls, value: str) -> str:
        normalized = normalize_epc(value)
        if not normalized:
            raise ValueError("EPC is required")
        return normalized


class UhfTagUpdateData(BaseModel):
    epc: Optional[str] = None
    tid: Optional[str] = None
    sticker_label: Optional[str] = None
    product_id: Optional[int] = None
    lot_id: Optional[int] = None
    assigned_quantity: Optional[float] = None
    current_zone_id: Optional[int] = None
    current_bin_id: Optional[int] = None
    status: Optional[str] = None
    encoded_at: Optional[datetime] = None
    assigned_at: Optional[datetime] = None
    last_seen_at: Optional[datetime] = None
    notes: Optional[str] = None

    @field_validator("epc")
    @classmethod
    def clean_epc(cls, value: Optional[str]) -> Optional[str]:
        return normalize_epc(value) if value else value


class UhfTagResponse(UhfTagData):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UhfTagListResponse(BaseModel):
    items: List[UhfTagResponse]
    total: int
    skip: int
    limit: int


@router.get("", response_model=UhfTagListResponse)
async def query_uhf_tags(
    query: str = Query(None),
    sort: str = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=2000),
    db: AsyncSession = Depends(get_db),
):
    query_dict = _parse_query(query)
    if query_dict and query_dict.get("epc"):
        query_dict["epc"] = normalize_epc(query_dict["epc"])
    return await CrudService(db, Uhf_tags).get_list(skip, limit, query_dict, sort)


@router.get("/epc/{epc}", response_model=UhfTagResponse)
async def get_uhf_tag_by_epc(epc: str, db: AsyncSession = Depends(get_db)):
    result = await UhfTrackingService(db).get_tag_by_epc(epc)
    if not result:
        raise HTTPException(status_code=404, detail="UHF tag not found")
    return result


@router.get("/{id}", response_model=UhfTagResponse)
async def get_uhf_tag(id: int, db: AsyncSession = Depends(get_db)):
    result = await CrudService(db, Uhf_tags).get_by_id(id)
    if not result:
        raise HTTPException(status_code=404, detail="UHF tag not found")
    return result


@router.post("", response_model=UhfTagResponse, status_code=201)
async def create_uhf_tag(data: UhfTagData, db: AsyncSession = Depends(get_db)):
    return await CrudService(db, Uhf_tags).create(data.model_dump())


@router.put("/{id}", response_model=UhfTagResponse)
async def update_uhf_tag(id: int, data: UhfTagUpdateData, db: AsyncSession = Depends(get_db)):
    result = await CrudService(db, Uhf_tags).update(
        id, {k: v for k, v in data.model_dump().items() if v is not None}
    )
    if not result:
        raise HTTPException(status_code=404, detail="UHF tag not found")
    return result


@router.delete("/{id}")
async def delete_uhf_tag(id: int, db: AsyncSession = Depends(get_db)):
    deleted = await CrudService(db, Uhf_tags).delete(id)
    if not deleted:
        raise HTTPException(status_code=404, detail="UHF tag not found")
    return {"message": "UHF tag deleted successfully", "id": id}


def _parse_query(query: Optional[str]):
    if not query:
        return None
    try:
        return json.loads(query)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid query JSON format")
