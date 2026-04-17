from core.database import Base
from sqlalchemy import Column, Float, Integer, String


class Inventory_lots(Base):
    __tablename__ = "inventory_lots"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    product_id = Column(Integer, nullable=False)
    lot_number = Column(String, nullable=False)
    batch_number = Column(String, nullable=True)
    zone_id = Column(Integer, nullable=True)
    bin_id = Column(Integer, nullable=True)
    quantity = Column(Float, nullable=True)
    received_date = Column(String, nullable=True)
    expiry_date = Column(String, nullable=True)
    status = Column(String, nullable=True)
    supplier_id = Column(Integer, nullable=True)
    cost_per_unit = Column(Float, nullable=True)