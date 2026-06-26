from core.database import Base
from sqlalchemy import Column, DateTime, Float, Integer, String, Text, func


class Uhf_tags(Base):
    __tablename__ = "uhf_tags"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    epc = Column(String, nullable=False, unique=True, index=True)
    tid = Column(String, nullable=True)
    sticker_label = Column(String, nullable=True)
    product_id = Column(Integer, nullable=True)
    lot_id = Column(Integer, nullable=True, index=True)
    assigned_quantity = Column(Float, nullable=True)
    current_zone_id = Column(Integer, nullable=True)
    current_bin_id = Column(Integer, nullable=True)
    status = Column(String, nullable=True)
    encoded_at = Column(DateTime(timezone=True), nullable=True)
    assigned_at = Column(DateTime(timezone=True), nullable=True)
    last_seen_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=True)
