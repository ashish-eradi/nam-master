import uuid
from sqlalchemy import Column, String, ForeignKey, DECIMAL, Integer, DateTime
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from app.db.base import Base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

class Route(Base):
    __tablename__ = "routes"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    route_name = Column(String(100), nullable=False)
    route_number = Column(String(20))
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.id"), nullable=False)
    pickup_points = Column(String)
    distance_km = Column(DECIMAL(6, 2))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    school = relationship("School", back_populates="routes")
    route_fees = relationship("RouteFee", back_populates="route")
    student_routes = relationship("StudentRoute", back_populates="route")
    vehicles = relationship("Vehicle", back_populates="route")

class RouteFee(Base):
    __tablename__ = "route_fees"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    route_id = Column(UUID(as_uuid=True), ForeignKey("routes.id"), nullable=False)
    amount = Column(DECIMAL(10, 2), nullable=False)
    installment_type = Column(String(20))
    fund_id = Column(UUID(as_uuid=True), ForeignKey("funds.id"))
    academic_year = Column(String(10))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    route = relationship("Route", back_populates="route_fees")
    fund = relationship("Fund", back_populates="route_fees")
    student_route_fee_structures = relationship("StudentRouteFeeStructure", back_populates="route_fee")

class StudentRouteFeeStructure(Base):
    __tablename__ = "student_route_fee_structures"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False)
    route_fee_id = Column(UUID(as_uuid=True), ForeignKey("route_fees.id"), nullable=False)
    student_route_id = Column(UUID(as_uuid=True), ForeignKey("student_routes.id"))
    academic_year = Column(String(10), nullable=False)
    total_amount = Column(DECIMAL(10, 2), nullable=False)
    discount_amount = Column(DECIMAL(10, 2), default=0)
    final_amount = Column(DECIMAL(10, 2), nullable=False)
    amount_paid = Column(DECIMAL(10, 2), default=0)
    outstanding_amount = Column(DECIMAL(10, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    student = relationship("Student", back_populates="route_fee_structures")
    route_fee = relationship("RouteFee", back_populates="student_route_fee_structures")
    student_route = relationship("StudentRoute")

class StudentRoute(Base):
    __tablename__ = "student_routes"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False)
    route_id = Column(UUID(as_uuid=True), ForeignKey("routes.id", ondelete="CASCADE"), nullable=False)
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.id"), nullable=False)
    pickup_point = Column(String(200))
    academic_year = Column(String(10))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    student = relationship("Student", back_populates="student_routes")
    route = relationship("Route", back_populates="student_routes")
    school = relationship("School", back_populates="student_routes")

class Vehicle(Base):
    __tablename__ = "vehicles"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vehicle_number = Column(String(20), unique=True, nullable=False)
    vehicle_type = Column(String(50))
    capacity = Column(Integer)
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.id"), nullable=False)
    route_id = Column(UUID(as_uuid=True), ForeignKey("routes.id"))
    driver_name = Column(String(100))
    driver_phone = Column(String(20))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    school = relationship("School", back_populates="vehicles")
    route = relationship("Route", back_populates="vehicles")
