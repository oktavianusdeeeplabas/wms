from core.database import get_db
from dependencies.auth import get_current_user
from fastapi import APIRouter, Depends, HTTPException, Query, status
from schemas.auth import UserResponse
from schemas.notifications import NotificationCountResponse, NotificationResponse
from services.notifications import (
    count_unread_notifications,
    list_user_notifications,
    mark_all_notifications_read,
    mark_notification_read,
)
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationResponse])
async def get_notifications(
    unread_only: bool = Query(False),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """List notifications for the authenticated user."""
    return await list_user_notifications(db, current_user.id, unread_only=unread_only, limit=limit)


@router.get("/unread-count", response_model=NotificationCountResponse)
async def get_unread_notification_count(
    db: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Return unread notification count for the authenticated user."""
    return NotificationCountResponse(unread_count=await count_unread_notifications(db, current_user.id))


@router.put("/{notification_id}/read", response_model=NotificationResponse)
async def read_notification(
    notification_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Mark one notification as read."""
    notification = await mark_notification_read(db, current_user.id, notification_id)
    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    return notification


@router.put("/read-all")
async def read_all_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Mark all notifications as read for the authenticated user."""
    updated = await mark_all_notifications_read(db, current_user.id)
    return {"updated": updated}
