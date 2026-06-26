from core.database import Base
from sqlalchemy import Column, DateTime, Integer, String


class Warehouses(Base):
    __tablename__ = "warehouses"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    name = Column(String, nullable=False)
    code = Column(String, nullable=False)
    address = Column(String, nullable=True)
    detail = Column(String, nullable=True)
    capacity = Column(Integer, nullable=True)
    manager = Column(String, nullable=True)
    branch_id = Column(Integer, nullable=True)
    status = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)
