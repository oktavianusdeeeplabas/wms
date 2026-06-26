from models.base import BaseModel
from sqlalchemy import Column, String, Text


class Role(BaseModel):
    __tablename__ = "roles"

    name = Column(String(100), unique=True, nullable=False, index=True)
    label = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    permissions_json = Column(Text, nullable=False, default="[]")
    status = Column(String(50), nullable=False, default="active")


class UserPermissionOverride(BaseModel):
    __tablename__ = "user_permission_overrides"

    user_id = Column(String(255), nullable=False, index=True)
    permission = Column(String(255), nullable=False, index=True)
    mode = Column(String(20), nullable=False, default="allow")
