import uuid
from sqlalchemy import Column, String, ForeignKey, Date, Text, DateTime, Enum, Boolean, Integer, Numeric
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

class ExamType(str, enum.Enum):
    UNIT_TEST = "Unit Test"
    MIDTERM = "Midterm"
    FINAL = "Final"
    QUARTERLY = "Quarterly"
    HALF_YEARLY = "Half Yearly"
    ANNUAL = "Annual"
    PRACTICAL = "Practical"
    INTERNAL = "Internal"

class ExamSeries(Base):
    """
    Represents an exam series (e.g., Midterm Exam 2025-26).
    An exam series can apply to multiple classes.
    """
    __tablename__ = "exam_series"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)  # "Midterm Exam 2025-26"
    exam_type = Column(String(50), nullable=False)  # Store as string to match database enum
    academic_year = Column(String(10), nullable=False)  # "2025-26"
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.id"), nullable=False)
    description = Column(Text)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    is_published = Column(Boolean, default=False)  # Can students see it?
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    school = relationship("School", back_populates="exam_series")
    created_by = relationship("User", foreign_keys=[created_by_user_id])
    timetables = relationship("ExamTimetable", back_populates="exam_series", cascade="all, delete-orphan")


class ExamTimetable(Base):
    """
    Represents a timetable for a specific class in an exam series.
    Each class gets its own timetable.
    """
    __tablename__ = "exam_timetables"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exam_series_id = Column(UUID(as_uuid=True), ForeignKey("exam_series.id"), nullable=False)
    class_id = Column(UUID(as_uuid=True), ForeignKey("classes.id"), nullable=False)
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.id"), nullable=False)
    instructions = Column(Text)  # Exam instructions for this class
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    exam_series = relationship("ExamSeries", back_populates="timetables")
    class_ = relationship("Class")  # Removed back_populates to fix circular import
    school = relationship("School", back_populates="exam_timetables")
    schedule_items = relationship("ExamScheduleItem", back_populates="exam_timetable", cascade="all, delete-orphan")


class ExamScheduleItem(Base):
    """
    Represents a single subject exam slot in a timetable.
    E.g., "Mathematics on Jan 15, 2026, 9 AM - 12 PM, 100 marks"
    """
    __tablename__ = "exam_schedule_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exam_timetable_id = Column(UUID(as_uuid=True), ForeignKey("exam_timetables.id"), nullable=False)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=False)
    exam_date = Column(Date, nullable=False)
    start_time = Column(String(10), nullable=False)  # "09:00 AM"
    duration_minutes = Column(Integer, nullable=False)  # 180 (3 hours)
    max_marks = Column(Numeric(5, 2), nullable=False)  # 100.00
    passing_marks = Column(Numeric(5, 2))  # 33.00
    room_number = Column(String(50))  # "Room 101"
    instructions = Column(Text)  # Subject-specific instructions
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    exam_timetable = relationship("ExamTimetable", back_populates="schedule_items")
    subject = relationship("Subject", back_populates="exam_schedule_items")
    student_marks = relationship("StudentExamMarks", back_populates="exam_schedule_item", cascade="all, delete-orphan")


class StudentExamMarks(Base):
    """
    Stores marks obtained by a student in a specific subject exam.
    """
    __tablename__ = "student_exam_marks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False)
    exam_schedule_item_id = Column(UUID(as_uuid=True), ForeignKey("exam_schedule_items.id"), nullable=False)
    marks_obtained = Column(Numeric(5, 2))  # 85.50
    grade_letter = Column(String(5))  # "A+", "A", "B+", etc.
    is_absent = Column(Boolean, default=False)
    remarks = Column(Text)
    entered_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    entered_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    student = relationship("Student", back_populates="exam_marks")
    exam_schedule_item = relationship("ExamScheduleItem", back_populates="student_marks")
    entered_by = relationship("User", foreign_keys=[entered_by_user_id])
