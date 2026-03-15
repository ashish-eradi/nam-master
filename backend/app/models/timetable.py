import uuid
from sqlalchemy import Column, String, ForeignKey, Integer, Time, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

class Period(Base):
    __tablename__ = "periods"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.id"), nullable=False)
    period_number = Column(Integer, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    school = relationship("School", back_populates="periods")
    timetable_entries = relationship("TimetableEntry", back_populates="period")

class TimetableEntry(Base):
    __tablename__ = "timetable_entries"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    class_id = Column(UUID(as_uuid=True), ForeignKey("classes.id"), nullable=False)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=False)
    teacher_id = Column(UUID(as_uuid=True), ForeignKey("teachers.id"))
    period_id = Column(UUID(as_uuid=True), ForeignKey("periods.id"), nullable=False)
    day_of_week = Column(Integer, nullable=False)
    room_id = Column(UUID(as_uuid=True))
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.id"), nullable=False)
    academic_year = Column(String(10))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    class_ = relationship("Class", back_populates="timetable_entries")
    subject = relationship("Subject", back_populates="timetable_entries")
    teacher = relationship("Teacher", back_populates="timetable_entries")
    period = relationship("Period", back_populates="timetable_entries")
    school = relationship("School", back_populates="timetable_entries")
