from core.database import Base
from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func


class LabelTemplates(Base):
    __tablename__ = "label_templates"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    name = Column(String, nullable=False)
    template_type = Column(String, nullable=False)  # product_label, case_marking, stacking
    width_mm = Column(Integer, nullable=True)
    height_mm = Column(Integer, nullable=True)
    fields_config = Column(Text, nullable=True)   # JSON array of enabled fields
    layout_config = Column(Text, nullable=True)   # JSON layout/styling config
    status = Column(String, nullable=True, default="active")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=True)
