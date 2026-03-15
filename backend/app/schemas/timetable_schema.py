from pydantic import BaseModel, Field
import uuid
from typing import Optional
from datetime import time

# Schema for Period
class PeriodBase(BaseModel):
    period_number: int
    start_time: time
    end_time: time

class PeriodCreate(PeriodBase):
    school_id: uuid.UUID

class PeriodUpdate(BaseModel):
    period_number: Optional[int] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None

class Period(PeriodBase):
    id: uuid.UUID
    school_id: uuid.UUID

    class Config:
        orm_mode = True

# Schema for TimetableEntry
class TimetableEntryBase(BaseModel):
    class_id: uuid.UUID
    subject_id: uuid.UUID
    teacher_id: uuid.UUID
    period_id: uuid.UUID
    day_of_week: int # 1=Monday, 7=Sunday
    academic_year: str

class TimetableEntryCreate(TimetableEntryBase):
    school_id: uuid.UUID

class TimetableEntryUpdate(BaseModel):
    subject_id: Optional[uuid.UUID] = None
    teacher_id: Optional[uuid.UUID] = None
    day_of_week: Optional[int] = None

class TimetableEntry(TimetableEntryBase):
    id: uuid.UUID
    school_id: uuid.UUID

    class Config:
        orm_mode = True