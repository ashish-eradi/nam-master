from pydantic import BaseModel, Field
import uuid
from typing import Optional, Dict, Any
from datetime import date
from app.schemas.class_schema import Class

class StudentBase(BaseModel):
    admission_number: str
    first_name: str
    last_name: str
    date_of_birth: date
    gender: str
    class_id: uuid.UUID
    school_id: uuid.UUID
    admission_date: date
    academic_year: str
    roll_number_assignment_type: Optional[str] = "MANUAL"
    aadhar_number: Optional[str] = None
    address: Optional[str] = None
    area: Optional[str] = None
    blood_group: Optional[str] = None

class StudentCreate(StudentBase):
    admission_number: str = Field(..., min_length=5, max_length=20)
    first_name: str = Field(..., min_length=2, max_length=50)
    last_name: str = Field(..., min_length=2, max_length=50)
    school_id: Optional[uuid.UUID] = None
    # Parent Account Creation
    create_parent_account: bool = True
    parent_email: Optional[str] = Field(None, description="Parent email for portal login (optional)")
    parent_password: Optional[str] = None  # Optional, will default to "Parent@123"
    parent_full_name: Optional[str] = None
    father_name: str = Field(..., min_length=2, max_length=100, description="Father's name is required")
    father_phone: str = Field(..., min_length=10, max_length=20, description="Father's phone is required")
    mother_name: Optional[str] = Field(None, max_length=100)
    mother_phone: Optional[str] = Field(None, max_length=20)

class StudentUpdate(BaseModel):
    admission_number: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    class_id: Optional[uuid.UUID] = None
    school_id: Optional[uuid.UUID] = None
    admission_date: Optional[date] = None
    academic_year: Optional[str] = None
    roll_number: Optional[str] = None
    roll_number_assignment_type: Optional[str] = None
    aadhar_number: Optional[str] = None
    address: Optional[str] = None
    area: Optional[str] = None
    blood_group: Optional[str] = None

class Student(StudentBase):
    id: uuid.UUID
    roll_number: Optional[str] = None
    roll_number_assignment_type: Optional[str] = "MANUAL"
    transport_required: Optional[bool] = False
    hostel_required: Optional[bool] = False
    status: Optional[str] = "ACTIVE"
    photo_url: Optional[str] = None
    documents: Optional[Dict[str, Any]] = {}
    class_: Optional[Class] = None

    class Config:
        orm_mode = True
