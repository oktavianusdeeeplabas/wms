from core.database import Base
from sqlalchemy import Column, Float, Integer, String


class Units(Base):
    __tablename__ = "units"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    name = Column(String, nullable=False)
    code = Column(String, nullable=False)
    symbol = Column(String, nullable=True)
    unit_type = Column(String, nullable=True)
    decimal_places = Column(Integer, nullable=True)
    base_unit_code = Column(String, nullable=True)
    conversion_factor = Column(Float, nullable=True)
    status = Column(String, nullable=True, default="active")
