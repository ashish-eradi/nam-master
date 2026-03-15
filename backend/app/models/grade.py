import uuid
from sqlalchemy import Column, String, ForeignKey, DECIMAL, Date, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

class Grade(Base):
    __tablename__ = "grades"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False)
    assessment_id = Column(UUID(as_uuid=True), ForeignKey("assessments.id"), nullable=False)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=False)
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.id"), nullable=False)
    score_achieved = Column(DECIMAL(6, 2), nullable=False)
    grade_letter = Column(String(5))
    remarks = Column(Text)
    entered_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    exam_type = Column(String(50))
    academic_year = Column(String(10))
    date = Column(Date)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    student = relationship("Student", back_populates="grades")
    assessment = relationship("Assessment", back_populates="grades")
    subject = relationship("Subject", back_populates="grades")
    school = relationship("School", back_populates="grades")
    entered_by = relationship("User", back_populates="entered_grades")
