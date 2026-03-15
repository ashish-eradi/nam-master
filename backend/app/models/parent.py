import uuid
from sqlalchemy import Column, ForeignKey, String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

class Parent(Base):
    __tablename__ = "parents"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.id"), nullable=False)
    father_name = Column(String(100), nullable=True)
    father_phone = Column(String(20), nullable=True)
    father_email = Column(String(100), nullable=True)
    father_occupation = Column(String(100), nullable=True)
    mother_name = Column(String(100), nullable=True)
    mother_phone = Column(String(20), nullable=True)
    mother_email = Column(String(100), nullable=True)
    mother_occupation = Column(String(100), nullable=True)
    address = Column(String, nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    pincode = Column(String(10), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    user = relationship("User", back_populates="parent")
    school = relationship("School", back_populates="parents")
    students = relationship("ParentStudentRelation", back_populates="parent")

class ParentStudentRelation(Base):
    __tablename__ = "parent_student_relation"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("parents.id"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False)
    relationship_type = Column(String(20), nullable=False)
    primary_contact = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    parent = relationship("Parent", back_populates="students")
    student = relationship("Student", back_populates="parents")