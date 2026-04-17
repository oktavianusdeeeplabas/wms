from core.database import Base
from sqlalchemy import Column, Integer, String


class Receiving_documents(Base):
    __tablename__ = "receiving_documents"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    document_number = Column(String, nullable=False)
    supplier_id = Column(Integer, nullable=True)
    warehouse_id = Column(Integer, nullable=True)
    status = Column(String, nullable=True)
    expected_date = Column(String, nullable=True)
    received_date = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(String, nullable=True)