from core.database import Base
from sqlalchemy import Column, DateTime, Float, Integer, String


class Bom_recipes(Base):
    __tablename__ = "bom_recipes"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    name = Column(String, nullable=False)
    code = Column(String, nullable=False)
    product_id = Column(Integer, nullable=True)
    category = Column(String, nullable=True)
    yield_quantity = Column(Float, nullable=True)
    yield_unit = Column(String, nullable=True)
    prep_time_minutes = Column(Integer, nullable=True)
    cook_time_minutes = Column(Integer, nullable=True)
    version = Column(Integer, nullable=True)
    status = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)