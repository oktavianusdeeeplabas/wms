from core.database import Base
from sqlalchemy import Column, Float, Integer, String


class Stock_movements(Base):
    __tablename__ = "stock_movements"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    product_id = Column(Integer, nullable=False)
    lot_id = Column(Integer, nullable=True)
    movement_type = Column(String, nullable=False)
    quantity = Column(Float, nullable=False)
    from_zone_id = Column(Integer, nullable=True)
    from_bin_id = Column(Integer, nullable=True)
    to_zone_id = Column(Integer, nullable=True)
    to_bin_id = Column(Integer, nullable=True)
    reference_type = Column(String, nullable=True)
    reference_id = Column(Integer, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(String, nullable=True)