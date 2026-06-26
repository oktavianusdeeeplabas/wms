import json
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.payment_types import PaymentTypesService

router = APIRouter(prefix="/api/v1/entities/payment_types", tags=["payment_types"])


class PaymentTypeData(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    status: Optional[str] = "active"


class PaymentTypeUpdateData(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None


class PaymentTypeResponse(BaseModel):
    id: int
    name: str
    code: str
    description: Optional[str] = None
    status: Optional[str] = None

    class Config:
        from_attributes = True


class PaymentTypeListResponse(BaseModel):
    items: List[PaymentTypeResponse]
    total: int
    skip: int
    limit: int


@router.get("", response_model=PaymentTypeListResponse)
async def query_payment_types(
    query: str = Query(None),
    sort: str = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    service = PaymentTypesService(db)
    query_dict = None
    if query:
        try:
            query_dict = json.loads(query)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid query JSON")
    return await service.get_list(skip=skip, limit=limit, query_dict=query_dict, sort=sort)


@router.get("/{id}", response_model=PaymentTypeResponse)
async def get_payment_type(id: int, db: AsyncSession = Depends(get_db)):
    result = await PaymentTypesService(db).get_by_id(id)
    if not result:
        raise HTTPException(status_code=404, detail="Payment type not found")
    return result


@router.post("", response_model=PaymentTypeResponse, status_code=201)
async def create_payment_type(data: PaymentTypeData, db: AsyncSession = Depends(get_db)):
    return await PaymentTypesService(db).create(data.model_dump())


@router.put("/{id}", response_model=PaymentTypeResponse)
async def update_payment_type(id: int, data: PaymentTypeUpdateData, db: AsyncSession = Depends(get_db)):
    update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
    result = await PaymentTypesService(db).update(id, update_dict)
    if not result:
        raise HTTPException(status_code=404, detail="Payment type not found")
    return result


@router.delete("/{id}")
async def delete_payment_type(id: int, db: AsyncSession = Depends(get_db)):
    success = await PaymentTypesService(db).delete(id)
    if not success:
        raise HTTPException(status_code=404, detail="Payment type not found")
    return {"message": "Deleted", "id": id}
