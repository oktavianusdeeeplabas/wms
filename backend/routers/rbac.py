from dependencies.auth import get_current_user, require_permissions
from core.database import get_db
from fastapi import APIRouter, Depends
from schemas.auth import UserResponse
from schemas.rbac import (
    RoleDefinitionResponse,
    RoleUpsertRequest,
    UserPermissionOverrideRequest,
    UserPermissionOverrideResponse,
    UserPermissionsResponse,
)
from services.rbac import (
    create_or_update_role,
    delete_user_permission_override,
    get_user_permissions_summary,
    list_role_definitions,
    set_user_permission_override,
)
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/v1/rbac", tags=["rbac"])


@router.get("/roles", response_model=list[RoleDefinitionResponse])
async def get_roles(
    db: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(require_permissions("roles.view")),
):
    """List all supported roles and permissions."""
    return await list_role_definitions(db)


@router.post("/roles/{role_name}", response_model=RoleDefinitionResponse)
async def upsert_role(
    role_name: str,
    payload: RoleUpsertRequest,
    db: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(require_permissions("roles.manage")),
):
    """Create or update a role definition."""
    return await create_or_update_role(
        db,
        role_name=role_name,
        label=payload.label,
        description=payload.description,
        permissions=payload.permissions,
        status=payload.status,
    )


@router.get("/me", response_model=UserResponse)
async def get_my_permissions(current_user: UserResponse = Depends(get_current_user)):
    """Return the authenticated user including resolved RBAC permissions."""
    return current_user


@router.get("/users/{user_id}/permissions", response_model=UserPermissionsResponse)
async def get_user_permissions(
    user_id: str,
    role: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(require_permissions("users.view")),
):
    """Return effective permissions and overrides for a user."""
    return await get_user_permissions_summary(db, user_id, role)


@router.put("/users/{user_id}/permissions", response_model=UserPermissionOverrideResponse)
async def upsert_user_permission(
    user_id: str,
    payload: UserPermissionOverrideRequest,
    db: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(require_permissions("users.manage")),
):
    """Add or update a user permission override."""
    return await set_user_permission_override(db, user_id, payload.permission, payload.mode)


@router.delete("/users/{user_id}/permissions/{permission}")
async def remove_user_permission(
    user_id: str,
    permission: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(require_permissions("users.manage")),
):
    """Remove a user permission override."""
    await delete_user_permission_override(db, user_id, permission)
    return {"message": "Permission override removed"}
