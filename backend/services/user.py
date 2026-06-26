import logging
import time
from typing import Optional

from models.auth import User
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from services.rbac import normalize_role

logger = logging.getLogger(__name__)


class UserService:
    @staticmethod
    async def get_user_profile(db: AsyncSession, user_id: str) -> Optional[User]:
        """Get user profile by user ID."""
        start_time = time.time()
        logger.debug(f"[DB_OP] Starting get_user_profile - user_id: {user_id}")
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        logger.debug(
            f"[DB_OP] Get user profile completed in {time.time() - start_time:.4f}s - found: {user is not None}"
        )
        return user

    @staticmethod
    async def update_user_profile(db: AsyncSession, user_id: str, name: Optional[str] = None) -> Optional[User]:
        """Update user profile."""
        start_time = time.time()
        logger.debug(f"[DB_OP] Starting update_user_profile - user_id: {user_id}")
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        logger.debug(f"[DB_OP] User lookup completed in {time.time() - start_time:.4f}s - found: {user is not None}")

        if user and name is not None:
            start_time_update = time.time()
            logger.debug("[DB_OP] Starting user profile update")
            user.name = name
            await db.commit()
            await db.refresh(user)
            logger.debug(f"[DB_OP] User profile update completed in {time.time() - start_time_update:.4f}s")

        return user

    @staticmethod
    async def list_users(db: AsyncSession) -> list[User]:
        """List all users ordered by creation time descending."""
        start_time = time.time()
        logger.debug("[DB_OP] Starting list_users")
        result = await db.execute(select(User).order_by(User.created_at.desc()))
        users = list(result.scalars().all())
        logger.debug(f"[DB_OP] list_users completed in {time.time() - start_time:.4f}s - count: {len(users)}")
        return users

    @staticmethod
    async def create_user(
        db: AsyncSession,
        user_id: str,
        email: str,
        name: Optional[str] = None,
        role: str = "viewer",
        branch_id: Optional[int] = None,
        warehouse_id: Optional[int] = None,
    ) -> User:
        """Create a managed user record for role assignment."""
        user = User(
            id=user_id,
            email=email,
            name=name,
            role=normalize_role(role),
            branch_id=branch_id,
            warehouse_id=warehouse_id,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def admin_update_user(
        db: AsyncSession,
        user_id: str,
        email: Optional[str] = None,
        name: Optional[str] = None,
        role: Optional[str] = None,
        branch_id: Optional[int] = None,
        warehouse_id: Optional[int] = None,
    ) -> Optional[User]:
        """Update user details and RBAC role as an administrator."""
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            return None

        if email is not None:
            user.email = email
        if name is not None:
            user.name = name
        if role is not None:
            user.role = normalize_role(role)
        user.branch_id = branch_id
        user.warehouse_id = warehouse_id

        await db.commit()
        await db.refresh(user)
        return user
