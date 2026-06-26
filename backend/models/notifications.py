from models.base import BaseModel
from sqlalchemy import Column, DateTime, String, Text


class Notification(BaseModel):
    __tablename__ = "notifications"

    user_id = Column(String(255), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    action = Column(String(50), nullable=False)
    resource_type = Column(String(100), nullable=True, index=True)
    resource_id = Column(String(255), nullable=True)
    actor_id = Column(String(255), nullable=True)
    actor_email = Column(String(255), nullable=True)
    read_at = Column(DateTime(timezone=True), nullable=True)
