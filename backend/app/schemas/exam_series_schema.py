from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime
from uuid import UUID
from enum import Enum

class ExamType(str, Enum):
    UNIT_TEST = "Unit Test"
    MIDTERM = "Midterm"
    FINAL = "Final"
    QUARTERLY = "Quarterly"
    HALF_YEARLY = "Half Yearly"
    ANNUAL = "Annual"
    PRACTICAL = "Practical"
    INTERNAL = "Internal"

# ===== ExamSeries Schemas =====

class ExamSeriesCreate(BaseModel):
    name: str = Field(..., max_length=200)
    exam_type: ExamType
    academic_year: str = Field(..., max_length=10)
    school_id: UUID
    description: Optional[str] = None
    start_date: date
    end_date: date
    is_published: bool = False

class ExamSeriesUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=200)
    exam_type: Optional[ExamType] = None
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_published: Optional[bool] = None

class ExamSeries(BaseModel):
    id: UUID
    name: str
    exam_type: ExamType
    academic_year: str
    school_id: UUID
    description: Optional[str]
    start_date: date
    end_date: date
    is_published: bool
    created_by_user_id: Optional[UUID]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

# ===== ExamScheduleItem Schemas =====

class ExamScheduleItemCreate(BaseModel):
    subject_id: UUID
    exam_date: date
    start_time: str = Field(..., max_length=10)
    duration_minutes: int
    max_marks: float
    passing_marks: Optional[float] = None
    room_number: Optional[str] = Field(None, max_length=50)
    instructions: Optional[str] = None

class ExamScheduleItemUpdate(BaseModel):
    subject_id: Optional[UUID] = None
    exam_date: Optional[date] = None
    start_time: Optional[str] = Field(None, max_length=10)
    duration_minutes: Optional[int] = None
    max_marks: Optional[float] = None
    passing_marks: Optional[float] = None
    room_number: Optional[str] = Field(None, max_length=50)
    instructions: Optional[str] = None

class ExamScheduleItem(BaseModel):
    id: UUID
    exam_timetable_id: UUID
    subject_id: UUID
    exam_date: date
    start_time: str
    duration_minutes: int
    max_marks: float
    passing_marks: Optional[float]
    room_number: Optional[str]
    instructions: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

# ===== ExamTimetable Schemas =====

class ExamTimetableCreate(BaseModel):
    exam_series_id: UUID
    class_id: UUID
    school_id: UUID
    instructions: Optional[str] = None
    schedule_items: List[ExamScheduleItemCreate] = []

class ExamTimetableUpdate(BaseModel):
    instructions: Optional[str] = None

class ExamTimetable(BaseModel):
    id: UUID
    exam_series_id: UUID
    class_id: UUID
    school_id: UUID
    instructions: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    schedule_items: List[ExamScheduleItem] = []

    class Config:
        from_attributes = True

# ===== StudentExamMarks Schemas =====

class StudentExamMarksCreate(BaseModel):
    student_id: UUID
    exam_schedule_item_id: UUID
    marks_obtained: Optional[float] = None
    grade_letter: Optional[str] = Field(None, max_length=5)
    is_absent: bool = False
    remarks: Optional[str] = None

class StudentExamMarksUpdate(BaseModel):
    marks_obtained: Optional[float] = None
    grade_letter: Optional[str] = Field(None, max_length=5)
    is_absent: Optional[bool] = None
    remarks: Optional[str] = None

class StudentExamMarks(BaseModel):
    id: UUID
    student_id: UUID
    exam_schedule_item_id: UUID
    marks_obtained: Optional[float]
    grade_letter: Optional[str]
    is_absent: bool
    remarks: Optional[str]
    entered_by_user_id: Optional[UUID]
    entered_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

# ===== Bulk Operations =====

class BulkMarksEntry(BaseModel):
    """For entering marks for multiple students in one subject"""
    exam_schedule_item_id: UUID
    marks: List[StudentExamMarksCreate]

class SubjectMarksEntry(BaseModel):
    """Single student's mark for one subject"""
    student_id: UUID
    marks_obtained: Optional[float] = None
    grade_letter: Optional[str] = None
    is_absent: bool = False
    remarks: Optional[str] = None

class BulkSubjectMarks(BaseModel):
    """For entering marks for all students in one subject at once"""
    exam_schedule_item_id: UUID
    marks: List[SubjectMarksEntry]

# ===== Response Schemas with Related Data =====

class ExamSeriesWithTimetables(ExamSeries):
    timetables: List[ExamTimetable] = []

class ExamScheduleItemWithSubject(ExamScheduleItem):
    subject_name: str
    subject_code: Optional[str]

class ExamTimetableWithSchedule(ExamTimetable):
    class_name: str
    schedule_items: List[ExamScheduleItemWithSubject] = []

class StudentMarksSheet(BaseModel):
    """Complete marks sheet for a student in an exam series"""
    student_id: UUID
    student_name: str
    admission_number: str
    class_name: str
    exam_series_name: str
    exam_type: ExamType
    marks: List[StudentExamMarks]
    total_marks_obtained: float
    total_max_marks: float
    percentage: float
    overall_grade: Optional[str]

class HallTicket(BaseModel):
    """Hall ticket information for a student"""
    student_id: UUID
    student_name: str
    admission_number: str
    class_name: str
    father_name: Optional[str]
    exam_series_name: str
    exam_type: ExamType
    start_date: date
    end_date: date
    schedule: List[ExamScheduleItemWithSubject]
    instructions: Optional[str]
    student_photo_url: Optional[str]
