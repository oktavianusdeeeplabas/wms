from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel
from schemas.rbac import UserPermissionOverrideResponse


class UserResponse(BaseModel):
    id: str  # Now a string UUID (platform sub)
    email: str
    name: Optional[str] = None
    role: str = "viewer"
    branch_id: Optional[int] = None
    warehouse_id: Optional[int] = None
    permissions: List[str] = []
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


class RoleDefinitionResponse(BaseModel):
    name: str
    label: str
    description: str
    permissions: List[str]


class AdminUserListResponse(UserResponse):
    created_at: Optional[datetime] = None


class CreateUserRequest(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    role: str = "viewer"
    branch_id: Optional[int] = None
    warehouse_id: Optional[int] = None


class UpdateUserRequest(BaseModel):
    email: Optional[str] = None
    name: Optional[str] = None
    role: Optional[str] = None
    branch_id: Optional[int] = None
    warehouse_id: Optional[int] = None


class LocalLoginRequest(BaseModel):
    username: str
    password: str


class LocalRegisterRequest(BaseModel):
    username: str
    password: str
    email: str
    name: Optional[str] = None
    role: str = "viewer"
    branch_id: Optional[int] = None
    warehouse_id: Optional[int] = None


class CreateLocalUserRequest(LocalRegisterRequest):
    pass


class LocalAuthResponse(BaseModel):
    token: str
    token_type: str = "Bearer"
    user: UserResponse


class PlatformTokenExchangeRequest(BaseModel):
    """Request body for exchanging Platform token for app token."""

    platform_token: str


class TokenExchangeResponse(BaseModel):
    """Response body for issued application token."""

    token: str
