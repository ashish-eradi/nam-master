import uuid
from pydantic import BaseModel
from typing import Optional

class ClassBase(BaseModel):
    name: str
    section: str
    grade_level: int
    academic_year: str
    max_students: Optional[int] = 40

class ClassCreate(ClassBase):
    pass

class ClassUpdate(ClassBase):
    pass

class Class(ClassBase):
    id: uuid.UUID
    school_id: uuid.UUID
    class_teacher_id: Optional[uuid.UUID] = None

    class Config:
        from_attributes = True
