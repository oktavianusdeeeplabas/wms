from typing import Optional

from core.database import get_db
from dependencies.auth import get_current_user, require_permissions
from fastapi import APIRouter, Depends, HTTPException, status
from models.auth import User
from pydantic import BaseModel
from schemas.auth import (
    AdminUserListResponse,
    CreateLocalUserRequest,
    CreateUserRequest,
    UpdateUserRequest,
    UserResponse,
)
from services.rbac import get_user_permissions_summary, resolve_permissions
from services.auth import AuthService
from services.user import UserService
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/v1/users", tags=["users"])


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None


@router.get("/profile", response_model=UserResponse)
async def get_profile(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get current user profile"""
    profile = await UserService.get_user_profile(db, current_user.id)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found")
    return profile


@router.put("/profile", response_model=UserResponse)
async def update_profile(
    profile_data: UpdateProfileRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update current user profile"""
    profile = await UserService.update_user_profile(db, current_user.id, profile_data.name)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found")
    return profile


@router.get("", response_model=list[AdminUserListResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    _current_user: UserResponse = Depends(require_permissions("users.view")),
):
    """List all users for admin user management."""
    users = await UserService.list_users(db)
    responses = []
    for user in users:
        responses.append(
            AdminUserListResponse(
                id=user.id,
                email=user.email,
                name=user.name,
                role=user.role,
                branch_id=user.branch_id,
                warehouse_id=user.warehouse_id,
                permissions=await resolve_permissions(db, user.role, user.id),
                last_login=user.last_login,
                created_at=user.created_at,
            )
        )
    return responses


@router.post("", response_model=AdminUserListResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: CreateUserRequest,
    db: AsyncSession = Depends(get_db),
    _current_user: UserResponse = Depends(require_permissions("users.manage")),
):
    """Create a managed user record for future access assignment."""
    existing = await UserService.get_user_profile(db, payload.id)
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User with this ID already exists")

    user = await UserService.create_user(
        db,
        user_id=payload.id,
        email=payload.email,
        name=payload.name,
        role=payload.role,
        branch_id=payload.branch_id,
        warehouse_id=payload.warehouse_id,
    )
    return AdminUserListResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        branch_id=user.branch_id,
        warehouse_id=user.warehouse_id,
        permissions=await resolve_permissions(db, user.role, user.id),
        last_login=user.last_login,
        created_at=user.created_at,
    )


@router.post("/local", response_model=AdminUserListResponse, status_code=status.HTTP_201_CREATED)
async def create_local_user(
    payload: CreateLocalUserRequest,
    db: AsyncSession = Depends(get_db),
    _current_user: UserResponse = Depends(require_permissions("users.manage")),
):
    """Create a local-auth user with username/password credentials."""
    auth_service = AuthService(db)
    try:
        user = await auth_service.create_local_user(
            username=payload.username,
            password=payload.password,
            email=payload.email,
            name=payload.name,
            role=payload.role,
            branch_id=payload.branch_id,
            warehouse_id=payload.warehouse_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

    return AdminUserListResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        branch_id=user.branch_id,
        warehouse_id=user.warehouse_id,
        permissions=await resolve_permissions(db, user.role, user.id),
        last_login=user.last_login,
        created_at=user.created_at,
    )


@router.put("/{user_id}", response_model=AdminUserListResponse)
async def admin_update_user(
    user_id: str,
    payload: UpdateUserRequest,
    db: AsyncSession = Depends(get_db),
    _current_user: UserResponse = Depends(require_permissions("users.manage")),
):
    """Update user information and assign a new RBAC role."""
    user = await UserService.admin_update_user(
        db,
        user_id=user_id,
        email=payload.email,
        name=payload.name,
        role=payload.role,
        branch_id=payload.branch_id,
        warehouse_id=payload.warehouse_id,
    )
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return AdminUserListResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        branch_id=user.branch_id,
        warehouse_id=user.warehouse_id,
        permissions=await resolve_permissions(db, user.role, user.id),
        last_login=user.last_login,
        created_at=user.created_at,
    )
