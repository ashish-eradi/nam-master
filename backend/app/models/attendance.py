import uuid
from sqlalchemy import Column, String, Date, ForeignKey, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

class Attendance(Base):
    __tablename__ = "attendance"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False)
    class_id = Column(UUID(as_uuid=True), ForeignKey("classes.id"), nullable=False)
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.id"), nullable=False)
    date = Column(Date, nullable=False)
    status = Column(String(10), nullable=False)
    period_id = Column(UUID(as_uuid=True))
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id"))
    marked_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    remarks = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    student = relationship("Student", back_populates="attendance")
    class_ = relationship("Class", back_populates="attendance")
    school = relationship("School", back_populates="attendance")
    subject = relationship("Subject", back_populates="attendance")
    marked_by = relationship("User", back_populates="marked_attendance")
