import uuid
from sqlalchemy import Column, String, ForeignKey, DECIMAL, Date, Text, Integer, Time, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

class Exam(Base):
    __tablename__ = "exams"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    class_id = Column(UUID(as_uuid=True), ForeignKey("classes.id"), nullable=False)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=False)
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.id"), nullable=False)
    exam_date = Column(Date, nullable=False)
    start_time = Column(Time)
    duration_minutes = Column(Integer)
    max_marks = Column(DECIMAL(6, 2))
    syllabus = Column(Text)
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    academic_year = Column(String(10))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    class_ = relationship("Class", back_populates="exams")
    subject = relationship("Subject", back_populates="exams")
    school = relationship("School", back_populates="exams")
    created_by = relationship("User", back_populates="created_exams")
