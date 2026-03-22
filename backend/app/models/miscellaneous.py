import uuid
from sqlalchemy import Column, String, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.types import DECIMAL
from app.db.base import Base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func


class MiscellaneousFeeCategory(Base):
    __tablename__ = "miscellaneous_fee_categories"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.id"), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    school = relationship("School", back_populates="miscellaneous_fee_categories")
    miscellaneous_fees = relationship("MiscellaneousFee", back_populates="category")


class MiscellaneousFee(Base):
    __tablename__ = "miscellaneous_fees"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category_id = Column(UUID(as_uuid=True), ForeignKey("miscellaneous_fee_categories.id"), nullable=False)
    amount = Column(DECIMAL(10, 2), nullable=False)
    fund_id = Column(UUID(as_uuid=True), ForeignKey("funds.id"), nullable=True)
    academic_year = Column(String(10), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    category = relationship("MiscellaneousFeeCategory", back_populates="miscellaneous_fees")
    student_miscellaneous_fee_structures = relationship("StudentMiscellaneousFeeStructure", back_populates="miscellaneous_fee")


class StudentMiscellaneousFeeStructure(Base):
    __tablename__ = "student_miscellaneous_fee_structures"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False)
    miscellaneous_fee_id = Column(UUID(as_uuid=True), ForeignKey("miscellaneous_fees.id"), nullable=False)
    academic_year = Column(String(10), nullable=False)
    total_amount = Column(DECIMAL(10, 2), nullable=False)
    discount_amount = Column(DECIMAL(10, 2), default=0)
    final_amount = Column(DECIMAL(10, 2), nullable=False)
    amount_paid = Column(DECIMAL(10, 2), default=0)
    outstanding_amount = Column(DECIMAL(10, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    student = relationship("Student", back_populates="miscellaneous_fee_structures")
    miscellaneous_fee = relationship("MiscellaneousFee", back_populates="student_miscellaneous_fee_structures")
