from pydantic import BaseModel
from typing import List, Optional
from datetime import date

# Collection Summary Report
class CollectionSummaryItem(BaseModel):
    fund_name: str
    expected_amount: float
    collected_amount: float
    outstanding_amount: float
    collection_percentage: float

class CollectionSummary(BaseModel):
    academic_year: str
    start_date: date
    end_date: date
    total_expected: float
    total_collected: float
    total_outstanding: float
    overall_percentage: float
    by_fund: List[CollectionSummaryItem]

# Defaulters Report
class DefaulterStudent(BaseModel):
    student_id: str
    admission_number: str
    student_name: str
    class_name: str
    total_fees: float = 0
    total_paid: float = 0
    total_outstanding: float
    overdue_installments: int
    oldest_due_date: Optional[date] = None
    contact_phone: Optional[str] = None
    parent_phone: Optional[str] = None

class DefaultersReport(BaseModel):
    academic_year: str
    as_of_date: date
    total_defaulters: int
    total_outstanding: float
    students: List[DefaulterStudent]

# Fund-wise Collection Report
class FundCollectionDetail(BaseModel):
    payment_date: date
    receipt_number: str
    student_name: str
    admission_number: str
    amount: float
    payment_mode: str

class FundWiseCollection(BaseModel):
    fund_id: str
    fund_name: str
    start_date: date
    end_date: date
    total_collected: float
    payment_count: int
    by_mode: dict  # {"cash": 5000, "online": 3000, ...}
    payments: List[FundCollectionDetail]

# Class-wise Collection Report
class ClassCollectionSummary(BaseModel):
    class_id: str
    class_name: str
    total_students: int
    expected_amount: float
    collected_amount: float
    outstanding_amount: float
    collection_percentage: float
    students_with_dues: int

class ClassWiseCollection(BaseModel):
    academic_year: str
    start_date: date
    end_date: date
    classes: List[ClassCollectionSummary]

# Daily Collection Report
class DailyCollectionItem(BaseModel):
    fund_name: str
    amount: float
    payment_count: int

class DailyCollection(BaseModel):
    date: date
    total_amount: float
    total_payments: int
    by_fund: List[DailyCollectionItem]
    by_mode: dict

# Monthly Collection Report
class MonthlyCollectionItem(BaseModel):
    month: str  # YYYY-MM
    total_collected: float
    payment_count: int
    by_fund: dict

class MonthlyCollection(BaseModel):
    academic_year: str
    start_month: str
    end_month: str
    months: List[MonthlyCollectionItem]
    total_collected: float

# Installment Status Report
class InstallmentStatusSummary(BaseModel):
    academic_year: str
    total_installments: int
    paid_count: int
    partially_paid_count: int
    pending_count: int
    overdue_count: int
    total_expected: float
    total_collected: float
    total_outstanding: float

# Daily Expenditure Report
class DailyExpenditureItem(BaseModel):
    teacher_name: str
    employee_id: Optional[str] = None
    amount: float
    payment_mode: str
    month: str

class DailyExpenditure(BaseModel):
    date: date
    total_amount: float
    total_payments: int
    salaries: List[DailyExpenditureItem]
    by_mode: dict
