import uuid
from sqlalchemy import Column, String, Integer, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

class Class(Base):
    __tablename__ = "classes"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(50), nullable=False)
    section = Column(String(10), nullable=False)
    grade_level = Column(Integer)
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.id"), nullable=False)
    academic_year = Column(String(10), nullable=False)
    class_teacher_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    max_students = Column(Integer, default=40)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    school = relationship("School", back_populates="classes")
    class_teacher = relationship("User", back_populates="class_in_charge")
    subjects = relationship("Subject", back_populates="class_")
    students = relationship("Student", back_populates="class_")
    attendance = relationship("Attendance", back_populates="class_")
    assessments = relationship("Assessment", back_populates="class_")
    class_fees = relationship("ClassFee", back_populates="class_")
    exams = relationship("Exam", back_populates="class_")
    # exam_timetables = relationship("ExamTimetable", back_populates="class_")  # Temporarily commented to fix circular import
    timetable_entries = relationship("TimetableEntry", back_populates="class_")
