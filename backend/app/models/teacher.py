import uuid
from sqlalchemy import Column, String, Date, Integer, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSONB
from app.db.base import Base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

class Teacher(Base):
    __tablename__ = "teachers"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    employee_id = Column(String(50), unique=True, nullable=False)
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.id"), nullable=False)
    department = Column(String(100))
    qualification = Column(String(200))
    specialization = Column(String)
    hire_date = Column(Date)
    experience_years = Column(Integer)
    photo_url = Column(String, nullable=True)
    documents = Column(JSONB, default={})  # Store document metadata as JSON
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    user = relationship("User", back_populates="teacher")
    school = relationship("School", back_populates="teachers")
    assessments = relationship("Assessment", back_populates="teacher")
    salaries = relationship("Salary", back_populates="teacher")
    timetable_entries = relationship("TimetableEntry", back_populates="teacher")
