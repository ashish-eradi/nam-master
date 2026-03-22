from pydantic import BaseModel, Field
import uuid
from typing import Optional


class MiscellaneousFeeCategoryBase(BaseModel):
    name: str = Field(..., max_length=100)
    description: Optional[str] = Field(None, max_length=255)


class MiscellaneousFeeCategoryCreate(MiscellaneousFeeCategoryBase):
    pass


class MiscellaneousFeeCategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = Field(None, max_length=255)


class MiscellaneousFeeCategory(MiscellaneousFeeCategoryBase):
    id: uuid.UUID
    school_id: uuid.UUID

    class Config:
        orm_mode = True


class MiscellaneousFeeBase(BaseModel):
    category_id: uuid.UUID
    amount: float
    fund_id: Optional[uuid.UUID] = None
    academic_year: str


class MiscellaneousFeeCreate(MiscellaneousFeeBase):
    pass


class MiscellaneousFeeUpdate(BaseModel):
    amount: Optional[float] = None
    fund_id: Optional[uuid.UUID] = None
    academic_year: Optional[str] = None


class MiscellaneousFeeOut(MiscellaneousFeeBase):
    id: uuid.UUID
    category_name: Optional[str] = None

    class Config:
        orm_mode = True


class MiscellaneousFeeAssignment(BaseModel):
    miscellaneous_fee_id: uuid.UUID
    academic_year: str


class StudentMiscellaneousFeeStructureOut(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    miscellaneous_fee_id: uuid.UUID
    academic_year: str
    total_amount: float
    discount_amount: float
    final_amount: float
    amount_paid: float
    outstanding_amount: float

    class Config:
        orm_mode = True
