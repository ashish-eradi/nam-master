import uuid
from sqlalchemy import Column, String, ForeignKey, DECIMAL, Date, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

class AssessmentType(Base):
    __tablename__ = "assessment_types"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(50), nullable=False)
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.id"), nullable=False)
    default_weightage = Column(DECIMAL(5, 2), default=0.00)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    school = relationship("School", back_populates="assessment_types")
    assessments = relationship("Assessment", back_populates="assessment_type")

class Assessment(Base):
    __tablename__ = "assessments"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    assessment_type_id = Column(UUID(as_uuid=True), ForeignKey("assessment_types.id"))
    class_id = Column(UUID(as_uuid=True), ForeignKey("classes.id"), nullable=False)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=False)
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.id"), nullable=False)
    teacher_id = Column(UUID(as_uuid=True), ForeignKey("teachers.id"))
    max_marks = Column(DECIMAL(6, 2), nullable=False)
    due_date = Column(Date)
    academic_year = Column(String(10))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    assessment_type = relationship("AssessmentType", back_populates="assessments")
    class_ = relationship("Class", back_populates="assessments")
    subject = relationship("Subject", back_populates="assessments")
    school = relationship("School", back_populates="assessments")
    teacher = relationship("Teacher", back_populates="assessments")
    grades = relationship("Grade", back_populates="assessment")
