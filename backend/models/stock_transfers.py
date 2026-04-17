from core.database import Base
from sqlalchemy import Column, DateTime, Float, Integer, String


class Stock_transfers(Base):
    __tablename__ = "stock_transfers"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    transfer_number = Column(String, nullable=False)
    from_warehouse_id = Column(Integer, nullable=False)
    to_warehouse_id = Column(Integer, nullable=False)
    from_branch_id = Column(Integer, nullable=True)
    to_branch_id = Column(Integer, nullable=True)
    product_id = Column(Integer, nullable=True)
    quantity = Column(Float, nullable=True)
    lot_number = Column(String, nullable=True)
    status = Column(String, nullable=True)
    requested_date = Column(DateTime(timezone=True), nullable=True)
    shipped_date = Column(DateTime(timezone=True), nullable=True)
    received_date = Column(DateTime(timezone=True), nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)