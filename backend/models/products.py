from core.database import Base
from sqlalchemy import Boolean, Column, Integer, String


class Products(Base):
    __tablename__ = "products"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    name = Column(String, nullable=False)
    sku = Column(String, nullable=False)
    category = Column(String, nullable=True)
    uom = Column(String, nullable=True)
    temperature_class = Column(String, nullable=True)
    shelf_life_days = Column(Integer, nullable=True)
    min_stock = Column(Integer, nullable=True)
    max_stock = Column(Integer, nullable=True)
    reorder_point = Column(Integer, nullable=True)
    is_perishable = Column(Boolean, nullable=True)
    status = Column(String, nullable=True)