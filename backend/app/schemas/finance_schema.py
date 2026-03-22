from pydantic import BaseModel, Field
import uuid
from typing import Optional, List
from datetime import date
from app.models.enums import InstallmentType, FeeApplicability

# Schema for Fund
class FundBase(BaseModel):
    name: str = Field(..., max_length=100)
    short_name: Optional[str] = Field(None, max_length=20)
    receipt_series_prefix: Optional[str] = Field(None, max_length=10)
    receipt_number_start: int = 1
    installment_type: Optional[str] = Field(None, max_length=20)  # monthly, quarterly, half_yearly, yearly

class FundCreate(FundBase):
    school_id: uuid.UUID

class FundUpdate(FundBase):
    pass

class Fund(FundBase):
    id: uuid.UUID
    school_id: uuid.UUID
    current_receipt_number: int
    installment_type: Optional[str] = None

    class Config:
        orm_mode = True

# Schema for Fee
class FeeBase(BaseModel):
    fee_name: str = Field(..., max_length=100)
    fee_short_name: Optional[str] = Field(None, max_length=20)
    fund_id: uuid.UUID

class FeeCreate(FeeBase):
    school_id: uuid.UUID

class FeeUpdate(BaseModel):
    fee_name: Optional[str] = None
    fee_short_name: Optional[str] = None
    fund_id: Optional[uuid.UUID] = None

class Fee(FeeBase):
    id: uuid.UUID
    school_id: uuid.UUID

    class Config:
        orm_mode = True

# Schema for ClassFee
class ClassFeeBase(BaseModel):
    fee_id: uuid.UUID
    class_id: uuid.UUID
    amount: float
    installment_type: InstallmentType = InstallmentType.ANNUALLY
    fee_applicability: FeeApplicability = FeeApplicability.ALL
    academic_year: str

class ClassFeeCreate(ClassFeeBase):
    pass

class ClassFee(ClassFeeBase):
    id: uuid.UUID

    class Config:
        orm_mode = True

# Schema for Payment
class PaymentBase(BaseModel):
    student_id: uuid.UUID
    fund_id: uuid.UUID
    payment_date: date
    amount_paid: float
    payment_mode: str
    transaction_id: Optional[str] = None
    remarks: Optional[str] = None

class PaymentCreate(PaymentBase):
    school_id: uuid.UUID

class PaymentUpdate(BaseModel):
    payment_date: Optional[date] = None
    amount_paid: Optional[float] = None
    payment_mode: Optional[str] = None
    transaction_id: Optional[str] = None
    remarks: Optional[str] = None
    edit_reason: str = Field(..., min_length=3, description="Reason for editing this payment")

class Payment(PaymentBase):
    id: uuid.UUID
    receipt_number: str
    school_id: uuid.UUID
    received_by_user_id: Optional[uuid.UUID] = None

    class Config:
        orm_mode = True

# Schema for Concession
class ConcessionBase(BaseModel):
    student_id: uuid.UUID
    fee_id: uuid.UUID
    discount_amount: Optional[float] = None
    discount_percentage: Optional[float] = None
    reason: Optional[str] = None
    academic_year: str

class ConcessionCreate(ConcessionBase):
    school_id: uuid.UUID

class Concession(ConcessionBase):
    id: uuid.UUID
    school_id: uuid.UUID
    approved_by_user_id: uuid.UUID

    class Config:
        orm_mode = True

# Schema for Salary
class SalaryBase(BaseModel):
    teacher_id: uuid.UUID
    month: str # YYYY-MM
    basic_salary: float
    allowances: float
    deductions: float
    net_salary: float
    payment_date: Optional[date] = None
    payment_mode: Optional[str] = None

class SalaryCreate(SalaryBase):
    school_id: uuid.UUID

class Salary(SalaryBase):
    id: uuid.UUID
    school_id: uuid.UUID

    class Config:
        orm_mode = True

# Schema for StudentFeeStructure
class StudentFeeStructureBase(BaseModel):
    student_id: uuid.UUID
    class_fee_id: uuid.UUID
    academic_year: str
    total_amount: float
    discount_amount: float = 0
    final_amount: float
    outstanding_amount: float

