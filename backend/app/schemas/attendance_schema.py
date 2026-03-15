from pydantic import BaseModel, Field
import uuid
from typing import Optional, List
from datetime import date

class AttendanceBase(BaseModel):
    student_id: uuid.UUID
    class_id: uuid.UUID
    date: date
    status: str # P, A, L, HL
    subject_id: Optional[uuid.UUID] = None
    remarks: Optional[str] = None

class AttendanceCreate(AttendanceBase):
    school_id: uuid.UUID
    marked_by_user_id: Optional[uuid.UUID] = None

class AttendanceUpdate(BaseModel):
    status: Optional[str] = None
    remarks: Optional[str] = None

class Attendance(AttendanceBase):
    id: uuid.UUID
    school_id: uuid.UUID
    marked_by_user_id: Optional[uuid.UUID] = None

    class Config:
        orm_mode = True

class BulkAttendanceCreate(BaseModel):
    class_id: uuid.UUID
    date: date
    attendances: List[dict] # e.g., [{"student_id": "...", "status": "P"}]

# Attendance Statistics Schemas
class StudentAttendanceSummary(BaseModel):
    student_id: uuid.UUID
    student_name: str
    roll_number: Optional[str] = None
    present: int
    absent: int
    late: int
    half_day: int
    total_days: int
    attendance_percentage: float

class ClassAttendanceSummary(BaseModel):
    class_id: uuid.UUID
    class_name: str
    section: str
    total_students: int
    present: int
    absent: int
    late: int
    half_day: int
    attendance_percentage: float

class DailyAttendanceOverview(BaseModel):
    date: date
    total_students: int
    present: int
    absent: int
    late: int
    half_day: int
    attendance_percentage: float
    by_class: List[ClassAttendanceSummary]

class MonthlyAttendanceOverview(BaseModel):
    year: int
    month: int
    total_working_days: int
    by_class: List[ClassAttendanceSummary]
    by_student: List[StudentAttendanceSummary]