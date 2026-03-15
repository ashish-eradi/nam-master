import uuid
from sqlalchemy import Column, String, ForeignKey, DECIMAL, Date, Text, Integer, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

class Fund(Base):
    __tablename__ = "funds"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    short_name = Column(String(20))
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.id"), nullable=False)
    receipt_series_prefix = Column(String(10))
    receipt_number_start = Column(Integer, default=1)
    current_receipt_number = Column(Integer, default=1)
    installment_type = Column(String(20))  # monthly, quarterly, half_yearly, yearly
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    school = relationship("School", back_populates="funds")
    fees = relationship("Fee", back_populates="fund")
    payments = relationship("Payment", back_populates="fund")
    route_fees = relationship("RouteFee", back_populates="fund")

class Fee(Base):
    __tablename__ = "fees"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    fee_name = Column(String(100), nullable=False)
    fee_short_name = Column(String(20))
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.id"), nullable=False)
    fund_id = Column(UUID(as_uuid=True), ForeignKey("funds.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    school = relationship("School", back_populates="fees")
    fund = relationship("Fund", back_populates="fees")
    class_fees = relationship("ClassFee", back_populates="fee")
    concessions = relationship("Concession", back_populates="fee")

class ClassFee(Base):
    __tablename__ = "class_fees"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    fee_id = Column(UUID(as_uuid=True), ForeignKey("fees.id", ondelete="CASCADE"), nullable=False)
    class_id = Column(UUID(as_uuid=True), ForeignKey("classes.id"), nullable=False)
    amount = Column(DECIMAL(10, 2), nullable=False)
    installment_type = Column(String(20), nullable=False, server_default='Annually')
    fee_applicability = Column(String(20), nullable=False, server_default='All')
    academic_year = Column(String(10))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    fee = relationship("Fee", back_populates="class_fees")
    class_ = relationship("Class", back_populates="class_fees")
    student_fee_structures = relationship("StudentFeeStructure", back_populates="class_fee")

class StudentFeeStructure(Base):
    __tablename__ = "student_fee_structures"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False)
    class_fee_id = Column(UUID(as_uuid=True), ForeignKey("class_fees.id"), nullable=False)
    academic_year = Column(String(10), nullable=False)
    total_amount = Column(DECIMAL(10, 2), nullable=False)
    discount_amount = Column(DECIMAL(10, 2), default=0)
    final_amount = Column(DECIMAL(10, 2), nullable=False)
    amount_paid = Column(DECIMAL(10, 2), default=0)
    outstanding_amount = Column(DECIMAL(10, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    student = relationship("Student", back_populates="fee_structures")
    class_fee = relationship("ClassFee", back_populates="student_fee_structures")

class FeeInstallment(Base):
    __tablename__ = "fee_installments"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_fee_structure_id = Column(UUID(as_uuid=True), ForeignKey("student_fee_structures.id"), nullable=False)
    installment_number = Column(Integer, nullable=False)
    due_date = Column(Date, nullable=False)
    amount = Column(DECIMAL(10, 2), nullable=False)
    paid_amount = Column(DECIMAL(10, 2), default=0)
    status = Column(String(20), default="pending")  # pending, paid, overdue, partial
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Payment(Base):
    __tablename__ = "payments"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    receipt_number = Column(String(50), unique=True, nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False)
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.id"), nullable=False)
    fund_id = Column(UUID(as_uuid=True), ForeignKey("funds.id"))
    payment_date = Column(Date, nullable=False)
    amount_paid = Column(DECIMAL(10, 2), nullable=False)
    payment_mode = Column(String(20))
    transaction_id = Column(String(100))
    remarks = Column(Text)
    received_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    student = relationship("Student", back_populates="payments")
    school = relationship("School", back_populates="payments")
    fund = relationship("Fund", back_populates="payments")
    received_by = relationship("User", back_populates="received_payments")
    payment_details = relationship("PaymentDetail", back_populates="payment", cascade="all, delete-orphan")

class PaymentDetail(Base):
    __tablename__ = "payment_details"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    payment_id = Column(UUID(as_uuid=True), ForeignKey("payments.id", ondelete="CASCADE"), nullable=False)
    fee_id = Column(UUID(as_uuid=True), ForeignKey("fees.id"), nullable=False)
    student_fee_structure_id = Column(UUID(as_uuid=True), ForeignKey("student_fee_structures.id"))
    amount = Column(DECIMAL(10, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    payment = relationship("Payment", back_populates="payment_details")
    fee = relationship("Fee")

class Concession(Base):
    __tablename__ = "concessions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False)
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.id"), nullable=False)
    fee_id = Column(UUID(as_uuid=True), ForeignKey("fees.id"), nullable=False)
    discount_amount = Column(DECIMAL(10, 2))
    discount_percentage = Column(DECIMAL(5, 2))
    reason = Column(Text)
    approved_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    academic_year = Column(String(10))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    student = relationship("Student", back_populates="concessions")
    fee = relationship("Fee", back_populates="concessions")
    approved_by = relationship("User", back_populates="approved_concessions")
    school = relationship("School", back_populates="concessions")

class Salary(Base):
    __tablename__ = "salaries"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    teacher_id = Column(UUID(as_uuid=True), ForeignKey("teachers.id"))
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.id"), nullable=False)
    month = Column(String(7))
    basic_salary = Column(DECIMAL(10, 2))
    allowances = Column(DECIMAL(10, 2))
    deductions = Column(DECIMAL(10, 2))
    net_salary = Column(DECIMAL(10, 2))
    payment_date = Column(Date)
    payment_mode = Column(String(20))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    teacher = relationship("Teacher", back_populates="salaries")
    school = relationship("School", back_populates="salaries")
