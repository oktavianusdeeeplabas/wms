from core.database import Base
from sqlalchemy import Column, Integer, String


class ProductCategories(Base):
    __tablename__ = "product_categories"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    name = Column(String, nullable=False)
    code = Column(String, nullable=False)
    status = Column(String, nullable=True, default="active")


class ProductSubCategories(Base):
    __tablename__ = "product_sub_categories"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    name = Column(String, nullable=False)
    code = Column(String, nullable=False)
    status = Column(String, nullable=True, default="active")


class Brands(Base):
    __tablename__ = "brands"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    name = Column(String, nullable=False)
    code = Column(String, nullable=False)
    status = Column(String, nullable=True, default="active")


class Manufacturers(Base):
    __tablename__ = "manufacturers"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    name = Column(String, nullable=False)
    code = Column(String, nullable=False)
    status = Column(String, nullable=True, default="active")


class ProductTypes(Base):
    __tablename__ = "product_types"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    name = Column(String, nullable=False)
    code = Column(String, nullable=False)
    status = Column(String, nullable=True, default="active")


class ItemGroups(Base):
    __tablename__ = "item_groups"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    name = Column(String, nullable=False)
    code = Column(String, nullable=False)
    status = Column(String, nullable=True, default="active")
