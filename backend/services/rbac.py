import json
from typing import Dict, List

from models.rbac import Role, UserPermissionOverride
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

ROLE_DEFINITIONS: Dict[str, Dict[str, object]] = {
    "admin": {
        "label": "Administrator",
        "description": "Full system access including user, settings, and warehouse administration.",
        "permissions": [
            "dashboard.view",
            "inventory.view",
            "inventory.manage",
            "operations.view",
            "operations.execute",
            "production.view",
            "production.manage",
            "reports.view",
            "analytics.view",
            "users.view",
            "users.manage",
            "roles.view",
            "roles.manage",
            "settings.manage",
        ],
    },
    "manager": {
        "label": "Manager",
        "description": "Operational management access for inventory, production, and reporting.",
        "permissions": [
            "dashboard.view",
            "inventory.view",
            "inventory.manage",
            "operations.view",
            "operations.execute",
            "production.view",
            "production.manage",
            "reports.view",
            "analytics.view",
            "users.view",
            "roles.view",
        ],
    },
    "supervisor": {
        "label": "Supervisor",
        "description": "Supervises day-to-day warehouse execution and monitors operations.",
        "permissions": [
            "dashboard.view",
            "inventory.view",
            "inventory.manage",
            "operations.view",
            "operations.execute",
            "production.view",
            "reports.view",
            "analytics.view",
        ],
    },
    "operator": {
        "label": "Operator",
        "description": "Executes receiving, picking, packing, loading, and floor operations.",
        "permissions": [
            "dashboard.view",
            "inventory.view",
            "operations.view",
            "operations.execute",
            "production.view",
        ],
    },
    "viewer": {
        "label": "Viewer",
        "description": "Read-only access for dashboards, reports, and monitoring.",
        "permissions": [
            "dashboard.view",
            "inventory.view",
            "operations.view",
            "production.view",
            "reports.view",
            "analytics.view",
        ],
    },
}

DEFAULT_ROLE = "viewer"


def normalize_role(role: str | None) -> str:
    """Return a normalized role name while allowing custom roles."""
    if not role:
        return DEFAULT_ROLE
    return role.strip() or DEFAULT_ROLE


def _serialize_permissions(permissions: List[str]) -> str:
    return json.dumps(sorted(set(permissions)))


def _deserialize_permissions(raw: str | None) -> List[str]:
    if not raw:
        return []
    try:
        data = json.loads(raw)
        if isinstance(data, list):
            return sorted({str(item) for item in data if item})
    except (TypeError, ValueError):
        pass
    return []


async def initialize_default_roles(db: AsyncSession):
    """Create default roles if they do not exist yet."""
    for role_name, definition in ROLE_DEFINITIONS.items():
        result = await db.execute(select(Role).where(Role.name == role_name))
        role = result.scalar_one_or_none()
        if role:
            continue

        db.add(
            Role(
                name=role_name,
                label=str(definition["label"]),
                description=str(definition["description"]),
                permissions_json=_serialize_permissions(list(definition["permissions"])),
                status="active",
            )
        )
    await db.commit()


async def list_role_definitions(db: AsyncSession) -> List[Dict[str, object]]:
    """List roles from database."""
    result = await db.execute(select(Role).order_by(Role.name.asc()))
    roles = result.scalars().all()
    return [
        {
            "name": role.name,
            "label": role.label,
            "description": role.description,
            "permissions": _deserialize_permissions(role.permissions_json),
            "status": role.status,
        }
        for role in roles
    ]


async def get_role_definition(db: AsyncSession, role_name: str) -> Dict[str, object]:
    """Get a single role definition from the database or fallback to default role."""
    result = await db.execute(select(Role).where(Role.name == normalize_role(role_name)))
    role = result.scalar_one_or_none()
    if role:
        return {
            "name": role.name,
            "label": role.label,
            "description": role.description,
            "permissions": _deserialize_permissions(role.permissions_json),
            "status": role.status,
        }

    fallback = ROLE_DEFINITIONS.get(DEFAULT_ROLE, {})
    return {
        "name": DEFAULT_ROLE,
        "label": fallback.get("label", "Viewer"),
        "description": fallback.get("description", ""),
        "permissions": list(fallback.get("permissions", [])),
        "status": "active",
    }


async def create_or_update_role(
    db: AsyncSession,
    role_name: str,
    label: str,
    description: str | None,
    permissions: List[str],
    status: str,
) -> Dict[str, object]:
    """Create or update a role record."""
    normalized_name = normalize_role(role_name)
    result = await db.execute(select(Role).where(Role.name == normalized_name))
    role = result.scalar_one_or_none()
    if not role:
        role = Role(name=normalized_name)
        db.add(role)

    role.label = label
    role.description = description
    role.permissions_json = _serialize_permissions(permissions)
    role.status = status
    await db.commit()
    await db.refresh(role)

    return {
        "name": role.name,
        "label": role.label,
        "description": role.description,
        "permissions": _deserialize_permissions(role.permissions_json),
        "status": role.status,
    }


async def get_user_permission_overrides(db: AsyncSession, user_id: str) -> List[UserPermissionOverride]:
    """Fetch all permission overrides for a user."""
    result = await db.execute(
        select(UserPermissionOverride)
        .where(UserPermissionOverride.user_id == user_id)
        .order_by(UserPermissionOverride.permission.asc(), UserPermissionOverride.mode.asc())
    )
    return list(result.scalars().all())


async def set_user_permission_override(
    db: AsyncSession, user_id: str, permission: str, mode: str
) -> UserPermissionOverride:
    """Create or update a permission override."""
    normalized_mode = mode.strip().lower()
    if normalized_mode not in {"allow", "deny"}:
        raise ValueError("Override mode must be 'allow' or 'deny'")

    result = await db.execute(
        select(UserPermissionOverride).where(
            UserPermissionOverride.user_id == user_id,
            UserPermissionOverride.permission == permission,
        )
    )
    override = result.scalar_one_or_none()
    if not override:
        override = UserPermissionOverride(user_id=user_id, permission=permission)
        db.add(override)

    override.mode = normalized_mode
    await db.commit()
    await db.refresh(override)
    return override


async def delete_user_permission_override(db: AsyncSession, user_id: str, permission: str):
    """Delete a permission override."""
    await db.execute(
        delete(UserPermissionOverride).where(
            UserPermissionOverride.user_id == user_id,
            UserPermissionOverride.permission == permission,
        )
    )
    await db.commit()


async def resolve_permissions(db: AsyncSession, role_name: str, user_id: str | None = None) -> List[str]:
    """Resolve effective permissions from role + overrides."""
    role_definition = await get_role_definition(db, role_name)
    permissions = set(role_definition["permissions"])

    if user_id:
        overrides = await get_user_permission_overrides(db, user_id)
        for override in overrides:
            if override.mode == "allow":
                permissions.add(override.permission)
            elif override.mode == "deny" and override.permission in permissions:
                permissions.remove(override.permission)

    return sorted(permissions)


async def get_user_permissions_summary(db: AsyncSession, user_id: str, role_name: str) -> Dict[str, object]:
    """Return base and effective permissions including overrides."""
    role_definition = await get_role_definition(db, role_name)
    overrides = await get_user_permission_overrides(db, user_id)
    return {
        "user_id": user_id,
        "role": role_name,
        "base_permissions": list(role_definition["permissions"]),
        "effective_permissions": await resolve_permissions(db, role_name, user_id),
        "overrides": overrides,
    }
