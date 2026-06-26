from core.database import Base
from sqlalchemy import Boolean, Column, Integer, String


class Products(Base):
    __tablename__ = "products"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    name = Column(String, nullable=False)
    sku = Column(String, nullable=False)
    short_name = Column(String, nullable=True)
    barcode = Column(String, nullable=True)
    qr_code = Column(String, nullable=True)
    alternate_barcode = Column(String, nullable=True)
    category = Column(String, nullable=True)
    sub_category = Column(String, nullable=True)
    brand = Column(String, nullable=True)
    manufacturer = Column(String, nullable=True)
    product_type = Column(String, nullable=True)
    item_group = Column(String, nullable=True)
    uom = Column(String, nullable=True)
    temperature_class = Column(String, nullable=True)
    shelf_life_days = Column(Integer, nullable=True)
    min_stock = Column(Integer, nullable=True)
    max_stock = Column(Integer, nullable=True)
    reorder_point = Column(Integer, nullable=True)
    is_perishable = Column(Boolean, nullable=True)
    product_image = Column(String, nullable=True)
    description = Column(String, nullable=True)
    status = Column(String, nullable=True)
