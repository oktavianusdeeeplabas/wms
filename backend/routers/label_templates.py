import json
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.label_templates import LabelTemplatesService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/label_templates", tags=["label_templates"])


class LabelTemplateData(BaseModel):
    name: str
    template_type: str
    width_mm: Optional[int] = None
    height_mm: Optional[int] = None
    fields_config: Optional[str] = None
    layout_config: Optional[str] = None
    status: Optional[str] = "active"


class LabelTemplateUpdateData(BaseModel):
    name: Optional[str] = None
    template_type: Optional[str] = None
    width_mm: Optional[int] = None
    height_mm: Optional[int] = None
    fields_config: Optional[str] = None
    layout_config: Optional[str] = None
    status: Optional[str] = None


class LabelTemplateResponse(BaseModel):
    id: int
    name: str
    template_type: str
    width_mm: Optional[int] = None
    height_mm: Optional[int] = None
    fields_config: Optional[str] = None
    layout_config: Optional[str] = None
    status: Optional[str] = None

    class Config:
        from_attributes = True


class LabelTemplateListResponse(BaseModel):
    items: List[LabelTemplateResponse]
    total: int
    skip: int
    limit: int


@router.get("", response_model=LabelTemplateListResponse)
async def query_label_templates(
    query: str = Query(None),
    sort: str = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    service = LabelTemplatesService(db)
    query_dict = None
    if query:
        try:
            query_dict = json.loads(query)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid query JSON")
    return await service.get_list(skip=skip, limit=limit, query_dict=query_dict, sort=sort)


@router.get("/{id}", response_model=LabelTemplateResponse)
async def get_label_template(id: int, db: AsyncSession = Depends(get_db)):
    service = LabelTemplatesService(db)
    result = await service.get_by_id(id)
    if not result:
        raise HTTPException(status_code=404, detail="Label template not found")
    return result


@router.post("", response_model=LabelTemplateResponse, status_code=201)
async def create_label_template(data: LabelTemplateData, db: AsyncSession = Depends(get_db)):
    service = LabelTemplatesService(db)
    try:
        return await service.create(data.model_dump())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{id}", response_model=LabelTemplateResponse)
async def update_label_template(id: int, data: LabelTemplateUpdateData, db: AsyncSession = Depends(get_db)):
    service = LabelTemplatesService(db)
    update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
    result = await service.update(id, update_dict)
    if not result:
        raise HTTPException(status_code=404, detail="Label template not found")
    return result


@router.delete("/{id}")
async def delete_label_template(id: int, db: AsyncSession = Depends(get_db)):
    service = LabelTemplatesService(db)
    success = await service.delete(id)
    if not success:
        raise HTTPException(status_code=404, detail="Label template not found")
    return {"message": "Deleted", "id": id}
