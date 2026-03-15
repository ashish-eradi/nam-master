import uuid
from sqlalchemy import Column, String, Text, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

class Subject(Base):
    __tablename__ = "subjects"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    code = Column(String(20), nullable=False)
    description = Column(Text)
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.id"), nullable=False)
    class_id = Column(UUID(as_uuid=True), ForeignKey("classes.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    school = relationship("School", back_populates="subjects")
    class_ = relationship("Class", back_populates="subjects")
    attendance = relationship("Attendance", back_populates="subject")
    assessments = relationship("Assessment", back_populates="subject")
    grades = relationship("Grade", back_populates="subject")
    exams = relationship("Exam", back_populates="subject")
    exam_schedule_items = relationship("ExamScheduleItem", back_populates="subject")
    timetable_entries = relationship("TimetableEntry", back_populates="subject")
