from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload
from typing import List
import uuid
from decimal import Decimal
from app.core.database import get_db
from app.schemas.finance_schema import Fund, FundCreate, FundUpdate, Fee, FeeCreate, FeeUpdate, ClassFee, ClassFeeCreate, Payment, PaymentCreate, Concession, ConcessionCreate, Salary, SalaryCreate
from app.models.finance import Fund as FundModel, Fee as FeeModel, ClassFee as ClassFeeModel, Payment as PaymentModel, Concession as ConcessionModel, Salary as SalaryModel, StudentFeeStructure as StudentFeeStructureModel
from app.models.transport import StudentRouteFeeStructure as StudentRouteFeeStructureModel
from app.models.hostel import StudentHostelFeeStructure as StudentHostelFeeStructureModel
from app.api.deps import get_current_user_school, get_current_user
from app.models.user import User
from app.core.utils import tenant_aware_query
from app.core.permissions import is_admin, is_admin_or_superadmin, is_admin_or_teacher
from app.services.payment_allocation_service import PaymentAllocationService

router = APIRouter()

# --- Fund Management Endpoints ---

@router.get("/funds", response_model=List[Fund], dependencies=[Depends(is_admin_or_superadmin)])
def read_funds(db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    """Retrieve all funds for the user's school."""
    return tenant_aware_query(db, FundModel, school_id).all()

@router.post("/funds", response_model=Fund, dependencies=[Depends(is_admin_or_superadmin)])
def create_fund(fund: FundCreate, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    """Create a new fund for the user's school."""
    if school_id and fund.school_id != school_id:
        raise HTTPException(status_code=403, detail="Cannot create fund for another school")
    db_fund = FundModel(**fund.model_dump(), current_receipt_number=fund.receipt_number_start)
    db.add(db_fund)
    db.commit()
    db.refresh(db_fund)
    return db_fund
@router.put("/funds/{fund_id}", response_model=Fund, dependencies=[Depends(is_admin)])
def update_fund(fund_id: uuid.UUID, fund: FundUpdate, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    """Update an existing fund."""
    db_fund = tenant_aware_query(db, FundModel, school_id).filter(FundModel.id == fund_id).first()
    if not db_fund:
        raise HTTPException(status_code=404, detail="Fund not found")

    update_data = fund.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_fund, key, value)

    db.commit()
    db.refresh(db_fund)
    return db_fund

@router.delete("/funds/{fund_id}", status_code=204, dependencies=[Depends(is_admin)])
def delete_fund(fund_id: uuid.UUID, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    """Delete a fund. Raises 400 if payments are linked to it."""
    db_fund = tenant_aware_query(db, FundModel, school_id).filter(FundModel.id == fund_id).first()
    if not db_fund:
        raise HTTPException(status_code=404, detail="Fund not found")
    from app.models.finance import Payment as PaymentModel
    linked_payments = db.query(PaymentModel).filter(PaymentModel.fund_id == fund_id).count()
    if linked_payments > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete fund: {linked_payments} payment(s) are linked to it")
    db.delete(db_fund)
    db.commit()

# --- Fee Management Endpoints ---

@router.get("/fees", response_model=List[Fee], dependencies=[Depends(is_admin_or_superadmin)])
def read_fees(db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    """Retrieve all fee types for the user's school."""
    return tenant_aware_query(db, FeeModel, school_id).all()

@router.post("/fees", response_model=Fee, dependencies=[Depends(is_admin)])
def create_fee(fee: FeeCreate, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    """Create a new fee type."""
    if fee.school_id != school_id:
        raise HTTPException(status_code=403, detail="Cannot create fee for another school")
    db_fee = FeeModel(**fee.model_dump())
    db.add(db_fee)
    db.commit()
    db.refresh(db_fee)
    return db_fee

@router.put("/fees/{fee_id}", response_model=Fee, dependencies=[Depends(is_admin)])
def update_fee(fee_id: uuid.UUID, fee: FeeUpdate, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    """Update an existing fee type."""
    db_fee = tenant_aware_query(db, FeeModel, school_id).filter(FeeModel.id == fee_id).first()
    if not db_fee:
        raise HTTPException(status_code=404, detail="Fee not found")
    
    update_data = fee.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_fee, key, value)
    
    db.commit()
    db.refresh(db_fee)
    return db_fee

@router.delete("/fees/{fee_id}", status_code=204, dependencies=[Depends(is_admin)])
def delete_fee(fee_id: uuid.UUID, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    """Delete a fee type."""
    db_fee = tenant_aware_query(db, FeeModel, school_id).filter(FeeModel.id == fee_id).first()
    if not db_fee:
        raise HTTPException(status_code=404, detail="Fee not found")

    # Delete all class fees for this fee
    db.query(ClassFeeModel).filter(ClassFeeModel.fee_id == fee_id).delete()

    db.delete(db_fee)
    db.commit()
    return {"detail": "Fee deleted successfully"}

# --- ClassFee Management Endpoints ---

@router.get("/class-fees/{class_id}", response_model=List[ClassFee], dependencies=[Depends(is_admin_or_teacher)])
def read_class_fees(class_id: uuid.UUID, db: Session = Depends(get_db)):
    """Retrieve all fees for a specific class."""
    return db.query(ClassFeeModel).filter(ClassFeeModel.class_id == class_id).all()

@router.post("/class-fees", response_model=ClassFee, dependencies=[Depends(is_admin)])
def set_class_fee(class_fee: ClassFeeCreate, db: Session = Depends(get_db)):
    """Set a fee for a class."""
    db_class_fee = ClassFeeModel(**class_fee.model_dump())
    db.add(db_class_fee)
    db.commit()
    db.refresh(db_class_fee)
    return db_class_fee

# --- Payment Management Endpoints ---

@router.get("/payments", response_model=List[Payment], dependencies=[Depends(is_admin_or_superadmin)])
def read_payments(db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    """Retrieve all payments for the user's school."""
    return tenant_aware_query(db, PaymentModel, school_id).all()

@router.post("/payments", response_model=Payment, dependencies=[Depends(is_admin)])
def create_payment(payment: PaymentCreate, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school), current_user: User = Depends(get_current_user)):
    """Record a new payment with automatic allocation."""
    if payment.school_id != school_id:
        raise HTTPException(status_code=403, detail="Cannot create payment for another school")

    # Generate receipt number based on fund's prefix and sequence
    fund = db.query(FundModel).filter(FundModel.id == payment.fund_id).first()
    if not fund:
        raise HTTPException(status_code=404, detail="Fund not found")

    receipt_prefix = fund.receipt_series_prefix or "RCPT"
    receipt_number = f"{receipt_prefix}-{fund.current_receipt_number:06d}"
    fund.current_receipt_number += 1

    # Create payment record
    db_payment = PaymentModel(**payment.model_dump(), receipt_number=receipt_number, received_by_user_id=current_user.id)
    db.add(db_payment)
    db.flush()  # Get payment ID without committing

    # Auto-allocate to outstanding fee structures (class + transport + hostel)
    fee_structures = db.query(StudentFeeStructureModel).filter(
        StudentFeeStructureModel.student_id == payment.student_id,
        StudentFeeStructureModel.outstanding_amount > 0
    ).options(
        selectinload(StudentFeeStructureModel.class_fee)
    ).order_by(StudentFeeStructureModel.academic_year).all()

    transport_fee_structures = db.query(StudentRouteFeeStructureModel).filter(
        StudentRouteFeeStructureModel.student_id == payment.student_id,
        StudentRouteFeeStructureModel.outstanding_amount > 0
    ).order_by(StudentRouteFeeStructureModel.academic_year).all()

    hostel_fee_structures = db.query(StudentHostelFeeStructureModel).filter(
        StudentHostelFeeStructureModel.student_id == payment.student_id,
        StudentHostelFeeStructureModel.outstanding_amount > 0
    ).order_by(StudentHostelFeeStructureModel.academic_year).all()

    all_structures = (
        [('class', fs) for fs in fee_structures] +
        [('transport', tfs) for tfs in transport_fee_structures] +
        [('hostel', hfs) for hfs in hostel_fee_structures]
    )

    if not all_structures:
        raise HTTPException(
            status_code=400,
            detail="No outstanding fees found for this student. Please assign fees first."
        )

    # Build allocations automatically
    remaining_amount = Decimal(str(payment.amount_paid))
    allocations = []

    for fee_type, fee_structure in all_structures:
        if remaining_amount <= 0:
            break

        allocation_amount = min(remaining_amount, fee_structure.outstanding_amount)
        if fee_type == 'class':
            allocations.append({
                'fee_id': fee_structure.class_fee.fee_id,
                'student_fee_structure_id': fee_structure.id,
                'amount': allocation_amount
            })
        else:
            # transport and hostel: no fee_id, use student_fee_structure_id
            allocations.append({
                'fee_id': None,
                'student_fee_structure_id': fee_structure.id,
                'amount': allocation_amount,
                'fee_type': fee_type
            })
        remaining_amount -= allocation_amount

    if remaining_amount > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Payment amount (₹{payment.amount_paid}) exceeds total outstanding (₹{payment.amount_paid - remaining_amount})"
        )

    # Allocate payment using the service
    PaymentAllocationService.allocate_payment(db, db_payment, allocations)

    db.commit()
    db.refresh(db_payment)
    return db_payment

@router.get("/payments/{payment_id}", response_model=Payment, dependencies=[Depends(is_admin_or_superadmin)])
def read_payment(payment_id: uuid.UUID, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    """Retrieve a single payment."""
    payment = tenant_aware_query(db, PaymentModel, school_id).filter(PaymentModel.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return payment

@router.delete("/payments/{payment_id}", status_code=204, dependencies=[Depends(is_admin)])
def delete_payment(payment_id: uuid.UUID, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    """Delete a payment record."""
    db_payment = tenant_aware_query(db, PaymentModel, school_id).filter(PaymentModel.id == payment_id).first()
    if not db_payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    db.delete(db_payment)
    db.commit()
    return {"detail": "Payment deleted successfully"}

# --- Concession Management Endpoints ---

@router.get("/concessions", response_model=List[Concession], dependencies=[Depends(is_admin_or_superadmin)])
def read_concessions(db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    """Retrieve all concessions for the user's school."""
    return tenant_aware_query(db, ConcessionModel, school_id).all()

@router.post("/concessions", response_model=Concession, dependencies=[Depends(is_admin)])
def create_concession(concession: ConcessionCreate, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school), current_user: User = Depends(get_current_user)):
    """Create a new concession for a student and apply discount to fee structures."""
    if concession.school_id != school_id:
        raise HTTPException(status_code=403, detail="Cannot create concession for another school")

    # Create concession record
    db_concession = ConcessionModel(**concession.model_dump(), approved_by_user_id=current_user.id)
    db.add(db_concession)
    db.flush()  # Get concession ID without committing

    # Find matching student fee structures to apply the discount
    fee_structures = db.query(StudentFeeStructureModel).join(
        ClassFeeModel, StudentFeeStructureModel.class_fee_id == ClassFeeModel.id
    ).filter(
        StudentFeeStructureModel.student_id == concession.student_id,
        StudentFeeStructureModel.academic_year == concession.academic_year,
        ClassFeeModel.fee_id == concession.fee_id
    ).all()

    if not fee_structures:
        raise HTTPException(
            status_code=404,
            detail=f"No fee structures found for this student, fee, and academic year. Please assign fees first."
        )

    # Apply discount to each matching fee structure
    for fee_structure in fee_structures:
        # Calculate discount amount
        if concession.discount_amount:
            discount = Decimal(str(concession.discount_amount))
        elif concession.discount_percentage:
            discount = fee_structure.total_amount * Decimal(str(concession.discount_percentage)) / Decimal('100')
        else:
            discount = Decimal('0')

        # Update fee structure
        old_discount = fee_structure.discount_amount
        fee_structure.discount_amount += discount
        fee_structure.final_amount = fee_structure.total_amount - fee_structure.discount_amount

        # Recalculate outstanding (outstanding should decrease by the new discount)
        fee_structure.outstanding_amount = fee_structure.final_amount - fee_structure.amount_paid

        # Ensure outstanding doesn't go negative
        if fee_structure.outstanding_amount < 0:
            fee_structure.outstanding_amount = Decimal('0')

    db.commit()
    db.refresh(db_concession)
    return db_concession

@router.get("/concessions/{concession_id}", response_model=Concession, dependencies=[Depends(is_admin_or_superadmin)])
def read_concession(concession_id: uuid.UUID, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    """Retrieve a single concession."""
    concession = tenant_aware_query(db, ConcessionModel, school_id).filter(ConcessionModel.id == concession_id).first()
    if not concession:
        raise HTTPException(status_code=404, detail="Concession not found")
    return concession

@router.delete("/concessions/{concession_id}", status_code=204, dependencies=[Depends(is_admin)])
def delete_concession(concession_id: uuid.UUID, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    """Delete a concession record."""
    db_concession = tenant_aware_query(db, ConcessionModel, school_id).filter(ConcessionModel.id == concession_id).first()
    if not db_concession:
        raise HTTPException(status_code=404, detail="Concession not found")
    db.delete(db_concession)
    db.commit()
    return {"detail": "Concession deleted successfully"}

# --- Salary Management Endpoints ---

@router.get("/salaries", response_model=List[Salary], dependencies=[Depends(is_admin_or_superadmin)])
def read_salaries(db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    """Retrieve all salary records for the user's school."""
    return tenant_aware_query(db, SalaryModel, school_id).all()

@router.post("/salaries", response_model=Salary, dependencies=[Depends(is_admin)])
def create_salary(salary: SalaryCreate, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    """Create a new salary record."""
    if salary.school_id != school_id:
        raise HTTPException(status_code=403, detail="Cannot create salary for another school")
    db_salary = SalaryModel(**salary.model_dump())
    db.add(db_salary)
    db.commit()
    db.refresh(db_salary)
    return db_salary

@router.get("/salaries/{salary_id}", response_model=Salary, dependencies=[Depends(is_admin_or_superadmin)])
def read_salary(salary_id: uuid.UUID, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    """Retrieve a single salary record."""
    salary = tenant_aware_query(db, SalaryModel, school_id).filter(SalaryModel.id == salary_id).first()
    if not salary:
        raise HTTPException(status_code=404, detail="Salary record not found")
    return salary

@router.delete("/salaries/{salary_id}", status_code=204, dependencies=[Depends(is_admin)])
def delete_salary(salary_id: uuid.UUID, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    """Delete a salary record."""
    db_salary = tenant_aware_query(db, SalaryModel, school_id).filter(SalaryModel.id == salary_id).first()
    if not db_salary:
        raise HTTPException(status_code=404, detail="Salary record not found")
    db.delete(db_salary)
    db.commit()
    return {"detail": "Salary record deleted successfully"}
