from pydantic import BaseModel
import uuid
from typing import Optional

class SubjectBase(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    class_id: Optional[uuid.UUID] = None

class SubjectCreate(SubjectBase):
    school_id: Optional[uuid.UUID] = None

class SubjectUpdate(SubjectBase):
    pass

class Subject(SubjectBase):
    id: uuid.UUID
    school_id: uuid.UUID

    class Config:
        orm_mode = True
