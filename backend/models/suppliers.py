from core.database import Base
from sqlalchemy import Column, Integer, String


class Suppliers(Base):
    __tablename__ = "suppliers"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    name = Column(String, nullable=False)
    code = Column(String, nullable=False)
    contact_person = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    address = Column(String, nullable=True)
    marketing_name = Column(String, nullable=True)
    marketing_phone = Column(String, nullable=True)
    marketing_email = Column(String, nullable=True)
    branch_id = Column(Integer, nullable=True)
    warehouse_id = Column(Integer, nullable=True)
    payment_type_id = Column(Integer, nullable=True)
    payment_terms = Column(String, nullable=True)
    lead_time_days = Column(Integer, nullable=True)
    tax_number = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    status = Column(String, nullable=True)
    created_at = Column(String, nullable=True)


class SupplierProducts(Base):
    __tablename__ = "supplier_products"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    supplier_id = Column(Integer, nullable=False)
    product_id = Column(Integer, nullable=False)