class StudentFeeStructureCreate(StudentFeeStructureBase):
    pass

class StudentFeeStructure(StudentFeeStructureBase):
    id: uuid.UUID
    amount_paid: float

    class Config:
        orm_mode = True

# Schema for FeeInstallment
class FeeInstallmentBase(BaseModel):
    student_fee_structure_id: uuid.UUID
    installment_number: int
    due_date: date
    amount: float

class FeeInstallmentCreate(FeeInstallmentBase):
    pass

class FeeInstallment(FeeInstallmentBase):
    id: uuid.UUID
    paid_amount: float
    status: str

    class Config:
        orm_mode = True

# Schema for PaymentDetail
class PaymentDetailBase(BaseModel):
    fee_id: uuid.UUID
    student_fee_structure_id: Optional[uuid.UUID] = None
    amount: float

class PaymentDetailCreate(PaymentDetailBase):
    pass

class PaymentDetail(PaymentDetailBase):
    id: uuid.UUID
    payment_id: uuid.UUID

    class Config:
        orm_mode = True

# Enhanced Payment Schema with details
class PaymentWithDetails(Payment):
    payment_details: List[PaymentDetail] = []

    class Config:
        orm_mode = True

# Schema for creating payment with allocation
class PaymentCreateWithDetails(BaseModel):
    student_id: uuid.UUID
    fund_id: uuid.UUID
    payment_date: date
    amount_paid: float
    payment_mode: str
    transaction_id: Optional[str] = None
    remarks: Optional[str] = None
    school_id: uuid.UUID
    payment_details: List[PaymentDetailCreate]

# Alias for consistency
PaymentCreateWithAllocations = PaymentCreateWithDetails

# Lookup schemas
class StudentLookup(BaseModel):
    id: str
    admission_number: str
    full_name: str
    class_name: str
    academic_year: Optional[str] = None
    outstanding_balance: float

class TeacherLookup(BaseModel):
    id: str
    employee_id: str
    full_name: str
    department: str

# Student fee assignment
class StudentFeeAssignment(BaseModel):
    academic_year: str
    create_installments: bool = False
    installment_type: Optional[str] = None

# Student ledger
class StudentLedger(BaseModel):
    student_id: str
    student_name: str
    admission_number: str
    class_name: str
    academic_year: str
    total_expected: float
    total_paid: float
    total_outstanding: float
    fee_structures: List[dict]
    payments: List[dict]
    previous_year_arrears: List[dict] = []
    total_arrears: float = 0

# Student outstanding
class StudentOutstanding(BaseModel):
    student_id: str
    total_outstanding: float
    by_fee: List[dict]
    has_overdue: bool
    overdue_count: int

# ClassFee update
class ClassFeeUpdate(BaseModel):
    amount: Optional[float] = None
    installment_type: Optional[InstallmentType] = None
    fee_applicability: Optional[FeeApplicability] = None
    academic_year: Optional[str] = None

# Bulk operations
class BulkClassFeeCreate(BaseModel):
    class_fees: List[ClassFeeCreate]

class BulkPaymentRecord(BaseModel):
    student_id: uuid.UUID
    fund_id: uuid.UUID
    amount_paid: float
    payment_mode: str
    payment_date: date
    transaction_id: Optional[str] = None
    remarks: Optional[str] = None
    auto_allocate: bool = True

class BulkPaymentCreate(BaseModel):
    school_id: uuid.UUID
    payments: List[BulkPaymentRecord]

class BulkConcessionCreate(BaseModel):
    fee_id: uuid.UUID
    discount_amount: Optional[float] = None
    discount_percentage: Optional[float] = None
    reason: str
    academic_year: str
    school_id: uuid.UUID
    student_ids: Optional[List[str]] = None
    class_ids: Optional[List[uuid.UUID]] = None

# Bulk class fee assignment to all students in a class
class BulkClassFeeAssignment(BaseModel):
    academic_year: str
    create_installments: bool = False
    installment_type: Optional[str] = None
