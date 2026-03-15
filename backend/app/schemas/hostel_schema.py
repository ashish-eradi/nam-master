from pydantic import BaseModel, Field
import uuid
from typing import Optional

# Schema for Hostel
class HostelBase(BaseModel):
    name: str = Field(..., max_length=100)
    hostel_type: str # Boys, Girls
    warden_name: Optional[str] = Field(None, max_length=100)
    warden_phone: Optional[str] = Field(None, max_length=20)

class HostelCreate(HostelBase):
    school_id: uuid.UUID

class HostelUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    hostel_type: Optional[str] = None # Boys, Girls
    warden_name: Optional[str] = Field(None, max_length=100)
    warden_phone: Optional[str] = Field(None, max_length=20)

class Hostel(HostelBase):
    id: uuid.UUID
    school_id: uuid.UUID
    total_rooms: int = 0

    class Config:
        orm_mode = True

# Schema for HostelRoom
class HostelRoomBase(BaseModel):
    hostel_id: uuid.UUID
    room_number: str = Field(..., max_length=20)
    capacity: int

class HostelRoomCreate(HostelRoomBase):
    pass

class HostelRoomUpdate(BaseModel):
    hostel_id: Optional[uuid.UUID] = None
    room_number: Optional[str] = Field(None, max_length=20)
    capacity: Optional[int] = None

class HostelRoom(HostelRoomBase):
    id: uuid.UUID
    occupied_count: int = 0

    class Config:
        orm_mode = True

# Schema for HostelAllocation
from datetime import date

class HostelAllocationBase(BaseModel):
    student_id: uuid.UUID
    room_id: uuid.UUID
    allocation_date: date
    academic_year: str

class HostelAllocationCreate(HostelAllocationBase):
    pass

class HostelAllocationUpdate(HostelAllocationBase):
    pass

class HostelAllocation(HostelAllocationBase):
    id: uuid.UUID
    status: str # ACTIVE, VACATED

    class Config:
        orm_mode = True

# Allocation detail (with student + room + hostel names)
class AllocationDetail(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    student_name: str
    admission_number: str
    gender: Optional[str]
    room_id: uuid.UUID
    room_number: str
    hostel_id: uuid.UUID
    hostel_name: str
    hostel_type: str
    allocation_date: date
    academic_year: Optional[str]
    status: str

    class Config:
        orm_mode = True

# Schema for HostelFee
class HostelFeeBase(BaseModel):
    hostel_id: uuid.UUID
    amount: float
    installment_type: Optional[str] = None
    fund_id: uuid.UUID
    academic_year: str

class HostelFeeCreate(HostelFeeBase):
    pass

class HostelFeeUpdate(BaseModel):
    amount: Optional[float] = None
    installment_type: Optional[str] = None
    fund_id: Optional[uuid.UUID] = None
    academic_year: Optional[str] = None

class HostelFee(HostelFeeBase):
    id: uuid.UUID

    class Config:
        orm_mode = True

class HostelFeeAssignment(BaseModel):
    hostel_fee_id: uuid.UUID
    academic_year: str

class StudentHostelFeeStructureOut(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    hostel_fee_id: uuid.UUID
    academic_year: str
    total_amount: float
    discount_amount: float
    final_amount: float
    amount_paid: float
    outstanding_amount: float

    class Config:
        orm_mode = True