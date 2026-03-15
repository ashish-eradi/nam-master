from pydantic import BaseModel, Field
import uuid
from typing import Optional, List
from datetime import date

class GradeBase(BaseModel):
    student_id: uuid.UUID
    assessment_id: uuid.UUID
    subject_id: uuid.UUID
    score_achieved: float
    remarks: Optional[str] = None

class GradeCreate(GradeBase):
    school_id: uuid.UUID
    entered_by_user_id: Optional[uuid.UUID] = None
    academic_year: Optional[str] = None

class GradeUpdate(BaseModel):
    score_achieved: Optional[float] = None
    remarks: Optional[str] = None

class Grade(GradeBase):
    id: uuid.UUID
    school_id: uuid.UUID
    entered_by_user_id: Optional[uuid.UUID] = None
    academic_year: Optional[str] = None

    class Config:
        orm_mode = True

class BulkGradeEntry(BaseModel):
    assessment_id: uuid.UUID
    grades: List[dict] # e.g., [{"student_id": "...", "score_achieved": 95.5}]