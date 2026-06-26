import logging
import os
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Tuple

from core.auth import create_access_token
from core.auth import hash_password, verify_password
from core.config import settings
from core.database import db_manager
from models.auth import LocalCredential, OIDCState, User
from services.rbac import normalize_role, resolve_permissions
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_or_create_user(self, platform_sub: str, email: str, name: Optional[str] = None) -> User:
        """Get existing user or create new one."""
        start_time = time.time()
        logger.debug(f"[DB_OP] Starting get_or_create_user - platform_sub: {platform_sub}")
        # Try to find existing user
        result = await self.db.execute(select(User).where(User.id == platform_sub))
        user = result.scalar_one_or_none()
        logger.debug(f"[DB_OP] User lookup completed in {time.time() - start_time:.4f}s - found: {user is not None}")

        if user:
            # Update user info if needed
            user.email = email
            user.name = name
            user.role = normalize_role(user.role)
            user.last_login = datetime.now(timezone.utc)
        else:
            # Create new user
            user = User(id=platform_sub, email=email, name=name, role="viewer", last_login=datetime.now(timezone.utc))
            self.db.add(user)

        start_time_commit = time.time()
        logger.debug("[DB_OP] Starting user commit/refresh")
        await self.db.commit()
        await self.db.refresh(user)
        logger.debug(f"[DB_OP] User commit/refresh completed in {time.time() - start_time_commit:.4f}s")
        return user

    async def issue_app_token(
        self,
        user: User,
    ) -> Tuple[str, datetime, Dict[str, Any]]:
        """Generate application JWT token for the authenticated user."""
        try:
            expires_minutes = int(getattr(settings, "jwt_expire_minutes", 60))
        except (TypeError, ValueError):
            logger.warning("Invalid JWT_EXPIRE_MINUTES value; fallback to 60 minutes")
            expires_minutes = 60
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)

        resolved_permissions = await resolve_permissions(self.db, user.role, user.id)
        claims: Dict[str, Any] = {
            "sub": user.id,
            "email": user.email,
            "role": normalize_role(user.role),
            "branch_id": user.branch_id,
            "warehouse_id": user.warehouse_id,
            "permissions": resolved_permissions,
        }

        if user.name:
            claims["name"] = user.name
        if user.last_login:
            claims["last_login"] = user.last_login.isoformat()
        token = create_access_token(claims, expires_minutes=expires_minutes)

        return token, expires_at, claims

    async def authenticate_local_user(self, username: str, password: str) -> Optional[User]:
        """Authenticate a locally managed user using email or username/password."""
        identifier = username.strip()
        result = await self.db.execute(select(LocalCredential).where(LocalCredential.username == identifier))
        credential = result.scalar_one_or_none()

        if not credential:
            user_result = await self.db.execute(select(User).where(User.email == identifier))
            user = user_result.scalars().first()
            if not user:
                return None

            credential_result = await self.db.execute(
                select(LocalCredential).where(LocalCredential.user_id == user.id)
            )
            credential = credential_result.scalar_one_or_none()

        if not credential or not verify_password(password, credential.password_hash):
            return None

        user_result = await self.db.execute(select(User).where(User.id == credential.user_id))
        user = user_result.scalar_one_or_none()
        if not user:
            return None

        user.role = normalize_role(user.role)
        user.last_login = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def create_local_user(
        self,
        username: str,
        password: str,
        email: str,
        name: Optional[str] = None,
        role: str = "viewer",
        branch_id: Optional[int] = None,
        warehouse_id: Optional[int] = None,
        user_id: Optional[str] = None,
    ) -> User:
        """Create a local auth user and credential pair."""
        normalized_role = normalize_role(role)
        resolved_user_id = user_id or f"local:{username}"

        existing_user = await self.db.execute(select(User).where(User.id == resolved_user_id))
        if existing_user.scalar_one_or_none():
            raise ValueError("User ID already exists")

        existing_credential = await self.db.execute(select(LocalCredential).where(LocalCredential.username == username))
        if existing_credential.scalar_one_or_none():
            raise ValueError("Username already exists")

        user = User(
            id=resolved_user_id,
            email=email,
            name=name,
            role=normalized_role,
            branch_id=branch_id,
            warehouse_id=warehouse_id,
        )
        credential = LocalCredential(
            user_id=resolved_user_id,
            username=username,
            password_hash=hash_password(password),
        )
        self.db.add(user)
        self.db.add(credential)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def store_oidc_state(self, state: str, nonce: str, code_verifier: str):
        """Store OIDC state in database."""
        # Clean up expired states first
        await self.db.execute(delete(OIDCState).where(OIDCState.expires_at < datetime.now(timezone.utc)))

        expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)  # 10 minute expiry

        oidc_state = OIDCState(state=state, nonce=nonce, code_verifier=code_verifier, expires_at=expires_at)

        self.db.add(oidc_state)
        await self.db.commit()

    async def get_and_delete_oidc_state(self, state: str) -> Optional[dict]:
        """Get and delete OIDC state from database."""
        # Clean up expired states first
        await self.db.execute(delete(OIDCState).where(OIDCState.expires_at < datetime.now(timezone.utc)))

        # Find and validate state
        result = await self.db.execute(select(OIDCState).where(OIDCState.state == state))
        oidc_state = result.scalar_one_or_none()

        if not oidc_state:
            return None

        # Extract data before deleting
        state_data = {"nonce": oidc_state.nonce, "code_verifier": oidc_state.code_verifier}

        # Delete the used state (one-time use)
        await self.db.delete(oidc_state)
        await self.db.commit()

        return state_data


async def initialize_admin_user():
    """Initialize admin user if not exists"""
    if "MGX_IGNORE_INIT_ADMIN" in os.environ:
        logger.info("Ignore initialize admin")
        return

    from services.database import initialize_database

    # Ensure database is initialized first
    await initialize_database()

    admin_user_id = getattr(settings, "admin_user_id", "") or "local-admin"
    admin_user_email = getattr(settings, "admin_user_email", "") or getattr(settings, "local_admin_email", "admin@local.dev")
    local_admin_username = getattr(settings, "local_admin_username", "admin")
    local_admin_password = getattr(settings, "local_admin_password", "admin123")

    async with db_manager.async_session_maker() as db:
        # Check if admin user already exists
        result = await db.execute(select(User).where(User.id == admin_user_id))
        user = result.scalar_one_or_none()

        if user:
            # Update existing user to admin if not already
            if user.role != "admin":
                user.role = "admin"
                user.email = admin_user_email  # Update email too
                await db.commit()
                logger.debug(f"Updated user {admin_user_id} to admin role")
            else:
                logger.debug(f"Admin user {admin_user_id} already exists")
        else:
            # Create new admin user
            admin_user = User(id=admin_user_id, email=admin_user_email, role="admin")
            db.add(admin_user)
            await db.commit()
            logger.debug(f"Created admin user: {admin_user_id} with email: {admin_user_email}")

        credential_result = await db.execute(select(LocalCredential).where(LocalCredential.username == local_admin_username))
        credential = credential_result.scalar_one_or_none()
        if not credential:
            db.add(
                LocalCredential(
                    user_id=admin_user_id,
                    username=local_admin_username,
                    password_hash=hash_password(local_admin_password),
                )
            )
            await db.commit()
            logger.debug("Created local admin credential for username: %s", local_admin_username)
