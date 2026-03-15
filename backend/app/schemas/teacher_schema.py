from pydantic import BaseModel, Field, EmailStr
import uuid
from typing import Optional, Dict, Any
from datetime import date

class TeacherBase(BaseModel):
    employee_id: str = Field(..., min_length=3, max_length=50)
    department: Optional[str] = Field(None, max_length=100)
    qualification: Optional[str] = Field(None, max_length=200)
    specialization: Optional[str] = None
    hire_date: Optional[date] = None
    experience_years: Optional[int] = None

class TeacherCreate(TeacherBase):
    email: Optional[EmailStr] = None
    full_name: str = Field(..., min_length=2, max_length=100)
    password: Optional[str] = None
    school_id: Optional[uuid.UUID] = None

class TeacherUpdate(BaseModel):
    employee_id: Optional[str] = Field(None, min_length=3, max_length=50)
    department: Optional[str] = Field(None, max_length=100)
    qualification: Optional[str] = Field(None, max_length=200)
    specialization: Optional[str] = None
    hire_date: Optional[date] = None
    experience_years: Optional[int] = None

class Teacher(TeacherBase):
    id: uuid.UUID
    user_id: uuid.UUID
    school_id: uuid.UUID
    email: Optional[str] = None
    full_name: Optional[str] = None
    photo_url: Optional[str] = None
    documents: Optional[Dict[str, Any]] = {}

    class Config:
        orm_mode = True
