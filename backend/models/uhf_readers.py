from core.database import Base
from sqlalchemy import Column, DateTime, Integer, String, func


class Uhf_readers(Base):
    __tablename__ = "uhf_readers"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    name = Column(String, nullable=False)
    code = Column(String, nullable=False, unique=True, index=True)
    device_identifier = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    antenna_port = Column(Integer, nullable=True)
    zone_id = Column(Integer, nullable=True)
    bin_id = Column(Integer, nullable=True)
    status = Column(String, nullable=True)
    last_seen_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=True)
