from datetime import datetime, timezone
from typing import Iterable, Optional

from models.auth import User
from models.notifications import Notification
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession


ACTION_LABELS = {
    "POST": "created",
    "PUT": "updated",
    "PATCH": "updated",
    "DELETE": "deleted",
}


def _format_resource_name(resource_type: Optional[str]) -> str:
    if not resource_type:
        return "record"
    return resource_type.replace("_", " ").title()


def build_update_notification(
    method: str,
    path: str,
    actor_email: Optional[str],
) -> tuple[str, str, str, Optional[str], Optional[str]]:
    """Build notification text from a successful write request."""
    action = ACTION_LABELS.get(method.upper(), "changed")
    resource_type = None
    resource_id = None

    parts = [part for part in path.split("/") if part]
    if len(parts) >= 4 and parts[:3] == ["api", "v1", "entities"]:
        resource_type = parts[3]
        if len(parts) >= 5 and parts[4] not in {"batch", "all", "scan"}:
            resource_id = parts[4]
    elif len(parts) >= 3 and parts[:2] == ["api", "v1"]:
        resource_type = parts[2]
        if len(parts) >= 4:
            resource_id = parts[3]

    resource_name = _format_resource_name(resource_type)
    actor = actor_email or "A user"
    title = f"{resource_name} {action}"
    message = f"{actor} {action} {resource_name.lower()}"
    if resource_id:
        message = f"{message} #{resource_id}"

    return title, message, action, resource_type, resource_id


async def create_notifications_for_users(
    db: AsyncSession,
    user_ids: Iterable[str],
    title: str,
    message: str,
    action: str,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    actor_id: Optional[str] = None,
    actor_email: Optional[str] = None,
) -> None:
    notifications = [
        Notification(
            user_id=user_id,
            title=title,
            message=message,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            actor_id=actor_id,
            actor_email=actor_email,
        )
        for user_id in set(user_ids)
    ]
    if not notifications:
        return

    db.add_all(notifications)
    await db.commit()


async def create_update_notifications_for_all_users(
    db: AsyncSession,
    method: str,
    path: str,
    actor_id: Optional[str],
    actor_email: Optional[str],
) -> None:
    title, message, action, resource_type, resource_id = build_update_notification(method, path, actor_email)
    result = await db.execute(select(User.id))
    user_ids = [str(user_id) for user_id in result.scalars().all()]
    await create_notifications_for_users(
        db,
        user_ids=user_ids,
        title=title,
        message=message,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        actor_id=actor_id,
        actor_email=actor_email,
    )


async def list_user_notifications(
    db: AsyncSession,
    user_id: str,
    unread_only: bool = False,
    limit: int = 20,
) -> list[Notification]:
    query = select(Notification).where(Notification.user_id == user_id)
    if unread_only:
        query = query.where(Notification.read_at.is_(None))

    result = await db.execute(query.order_by(Notification.created_at.desc()).limit(limit))
    return list(result.scalars().all())


async def count_unread_notifications(db: AsyncSession, user_id: str) -> int:
    result = await db.execute(
        select(func.count(Notification.id)).where(Notification.user_id == user_id, Notification.read_at.is_(None))
    )
    return int(result.scalar_one() or 0)


async def mark_notification_read(db: AsyncSession, user_id: str, notification_id: int) -> Optional[Notification]:
    result = await db.execute(
        select(Notification).where(Notification.id == notification_id, Notification.user_id == user_id)
    )
    notification = result.scalar_one_or_none()
    if not notification:
        return None

    if notification.read_at is None:
        notification.read_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(notification)

    return notification


async def mark_all_notifications_read(db: AsyncSession, user_id: str) -> int:
    result = await db.execute(
        update(Notification)
        .where(Notification.user_id == user_id, Notification.read_at.is_(None))
        .values(read_at=datetime.now(timezone.utc))
    )
    await db.commit()
    return int(result.rowcount or 0)
