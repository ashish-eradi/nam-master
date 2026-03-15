import uuid
from sqlalchemy import Column, String, ForeignKey, Integer, Date, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.types import DECIMAL
from app.db.base import Base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

class Hostel(Base):
    __tablename__ = "hostels"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.id"), nullable=False)
    hostel_type = Column(String(20))
    total_rooms = Column(Integer)
    warden_name = Column(String(100))
    warden_phone = Column(String(20))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    school = relationship("School", back_populates="hostels")
    rooms = relationship("HostelRoom", back_populates="hostel")
    hostel_fees = relationship("HostelFee", back_populates="hostel")

class HostelRoom(Base):
    __tablename__ = "hostel_rooms"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    hostel_id = Column(UUID(as_uuid=True), ForeignKey("hostels.id"), nullable=False)
    room_number = Column(String(20), nullable=False)
    capacity = Column(Integer, nullable=False)
    occupied_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    hostel = relationship("Hostel", back_populates="rooms")
    allocations = relationship("HostelAllocation", back_populates="room")

class HostelAllocation(Base):
    __tablename__ = "hostel_allocations"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False)
    room_id = Column(UUID(as_uuid=True), ForeignKey("hostel_rooms.id", ondelete="CASCADE"), nullable=False)
    allocation_date = Column(Date, nullable=False)
    academic_year = Column(String(10))
    status = Column(String(20), default="ACTIVE")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    student = relationship("Student", back_populates="hostel_allocations")
    room = relationship("HostelRoom", back_populates="allocations")

class HostelFee(Base):
    __tablename__ = "hostel_fees"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    hostel_id = Column(UUID(as_uuid=True), ForeignKey("hostels.id"), nullable=False)
    amount = Column(DECIMAL(10, 2), nullable=False)
    installment_type = Column(String(20))
    fund_id = Column(UUID(as_uuid=True), ForeignKey("funds.id"))
    academic_year = Column(String(10))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    hostel = relationship("Hostel", back_populates="hostel_fees")
    student_hostel_fee_structures = relationship("StudentHostelFeeStructure", back_populates="hostel_fee")

class StudentHostelFeeStructure(Base):
    __tablename__ = "student_hostel_fee_structures"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False)
    hostel_fee_id = Column(UUID(as_uuid=True), ForeignKey("hostel_fees.id"), nullable=False)
    academic_year = Column(String(10), nullable=False)
    total_amount = Column(DECIMAL(10, 2), nullable=False)
    discount_amount = Column(DECIMAL(10, 2), default=0)
    final_amount = Column(DECIMAL(10, 2), nullable=False)
    amount_paid = Column(DECIMAL(10, 2), default=0)
    outstanding_amount = Column(DECIMAL(10, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    student = relationship("Student", back_populates="hostel_fee_structures")
    hostel_fee = relationship("HostelFee", back_populates="student_hostel_fee_structures")
