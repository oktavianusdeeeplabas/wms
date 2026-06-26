import json
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.product_lookups import LOOKUP_MODELS, ProductLookupService


class ProductLookupData(BaseModel):
    name: str
    code: str
    status: Optional[str] = "active"


class ProductLookupUpdateData(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    status: Optional[str] = None


class ProductLookupResponse(BaseModel):
    id: int
    name: str
    code: str
    status: Optional[str] = None

    class Config:
        from_attributes = True


class ProductLookupListResponse(BaseModel):
    items: List[ProductLookupResponse]
    total: int
    skip: int
    limit: int


def build_lookup_router(entity_name: str, tag: str) -> APIRouter:
    router = APIRouter(prefix=f"/api/v1/entities/{entity_name}", tags=[tag])
    model = LOOKUP_MODELS[entity_name]

    @router.get("", response_model=ProductLookupListResponse)
    async def query_items(
        query: str = Query(None),
        sort: str = Query(None),
        skip: int = Query(0, ge=0),
        limit: int = Query(20, ge=1, le=500),
        db: AsyncSession = Depends(get_db),
    ):
        query_dict = None
        if query:
            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid query JSON")
        return await ProductLookupService(db, model).get_list(skip=skip, limit=limit, query_dict=query_dict, sort=sort)

    @router.get("/{id}", response_model=ProductLookupResponse)
    async def get_item(id: int, db: AsyncSession = Depends(get_db)):
        result = await ProductLookupService(db, model).get_by_id(id)
        if not result:
            raise HTTPException(status_code=404, detail="Lookup record not found")
        return result

    @router.post("", response_model=ProductLookupResponse, status_code=201)
    async def create_item(data: ProductLookupData, db: AsyncSession = Depends(get_db)):
        return await ProductLookupService(db, model).create(data.model_dump())

    @router.put("/{id}", response_model=ProductLookupResponse)
    async def update_item(id: int, data: ProductLookupUpdateData, db: AsyncSession = Depends(get_db)):
        update_dict = {key: value for key, value in data.model_dump().items() if value is not None}
        result = await ProductLookupService(db, model).update(id, update_dict)
        if not result:
            raise HTTPException(status_code=404, detail="Lookup record not found")
        return result

    @router.delete("/{id}")
    async def delete_item(id: int, db: AsyncSession = Depends(get_db)):
        success = await ProductLookupService(db, model).delete(id)
        if not success:
            raise HTTPException(status_code=404, detail="Lookup record not found")
        return {"message": "Deleted", "id": id}

    return router


router = [
    build_lookup_router("product_categories", "product-categories"),
    build_lookup_router("product_sub_categories", "product-sub-categories"),
    build_lookup_router("brands", "brands"),
    build_lookup_router("manufacturers", "manufacturers"),
    build_lookup_router("product_types", "product-types"),
    build_lookup_router("item_groups", "item-groups"),
]
