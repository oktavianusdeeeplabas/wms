from core.database import Base
from sqlalchemy import Column, DateTime, Float, Integer, String, func


class Uhf_tag_reads(Base):
    __tablename__ = "uhf_tag_reads"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    tag_id = Column(Integer, nullable=True, index=True)
    epc = Column(String, nullable=False, index=True)
    reader_id = Column(Integer, nullable=True)
    zone_id = Column(Integer, nullable=True)
    bin_id = Column(Integer, nullable=True)
    rssi = Column(Float, nullable=True)
    read_count = Column(Integer, nullable=True)
    direction = Column(String, nullable=True)
    event_type = Column(String, nullable=True)
    seen_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=True)
