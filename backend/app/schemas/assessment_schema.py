from pydantic import BaseModel, Field
import uuid
from typing import Optional
from datetime import date

# Schema for AssessmentType
class AssessmentTypeBase(BaseModel):
    name: str = Field(..., max_length=50)
    default_weightage: Optional[float] = 0.0

class AssessmentTypeCreate(AssessmentTypeBase):
    school_id: uuid.UUID

class AssessmentTypeUpdate(AssessmentTypeBase):
    pass

class AssessmentType(AssessmentTypeBase):
    id: uuid.UUID
    school_id: uuid.UUID

    class Config:
        orm_mode = True

# Schema for Assessment
class AssessmentBase(BaseModel):
    name: str = Field(..., max_length=100)
    assessment_type_id: uuid.UUID
    class_id: uuid.UUID
    subject_id: uuid.UUID
    max_marks: float
    due_date: Optional[date] = None
    academic_year: str

class AssessmentCreate(AssessmentBase):
    school_id: uuid.UUID
    teacher_id: uuid.UUID

class AssessmentUpdate(AssessmentBase):
    pass

class Assessment(AssessmentBase):
    id: uuid.UUID
    school_id: uuid.UUID
    teacher_id: uuid.UUID

    class Config:
        orm_mode = True