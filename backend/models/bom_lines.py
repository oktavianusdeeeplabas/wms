from core.database import Base
from sqlalchemy import Boolean, Column, Float, Integer, String


class Bom_lines(Base):
    __tablename__ = "bom_lines"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    recipe_id = Column(Integer, nullable=False)
    product_id = Column(Integer, nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String, nullable=True)
    is_optional = Column(Boolean, nullable=True)
    substitution_allowed = Column(Boolean, nullable=True)
    wastage_factor = Column(Float, nullable=True)
    notes = Column(String, nullable=True)