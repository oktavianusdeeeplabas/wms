from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: int
    user_id: str
    title: str
    message: str
    action: str
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    actor_id: Optional[str] = None
    actor_email: Optional[str] = None
    read_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class NotificationCountResponse(BaseModel):
    unread_count: int
