from pydantic import BaseModel, Field
import uuid
from typing import Optional
from datetime import date, time

from app.schemas.class_schema import Class
from app.schemas.subject_schema import Subject

class ExamBase(BaseModel):
    name: str = Field(..., max_length=100)
    class_id: uuid.UUID
    subject_id: uuid.UUID
    exam_date: date
    start_time: Optional[time] = None
    duration_minutes: Optional[int] = None
    max_marks: Optional[float] = None
    syllabus: Optional[str] = None
    academic_year: str

class ExamCreate(ExamBase):
    school_id: uuid.UUID

class ExamUpdate(BaseModel):
    name: Optional[str] = None
    class_id: Optional[uuid.UUID] = None
    subject_id: Optional[uuid.UUID] = None
    exam_date: Optional[date] = None
    start_time: Optional[time] = None
    duration_minutes: Optional[int] = None
    max_marks: Optional[float] = None
    syllabus: Optional[str] = None
    academic_year: Optional[str] = None

class Exam(ExamBase):
    id: uuid.UUID
    school_id: uuid.UUID
    created_by_user_id: uuid.UUID
    class_: Class # Nested Class schema
    subject: Subject # Nested Subject schema

    class Config:
        orm_mode = True