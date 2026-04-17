from core.database import Base
from sqlalchemy import Column, Integer, String


class Bins(Base):
    __tablename__ = "bins"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    zone_id = Column(Integer, nullable=False)
    name = Column(String, nullable=False)
    code = Column(String, nullable=False)
    capacity = Column(Integer, nullable=True)
    status = Column(String, nullable=True)