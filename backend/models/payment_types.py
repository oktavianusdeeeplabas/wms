from core.database import Base
from sqlalchemy import Column, Integer, String


class PaymentTypes(Base):
    __tablename__ = "payment_types"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    name = Column(String, nullable=False)
    code = Column(String, nullable=False)
    description = Column(String, nullable=True)
    status = Column(String, nullable=True, default="active")
