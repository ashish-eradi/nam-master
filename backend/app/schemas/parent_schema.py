from pydantic import BaseModel
import uuid
from typing import Optional, List

class ParentBase(BaseModel):
    user_id: uuid.UUID
    school_id: uuid.UUID

class ParentCreate(ParentBase):
    pass

class ParentUpdate(ParentBase):
    pass

class Parent(ParentBase):
    id: uuid.UUID

    class Config:
        orm_mode = True

class ParentStudentLink(BaseModel):
    parent_id: uuid.UUID
    student_id: uuid.UUID
    relationship_type: str
