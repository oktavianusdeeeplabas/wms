from models.base import Base
from sqlalchemy import Column, DateTime, Integer, String
from sqlalchemy.sql import func


class User(Base):
    __tablename__ = "users"

    id = Column(String(255), primary_key=True, index=True)  # Use platform sub as primary key
    email = Column(String(255), nullable=False)
    name = Column(String(255), nullable=True)
    role = Column(String(50), default="viewer", nullable=False)
    branch_id = Column(Integer, nullable=True)
    warehouse_id = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)


class OIDCState(Base):
    __tablename__ = "oidc_states"

    id = Column(Integer, primary_key=True, index=True)
    state = Column(String(255), unique=True, index=True, nullable=False)
    nonce = Column(String(255), nullable=False)
    code_verifier = Column(String(255), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class LocalCredential(Base):
    __tablename__ = "local_credentials"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(255), nullable=False, unique=True, index=True)
    username = Column(String(255), nullable=False, unique=True, index=True)
    password_hash = Column(String(512), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
