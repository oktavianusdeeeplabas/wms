from core.database import Base
from sqlalchemy import Column, Integer, String


class Zones(Base):
    __tablename__ = "zones"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    warehouse_id = Column(Integer, nullable=False)
    name = Column(String, nullable=False)
    code = Column(String, nullable=False)
    temperature_type = Column(String, nullable=True)
    status = Column(String, nullable=True)