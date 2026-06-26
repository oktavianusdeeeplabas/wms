from datetime import datetime
from typing import List

from pydantic import BaseModel


class RoleDefinitionResponse(BaseModel):
    name: str
    label: str
    description: str | None = None
    permissions: List[str]
    status: str = "active"


class RoleUpsertRequest(BaseModel):
    label: str
    description: str | None = None
    permissions: List[str]
    status: str = "active"


class UserPermissionOverrideRequest(BaseModel):
    permission: str
    mode: str


class UserPermissionOverrideResponse(BaseModel):
    id: int
    user_id: str
    permission: str
    mode: str
    created_at: datetime | None = None

    class Config:
        from_attributes = True


class UserPermissionsResponse(BaseModel):
    user_id: str
    role: str
    base_permissions: List[str]
    effective_permissions: List[str]
    overrides: List[UserPermissionOverrideResponse]
