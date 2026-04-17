from core.database import Base
from sqlalchemy import Column, Float, Integer, String


class Receiving_lines(Base):
    __tablename__ = "receiving_lines"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    receiving_document_id = Column(Integer, nullable=False)
    product_id = Column(Integer, nullable=False)
    expected_quantity = Column(Float, nullable=True)
    received_quantity = Column(Float, nullable=True)
    lot_number = Column(String, nullable=True)
    expiry_date = Column(String, nullable=True)
    qc_status = Column(String, nullable=True)
    notes = Column(String, nullable=True)