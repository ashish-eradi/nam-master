"""
Extended Finance API Endpoints

New endpoints for student fee ledger, lookups, bulk operations, and enhanced functionality.
This file extends the base finance.py with advanced features.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import or_, func
from typing import List, Optional
from decimal import Decimal
from datetime import date, datetime
import uuid

from app.core.database import get_db
from app.api.deps import get_current_user_school, get_current_user
from app.models.user import User
from app.models.student import Student as StudentModel
from app.models.teacher import Teacher as TeacherModel
from app.models.enums import StudentStatus
from app.core.utils import tenant_aware_query
from app.core.permissions import is_admin, is_admin_or_superadmin, is_admin_or_teacher

from app.models.finance import (
    ClassFee as ClassFeeModel,
    StudentFeeStructure as StudentFeeStructureModel,
    Payment as PaymentModel,
    PaymentDetail as PaymentDetailModel,
    Concession as ConcessionModel
)

from app.models.transport import (
    StudentRouteFeeStructure as StudentRouteFeeStructureModel,
    RouteFee as RouteFeeModel,
    Route as RouteModel
)
from app.models.hostel import (
    StudentHostelFeeStructure as StudentHostelFeeStructureModel,
    HostelFee as HostelFeeModel,
    Hostel as HostelModel
)
from app.models.miscellaneous import (
    StudentMiscellaneousFeeStructure as StudentMiscellaneousFeeStructureModel,
    MiscellaneousFee as MiscellaneousFeeModel,
    MiscellaneousFeeCategory as MiscellaneousFeeCategoryModel
)

from app.schemas.finance_schema import (
    StudentLookup,
    TeacherLookup,
    StudentFeeAssignment,
    StudentLedger,
    StudentOutstanding,
    PaymentCreateWithAllocations,
    PaymentWithDetails,
    PaymentUpdate,
    ClassFeeCreate,
    ClassFeeUpdate,
    BulkClassFeeCreate,
    BulkPaymentCreate,
    BulkConcessionCreate,
    BulkClassFeeAssignment
)

from app.services.receipt_service import ReceiptNumberService
from app.services.payment_allocation_service import PaymentAllocationService
from app.services.installment_service import InstallmentService
from app.services.pdf_service import PDFReceiptService

router = APIRouter()


# --- Lookup Endpoints ---

@router.get("/lookup/students", dependencies=[Depends(is_admin)])
def lookup_students(
    q: str = Query(..., min_length=2),
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """
    Search students for payment/fee operations.
    Returns student with outstanding balance and parent contact information for quick reference.
    """
    from app.models.parent import Parent as ParentModel, ParentStudentRelation as ParentStudentRelationModel

    students = db.query(StudentModel).filter(
        StudentModel.school_id == school_id,
        or_(
            StudentModel.admission_number.ilike(f"%{q}%"),
            StudentModel.first_name.ilike(f"%{q}%"),
            StudentModel.last_name.ilike(f"%{q}%")
        )
    ).options(selectinload(StudentModel.class_)).limit(20).all()

    results = []
    for student in students:
        # Calculate outstanding balance (class + transport + hostel fees)
        class_outstanding = db.query(func.sum(StudentFeeStructureModel.outstanding_amount)).filter(
            StudentFeeStructureModel.student_id == student.id
        ).scalar() or 0
        transport_outstanding = db.query(func.sum(StudentRouteFeeStructureModel.outstanding_amount)).filter(
            StudentRouteFeeStructureModel.student_id == student.id
        ).scalar() or 0
        hostel_outstanding = db.query(func.sum(StudentHostelFeeStructureModel.outstanding_amount)).filter(
            StudentHostelFeeStructureModel.student_id == student.id
        ).scalar() or 0
        misc_outstanding = db.query(func.sum(StudentMiscellaneousFeeStructureModel.outstanding_amount)).filter(
            StudentMiscellaneousFeeStructureModel.student_id == student.id
        ).scalar() or 0
        total_outstanding = class_outstanding + transport_outstanding + hostel_outstanding + misc_outstanding

        # Get parent information
        parent_relation = db.query(ParentStudentRelationModel).join(
            ParentModel, ParentStudentRelationModel.parent_id == ParentModel.id
        ).filter(
            ParentStudentRelationModel.student_id == student.id
        ).first()

        parent_info = {}
        if parent_relation and parent_relation.parent:
            parent = parent_relation.parent
            parent_info = {
                "father_name": parent.father_name,
                "father_phone": parent.father_phone,
                "mother_name": parent.mother_name,
                "mother_phone": parent.mother_phone,
                "address": parent.address
            }

        result_dict = {
            "id": str(student.id),
            "admission_number": student.admission_number,
            "full_name": f"{student.first_name} {student.last_name}",
            "first_name": student.first_name,
            "last_name": student.last_name,
            "class_name": student.class_.name if student.class_ else "N/A",
            "class_id": str(student.class_id) if student.class_id else None,
            "academic_year": student.academic_year,
            "outstanding_balance": float(total_outstanding),
            "parent_info": parent_info
        }
        results.append(result_dict)

    return results


@router.get("/lookup/teachers", response_model=List[TeacherLookup], dependencies=[Depends(is_admin)])
def lookup_teachers(
    q: str = Query(..., min_length=2),
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Search teachers for salary processing."""
    teachers = db.query(TeacherModel).join(User).filter(
        TeacherModel.school_id == school_id,
        or_(
            TeacherModel.employee_id.ilike(f"%{q}%"),
            User.full_name.ilike(f"%{q}%")
        )
    ).options(selectinload(TeacherModel.user)).limit(20).all()

    return [
        TeacherLookup(
            id=str(teacher.id),
            employee_id=teacher.employee_id,
            full_name=teacher.user.full_name if teacher.user else "Unknown",
            department=teacher.department or "N/A"
        )
        for teacher in teachers
    ]


# --- Student Fee Ledger Endpoints ---

@router.post("/students/{student_id}/assign-fees", dependencies=[Depends(is_admin)])
def assign_fees_to_student(
    student_id: uuid.UUID,
    assignment: StudentFeeAssignment,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """
    Assign class fees to a student for an academic year.
    Creates StudentFeeStructure records and optionally installments.
    """
    # Verify student belongs to school
    student = db.query(StudentModel).filter(
        StudentModel.id == student_id,
        StudentModel.school_id == school_id
    ).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if not student.class_id:
        raise HTTPException(status_code=400, detail="Student not assigned to a class")

    # Get all class fees for the student's class
    class_fees = db.query(ClassFeeModel).filter(
        ClassFeeModel.class_id == student.class_id,
        ClassFeeModel.academic_year == assignment.academic_year
    ).all()

    if not class_fees:
        raise HTTPException(
            status_code=404,
            detail=f"No fees defined for class {student.class_.name} in {assignment.academic_year}"
        )

    # Check if fees already assigned
    existing = db.query(StudentFeeStructureModel).filter(
        StudentFeeStructureModel.student_id == student_id,
        StudentFeeStructureModel.academic_year == assignment.academic_year
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Fees already assigned for {assignment.academic_year}"
        )

    # Get applicable concessions
    concessions = db.query(ConcessionModel).filter(
        ConcessionModel.student_id == student_id,
        ConcessionModel.academic_year == assignment.academic_year
    ).all()

    concession_map = {str(c.fee_id): c for c in concessions}

    created_structures = []

    for class_fee in class_fees:
        # Calculate discount
        concession = concession_map.get(str(class_fee.fee_id))
        discount_amount = Decimal('0')

        if concession:
            if concession.discount_amount:
                discount_amount = Decimal(str(concession.discount_amount))
            elif concession.discount_percentage:
                discount_amount = (Decimal(str(class_fee.amount)) *
                                 Decimal(str(concession.discount_percentage)) / 100)

        final_amount = Decimal(str(class_fee.amount)) - discount_amount

        # Create fee structure
        fee_structure = StudentFeeStructureModel(
            id=uuid.uuid4(),
            student_id=student_id,
            class_fee_id=class_fee.id,
            academic_year=assignment.academic_year,
            total_amount=Decimal(str(class_fee.amount)),
            discount_amount=discount_amount,
            final_amount=final_amount,
            amount_paid=Decimal('0'),
            outstanding_amount=final_amount
        )

        db.add(fee_structure)
        created_structures.append(fee_structure)

        # Create installments if requested
        if assignment.create_installments and assignment.installment_type:
            InstallmentService.create_installments(
                db=db,
                student_fee_structure_id=fee_structure.id,
                installment_type=assignment.installment_type,
                start_date=date.today(),
                total_amount=final_amount
            )

    db.commit()

    return {
        "message": f"Successfully assigned {len(created_structures)} fees to student",
        "academic_year": assignment.academic_year,
        "total_amount": sum(fs.final_amount for fs in created_structures),
        "fee_structures_created": len(created_structures)
    }


@router.post("/classes/{class_id}/assign-fees-bulk", dependencies=[Depends(is_admin)])
def bulk_assign_fees_to_class(
    class_id: uuid.UUID,
    assignment: BulkClassFeeAssignment,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """
    Bulk assign class fees to all students in a class for an academic year.
    Respects fee_applicability field (All/Hostellers/Day Scholars).
    Creates StudentFeeStructure records and optionally installments.
    """
    from app.models.class_model import Class as ClassModel

    # Verify class belongs to school
    class_obj = db.query(ClassModel).filter(
        ClassModel.id == class_id,
        ClassModel.school_id == school_id
    ).first()

    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")

    # Get all class fees for this class and academic year
    class_fees = db.query(ClassFeeModel).filter(
        ClassFeeModel.class_id == class_id,
        ClassFeeModel.academic_year == assignment.academic_year
    ).all()

    if not class_fees:
        raise HTTPException(
            status_code=404,
            detail=f"No fees defined for class {class_obj.name} in {assignment.academic_year}"
        )

    # Get all students in this class
    students = db.query(StudentModel).filter(
        StudentModel.class_id == class_id,
        StudentModel.school_id == school_id,
        StudentModel.status == StudentStatus.ACTIVE
    ).all()

    if not students:
        raise HTTPException(
            status_code=404,
            detail=f"No active students found in class {class_obj.name}"
        )

    total_students_processed = 0
    total_fee_structures_created = 0
    skipped_students = []

    # Process each student
    for student in students:
        student_fee_structures_created = []

        # Process each class fee
        for class_fee in class_fees:
            # Check if this specific fee is already assigned to this student
            existing_fee = db.query(StudentFeeStructureModel).filter(
                StudentFeeStructureModel.student_id == student.id,
                StudentFeeStructureModel.class_fee_id == class_fee.id,
                StudentFeeStructureModel.academic_year == assignment.academic_year
            ).first()

            if existing_fee:
                # Skip this specific fee as it's already assigned
                continue
            # Check fee applicability
            fee_applicability = class_fee.fee_applicability or "All"

            # Determine if this fee applies to this student
            applies_to_student = False

            if fee_applicability == "All":
                applies_to_student = True
            elif fee_applicability == "Hostellers":
                # Check if student is a hosteller
                applies_to_student = getattr(student, 'is_hosteller', False)
            elif fee_applicability == "Day Scholars":
                # Check if student is a day scholar (not hosteller)
                applies_to_student = not getattr(student, 'is_hosteller', False)

            if not applies_to_student:
                continue

            # Create student fee structure
            total_amount = class_fee.amount
            discount_amount = Decimal(0)

            # Check for applicable concessions
            concession = db.query(ConcessionModel).filter(
                ConcessionModel.student_id == student.id,
                ConcessionModel.fee_id == class_fee.fee_id,
                ConcessionModel.academic_year == assignment.academic_year
            ).first()

            if concession:
                if concession.discount_amount:
                    discount_amount = concession.discount_amount
                elif concession.discount_percentage:
                    discount_amount = total_amount * (concession.discount_percentage / 100)

            final_amount = total_amount - discount_amount

            fee_structure = StudentFeeStructureModel(
                student_id=student.id,
                class_fee_id=class_fee.id,
                academic_year=assignment.academic_year,
                total_amount=total_amount,
                discount_amount=discount_amount,
                final_amount=final_amount,
                amount_paid=Decimal(0),
                outstanding_amount=final_amount
            )

            db.add(fee_structure)
            db.flush()

            student_fee_structures_created.append(fee_structure)

        if student_fee_structures_created:
            total_students_processed += 1
            total_fee_structures_created += len(student_fee_structures_created)

    db.commit()

    return {
        "message": f"Successfully assigned fees to {total_students_processed} students in class {class_obj.name}",
        "class_name": class_obj.name,
        "academic_year": assignment.academic_year,
        "total_students_processed": total_students_processed,
        "total_fee_structures_created": total_fee_structures_created,
        "skipped_students": skipped_students
    }


@router.get("/students/{student_id}/ledger", response_model=StudentLedger, dependencies=[Depends(is_admin_or_teacher)])
def get_student_ledger(
    student_id: uuid.UUID,
    academic_year: Optional[str] = None,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Get complete financial ledger for a student."""
    student = db.query(StudentModel).filter(
        StudentModel.id == student_id,
        StudentModel.school_id == school_id
    ).options(
        selectinload(StudentModel.class_)
    ).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Get fee structures (regular class fees)
    query = db.query(StudentFeeStructureModel).filter(
        StudentFeeStructureModel.student_id == student_id
    ).options(
        selectinload(StudentFeeStructureModel.class_fee)
    )

    if academic_year:
        query = query.filter(StudentFeeStructureModel.academic_year == academic_year)

    fee_structures = query.all()

    # Get transport fee structures
    transport_query = db.query(StudentRouteFeeStructureModel).filter(
        StudentRouteFeeStructureModel.student_id == student_id
    ).options(
        selectinload(StudentRouteFeeStructureModel.route_fee).selectinload(RouteFeeModel.route)
    )

    if academic_year:
        transport_query = transport_query.filter(StudentRouteFeeStructureModel.academic_year == academic_year)

    transport_fee_structures = transport_query.all()

    # Get hostel fee structures
    hostel_query = db.query(StudentHostelFeeStructureModel).filter(
        StudentHostelFeeStructureModel.student_id == student_id
    ).options(
        selectinload(StudentHostelFeeStructureModel.hostel_fee).selectinload(HostelFeeModel.hostel)
    )
    if academic_year:
        hostel_query = hostel_query.filter(StudentHostelFeeStructureModel.academic_year == academic_year)
    hostel_fee_structures = hostel_query.all()

    # Get miscellaneous fee structures
    misc_query = db.query(StudentMiscellaneousFeeStructureModel).filter(
        StudentMiscellaneousFeeStructureModel.student_id == student_id
    ).options(
        selectinload(StudentMiscellaneousFeeStructureModel.miscellaneous_fee).selectinload(MiscellaneousFeeModel.category)
    )
    if academic_year:
        misc_query = misc_query.filter(StudentMiscellaneousFeeStructureModel.academic_year == academic_year)
    misc_fee_structures = misc_query.all()

    # Get payment history
    payments = db.query(PaymentModel).filter(
        PaymentModel.student_id == student_id
    ).options(
        selectinload(PaymentModel.payment_details),
        selectinload(PaymentModel.received_by),
    ).order_by(PaymentModel.payment_date.desc()).all()

    # Get edit history for all payments in one query
    from app.models.audit_log import AuditLog
    payment_ids = [str(p.id) for p in payments]
    audit_logs_map: dict = {}
    try:
        if payment_ids:
            logs = db.query(AuditLog, User).join(
                User, AuditLog.user_id == User.id, isouter=True
            ).filter(
                AuditLog.resource_type == "Payment",
                AuditLog.resource_id.in_(payment_ids)
            ).order_by(AuditLog.created_at.asc()).all()
            for log, editor in logs:
                pid = log.resource_id
                if pid not in audit_logs_map:
                    audit_logs_map[pid] = []
                audit_logs_map[pid].append({
                    "edited_at": log.created_at.isoformat(),
                    "edited_by": editor.full_name if editor else "Unknown",
                    "edit_reason": log.description or "",
                    "old_value": log.old_value,
                    "new_value": log.new_value,
                })
    except Exception:
        pass  # audit_logs table may not exist yet; edit history is non-critical

    # Calculate totals (including transport + hostel + miscellaneous fees)
    total_expected = (sum(fs.final_amount for fs in fee_structures) +
                      sum(tfs.final_amount for tfs in transport_fee_structures) +
                      sum(hfs.final_amount for hfs in hostel_fee_structures) +
                      sum(mfs.final_amount for mfs in misc_fee_structures))
    total_paid = (sum(fs.amount_paid for fs in fee_structures) +
                  sum(tfs.amount_paid for tfs in transport_fee_structures) +
                  sum(hfs.amount_paid for hfs in hostel_fee_structures) +
                  sum(mfs.amount_paid for mfs in misc_fee_structures))
    total_outstanding = (sum(fs.outstanding_amount for fs in fee_structures) +
                         sum(tfs.outstanding_amount for tfs in transport_fee_structures) +
                         sum(hfs.outstanding_amount for hfs in hostel_fee_structures) +
                         sum(mfs.outstanding_amount for mfs in misc_fee_structures))

    # Build fee structures list with regular fees
    all_fee_structures = [{
        "id": str(fs.id),
        "fee_name": fs.class_fee.fee.fee_name if fs.class_fee and fs.class_fee.fee else "Unknown",
        "total_amount": float(fs.total_amount),
        "discount_amount": float(fs.discount_amount),
        "final_amount": float(fs.final_amount),
        "amount_paid": float(fs.amount_paid),
        "outstanding_amount": float(fs.outstanding_amount)
    } for fs in fee_structures]

    # Add transport fees
    for tfs in transport_fee_structures:
        route_name = tfs.route_fee.route.route_name if tfs.route_fee and tfs.route_fee.route else "Unknown Route"
        all_fee_structures.append({
            "id": str(tfs.id),
            "fee_name": f"Transport Fee - {route_name}",
            "total_amount": float(tfs.total_amount),
            "discount_amount": float(tfs.discount_amount),
            "final_amount": float(tfs.final_amount),
            "amount_paid": float(tfs.amount_paid),
            "outstanding_amount": float(tfs.outstanding_amount)
        })

    # Add hostel fees
    for hfs in hostel_fee_structures:
        hostel_name = hfs.hostel_fee.hostel.name if hfs.hostel_fee and hfs.hostel_fee.hostel else "Unknown Hostel"
        all_fee_structures.append({
            "id": str(hfs.id),
            "fee_name": f"Hostel Fee - {hostel_name}",
            "total_amount": float(hfs.total_amount),
            "discount_amount": float(hfs.discount_amount),
            "final_amount": float(hfs.final_amount),
            "amount_paid": float(hfs.amount_paid),
            "outstanding_amount": float(hfs.outstanding_amount)
        })

    # Add miscellaneous fees
    for mfs in misc_fee_structures:
        category_name = mfs.miscellaneous_fee.category.name if mfs.miscellaneous_fee and mfs.miscellaneous_fee.category else "Miscellaneous"
        all_fee_structures.append({
            "id": str(mfs.id),
            "fee_name": f"Misc Fee - {category_name}",
            "total_amount": float(mfs.total_amount),
            "discount_amount": float(mfs.discount_amount),
            "final_amount": float(mfs.final_amount),
            "amount_paid": float(mfs.amount_paid),
            "outstanding_amount": float(mfs.outstanding_amount)
        })

    # Fetch previous-year arrears (outstanding fees from years OTHER than current)
    previous_year_arrears = []
    total_arrears = 0.0
    if academic_year:
        # School fee arrears
        arrear_fee_structs = db.query(StudentFeeStructureModel).filter(
            StudentFeeStructureModel.student_id == student_id,
            StudentFeeStructureModel.academic_year != academic_year,
            StudentFeeStructureModel.outstanding_amount > 0
        ).options(selectinload(StudentFeeStructureModel.class_fee)).all()
        for fs in arrear_fee_structs:
            fee_name = fs.class_fee.fee.fee_name if fs.class_fee and fs.class_fee.fee else "Unknown"
            amount = float(fs.outstanding_amount)
            total_arrears += amount
            previous_year_arrears.append({
                "academic_year": fs.academic_year,
                "fee_name": fee_name,
                "outstanding_amount": amount,
                "type": "school"
            })
        # Transport fee arrears
        arrear_transport = db.query(StudentRouteFeeStructureModel).filter(
            StudentRouteFeeStructureModel.student_id == student_id,
            StudentRouteFeeStructureModel.academic_year != academic_year,
            StudentRouteFeeStructureModel.outstanding_amount > 0
        ).options(selectinload(StudentRouteFeeStructureModel.route_fee).selectinload(RouteFeeModel.route)).all()
        for tfs in arrear_transport:
            route_name = tfs.route_fee.route.route_name if tfs.route_fee and tfs.route_fee.route else "Unknown Route"
            amount = float(tfs.outstanding_amount)
            total_arrears += amount
            previous_year_arrears.append({
                "academic_year": tfs.academic_year,
                "fee_name": f"Transport - {route_name}",
                "outstanding_amount": amount,
                "type": "transport"
            })

    return StudentLedger(
        student_id=str(student.id),
        student_name=f"{student.first_name} {student.last_name}",
        admission_number=student.admission_number,
        class_name=student.class_.name if student.class_ else "N/A",
        academic_year=academic_year or "All",
        total_expected=float(total_expected),
        total_paid=float(total_paid),
        total_outstanding=float(total_outstanding),
        fee_structures=all_fee_structures,
        payments=[{
            "payment_id": str(p.id),
            "id": str(p.id),
            "receipt_number": p.receipt_number,
            "payment_date": p.payment_date.isoformat(),
            "amount_paid": float(p.amount_paid),
            "payment_mode": p.payment_mode,
            "transaction_id": p.transaction_id,
            "remarks": p.remarks,
            "received_by_name": p.received_by.full_name if p.received_by else "Unknown",
            "recorded_at": p.created_at.isoformat() if p.created_at else None,
            "edit_history": audit_logs_map.get(str(p.id), []),
        } for p in payments],
        previous_year_arrears=previous_year_arrears,
        total_arrears=total_arrears,
    )


@router.get("/students/{student_id}/outstanding", response_model=StudentOutstanding, dependencies=[Depends(is_admin_or_teacher)])
def get_student_outstanding(
    student_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Get real-time outstanding dues for a student."""
    student = db.query(StudentModel).filter(
        StudentModel.id == student_id,
        StudentModel.school_id == school_id
    ).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Get outstanding by fee type (regular class fees)
    fee_structures = db.query(StudentFeeStructureModel).filter(
        StudentFeeStructureModel.student_id == student_id,
        StudentFeeStructureModel.outstanding_amount > 0
    ).options(
        selectinload(StudentFeeStructureModel.class_fee)
    ).all()

    # Get outstanding transport fees
    transport_fee_structures = db.query(StudentRouteFeeStructureModel).filter(
        StudentRouteFeeStructureModel.student_id == student_id,
        StudentRouteFeeStructureModel.outstanding_amount > 0
    ).options(
        selectinload(StudentRouteFeeStructureModel.route_fee).selectinload(RouteFeeModel.route)
    ).all()

    # Get outstanding hostel fees
    hostel_fee_structures = db.query(StudentHostelFeeStructureModel).filter(
        StudentHostelFeeStructureModel.student_id == student_id,
        StudentHostelFeeStructureModel.outstanding_amount > 0
    ).options(
        selectinload(StudentHostelFeeStructureModel.hostel_fee).selectinload(HostelFeeModel.hostel)
    ).all()

    # Get outstanding miscellaneous fees
    misc_fee_structures = db.query(StudentMiscellaneousFeeStructureModel).filter(
        StudentMiscellaneousFeeStructureModel.student_id == student_id,
        StudentMiscellaneousFeeStructureModel.outstanding_amount > 0
    ).options(
        selectinload(StudentMiscellaneousFeeStructureModel.miscellaneous_fee).selectinload(MiscellaneousFeeModel.category)
    ).all()

    # Calculate total outstanding (including transport + hostel + miscellaneous fees)
    total_outstanding = (
        sum(fs.outstanding_amount for fs in fee_structures) +
        sum(tfs.outstanding_amount for tfs in transport_fee_structures) +
        sum(hfs.outstanding_amount for hfs in hostel_fee_structures) +
        sum(mfs.outstanding_amount for mfs in misc_fee_structures)
    )

    # Build by_fee list with regular fees
    by_fee_list = [{
        "fee_id": str(fs.class_fee.fee_id) if fs.class_fee and fs.class_fee.fee_id else None,
        "fee_structure_id": str(fs.id),
        "fee_name": fs.class_fee.fee.fee_name if fs.class_fee and fs.class_fee.fee else "Unknown",
        "outstanding": float(fs.outstanding_amount)
    } for fs in fee_structures]

    # Add transport fees with clear labeling
    for tfs in transport_fee_structures:
        route_name = tfs.route_fee.route.route_name if tfs.route_fee and tfs.route_fee.route else "Unknown Route"
        by_fee_list.append({
            "fee_id": None,
            "fee_structure_id": str(tfs.id),
            "fee_name": f"Transport Fee - {route_name}",
            "outstanding": float(tfs.outstanding_amount)
        })

    # Add hostel fees
    for hfs in hostel_fee_structures:
        hostel_name = hfs.hostel_fee.hostel.name if hfs.hostel_fee and hfs.hostel_fee.hostel else "Unknown Hostel"
        by_fee_list.append({
            "fee_id": None,
            "fee_structure_id": str(hfs.id),
            "fee_name": f"Hostel Fee - {hostel_name}",
            "outstanding": float(hfs.outstanding_amount)
        })

    # Add miscellaneous fees
    for mfs in misc_fee_structures:
        category_name = mfs.miscellaneous_fee.category.name if mfs.miscellaneous_fee and mfs.miscellaneous_fee.category else "Miscellaneous"
        by_fee_list.append({
            "fee_id": None,
            "fee_structure_id": str(mfs.id),
            "fee_name": f"Misc Fee - {category_name}",
            "outstanding": float(mfs.outstanding_amount)
        })

    # Check for overdue installments
    overdue_installments = InstallmentService.get_overdue_installments(
        db=db,
        student_id=student_id
    )

    return StudentOutstanding(
        student_id=str(student.id),
        total_outstanding=float(total_outstanding),
        by_fee=by_fee_list,
        has_overdue=len(overdue_installments) > 0,
        overdue_count=len(overdue_installments)
    )


@router.get("/students/all-outstanding", dependencies=[Depends(is_admin)])
def get_all_students_outstanding(
    class_id: Optional[uuid.UUID] = Query(None),
    academic_year: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Get outstanding dues for all students, optionally filtered by class."""

    # Build student query
    query = db.query(StudentModel).filter(
        StudentModel.school_id == school_id
    ).options(selectinload(StudentModel.class_))

    if class_id:
        query = query.filter(StudentModel.class_id == class_id)

    students = query.all()

    results = []
    for student in students:
        # Class fees
        fee_query = db.query(StudentFeeStructureModel).filter(
            StudentFeeStructureModel.student_id == student.id
        )
        if academic_year:
            fee_query = fee_query.filter(StudentFeeStructureModel.academic_year == academic_year)
        fee_structures = fee_query.all()

        # Transport fees
        transport_query = db.query(StudentRouteFeeStructureModel).filter(
            StudentRouteFeeStructureModel.student_id == student.id
        )
        if academic_year:
            transport_query = transport_query.filter(StudentRouteFeeStructureModel.academic_year == academic_year)
        transport_structures = transport_query.all()

        total_expected = sum(fs.final_amount for fs in fee_structures) + sum(ts.final_amount for ts in transport_structures)
        total_paid = sum(fs.amount_paid for fs in fee_structures) + sum(ts.amount_paid for ts in transport_structures)
        total_outstanding = sum(fs.outstanding_amount for fs in fee_structures) + sum(ts.outstanding_amount for ts in transport_structures)

        results.append({
            "id": str(student.id),
            "admission_number": student.admission_number,
            "student_name": f"{student.first_name} {student.last_name}",
            "class_id": str(student.class_id) if student.class_id else None,
            "class_name": student.class_.name if student.class_ else "N/A",
            "total_expected": float(total_expected),
            "total_paid": float(total_paid),
            "total_outstanding": float(total_outstanding)
        })

    return results


# --- Enhanced Payment Endpoints ---

@router.post("/payments/with-allocation", response_model=PaymentWithDetails, dependencies=[Depends(is_admin)])
def create_payment_with_allocation(
    payment_data: PaymentCreateWithAllocations,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school),
    current_user: User = Depends(get_current_user)
):
    """
    Create payment with fee allocation.
    REQUIRED: Must specify which fees the payment covers.
    """
    if payment_data.school_id != school_id:
        raise HTTPException(status_code=403, detail="Cannot create payment for another school")

    if not payment_data.payment_details or len(payment_data.payment_details) == 0:
        raise HTTPException(
            status_code=400,
            detail="Payment allocation is required. Must specify which fees this payment covers."
        )

    if payment_data.amount_paid <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be greater than zero")

    # Validate allocations
    validation = PaymentAllocationService.validate_allocations(
        db=db,
        student_id=payment_data.student_id,
        allocations=[alloc.model_dump() for alloc in payment_data.payment_details],
        total_payment=Decimal(str(payment_data.amount_paid))
    )

    if not validation['valid']:
        raise HTTPException(
            status_code=400,
            detail={"errors": validation['errors'], "warnings": validation['warnings']}
        )

    # Generate receipt number
    try:
        receipt_number = ReceiptNumberService.generate_receipt_number(db, payment_data.fund_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Create payment
    payment = PaymentModel(
        id=uuid.uuid4(),
        receipt_number=receipt_number,
        student_id=payment_data.student_id,
        school_id=payment_data.school_id,
        fund_id=payment_data.fund_id,
        payment_date=payment_data.payment_date,
        amount_paid=payment_data.amount_paid,
        payment_mode=payment_data.payment_mode,
        transaction_id=payment_data.transaction_id,
        remarks=payment_data.remarks,
        received_by_user_id=current_user.id
    )

    db.add(payment)
    db.flush()

    # Allocate payment
    payment_details = PaymentAllocationService.allocate_payment(
        db=db,
        payment=payment,
        allocations=[alloc.model_dump() for alloc in payment_data.payment_details]
    )

    db.commit()
    db.refresh(payment)

    # Return with details
    return payment


@router.get("/payments/{payment_id}/receipt")
def download_payment_receipt(
    payment_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Download PDF receipt for a payment."""
    payment = db.query(PaymentModel).filter(
        PaymentModel.id == payment_id,
        PaymentModel.school_id == school_id
    ).options(
        selectinload(PaymentModel.student).selectinload(StudentModel.class_),
        selectinload(PaymentModel.fund),
        selectinload(PaymentModel.payment_details).selectinload(PaymentDetailModel.fee),
        selectinload(PaymentModel.received_by),
        selectinload(PaymentModel.school)
    ).first()

    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    # Fetch father name from parent profile
    father_name = None
    try:
        from app.models.parent import ParentStudentRelation as ParentStudentRelationModel
        from sqlalchemy.orm import joinedload as _jl
        p_rel = db.query(ParentStudentRelationModel).options(
            _jl(ParentStudentRelationModel.parent)
        ).filter(ParentStudentRelationModel.student_id == payment.student_id).first()
        if p_rel and p_rel.parent:
            father_name = p_rel.parent.father_name
    except Exception:
        pass

    # Calculate total outstanding for the student (all years)
    total_outstanding = 0.0
    try:
        rows = db.query(StudentFeeStructureModel).filter(
            StudentFeeStructureModel.student_id == payment.student_id,
            StudentFeeStructureModel.outstanding_amount > 0
        ).all()
        total_outstanding = sum(float(r.outstanding_amount) for r in rows)
    except Exception:
        pass

    # Load school print settings
    print_settings = {}
    try:
        from app.models.school import School as SchoolModel
        school_obj = db.query(SchoolModel).filter(SchoolModel.id == school_id).first()
        if school_obj and school_obj.settings:
            print_settings = school_obj.settings.get('print', {})
    except Exception:
        pass

    # Generate PDF
    pdf_buffer = PDFReceiptService.generate_receipt(
        payment, db, father_name=father_name, total_outstanding=total_outstanding,
        print_settings=print_settings
    )

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=receipt_{payment.receipt_number}.pdf"
        }
    )


@router.put("/payments/{payment_id}", response_model=PaymentWithDetails, dependencies=[Depends(is_admin)])
def update_payment(
    payment_id: uuid.UUID,
    payment_update: PaymentUpdate,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school),
    current_user: User = Depends(get_current_user)
):
    """
    Update/correct a payment record.
    Only allows updating payment date, amount, mode, transaction ID, and remarks.
    Does not allow changing student or allocations.
    """
    # Get the payment
    payment = tenant_aware_query(db, PaymentModel, school_id).filter(
        PaymentModel.id == payment_id
    ).first()

    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    # Capture old values for audit log
    old_amount = payment.amount_paid
    old_snapshot = {
        "payment_date": payment.payment_date.isoformat() if payment.payment_date else None,
        "amount_paid": float(payment.amount_paid),
        "payment_mode": payment.payment_mode,
        "transaction_id": payment.transaction_id,
        "remarks": payment.remarks,
    }

    # Update fields (exclude edit_reason — not a Payment column)
    update_data = payment_update.model_dump(exclude_unset=True, exclude={"edit_reason"})
    for key, value in update_data.items():
        setattr(payment, key, value)

    # Validate new amount if provided
    if 'amount_paid' in update_data:
        new_amount_paid = Decimal(str(update_data['amount_paid']))
        if new_amount_paid <= 0:
            raise HTTPException(status_code=400, detail="Payment amount must be greater than zero")

    # If amount changed, need to recalculate allocations
    if 'amount_paid' in update_data and update_data['amount_paid'] != old_amount:
        from app.models.transport import StudentRouteFeeStructure as StudentRouteFeeStructureModel
        payment_details = db.query(PaymentDetailModel).filter(
            PaymentDetailModel.payment_id == payment_id
        ).all()

        difference = Decimal(str(update_data['amount_paid'])) - Decimal(str(old_amount))

        if payment_details:
            total_allocated = sum(Decimal(str(pd.amount)) for pd in payment_details)

            for pd in payment_details:
                if total_allocated > 0:
                    old_pd_amount = Decimal(str(pd.amount))  # capture BEFORE updating pd
                    ratio = old_pd_amount / total_allocated
                    new_pd_amount = old_pd_amount + (difference * ratio)
                    pd.amount = float(new_pd_amount)

                    # Try regular class fee first
                    if pd.student_fee_structure_id:
                        student_fee = db.query(StudentFeeStructureModel).filter(
                            StudentFeeStructureModel.id == pd.student_fee_structure_id
                        ).first()
                        if student_fee:
                            student_fee.amount_paid = student_fee.amount_paid - old_pd_amount + new_pd_amount
                            student_fee.outstanding_amount = student_fee.outstanding_amount + old_pd_amount - new_pd_amount

    db.commit()

    # Write audit log entry (non-critical — don't fail if audit_logs table doesn't exist)
    try:
        from app.models.audit_log import AuditLog
        new_snapshot = {
            "payment_date": payment.payment_date.isoformat() if payment.payment_date else None,
            "amount_paid": float(payment.amount_paid),
            "payment_mode": payment.payment_mode,
            "transaction_id": payment.transaction_id,
            "remarks": payment.remarks,
        }
        audit_entry = AuditLog(
            school_id=payment.school_id,
            user_id=current_user.id,
            action="UPDATE",
            resource_type="Payment",
            resource_id=str(payment_id),
            old_value=old_snapshot,
            new_value=new_snapshot,
            description=payment_update.edit_reason,
            status="SUCCESS",
        )
        db.add(audit_entry)
        db.commit()
    except Exception:
        db.rollback()

    # Re-query with relationships for Pydantic v2 model_validate
    payment = db.query(PaymentModel).filter(
        PaymentModel.id == payment_id
    ).options(
        selectinload(PaymentModel.payment_details)
    ).first()

    return PaymentWithDetails.model_validate(payment, from_attributes=True)


# --- Enhanced ClassFee Endpoints ---

@router.get("/class-fees", dependencies=[Depends(is_admin)])
def get_all_class_fees(
    academic_year: Optional[str] = None,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Get all class fees in matrix format for management."""
    from app.models.class_model import Class as ClassModel
    from app.models.finance import Fee as FeeModel

    query = db.query(ClassFeeModel).join(ClassModel).filter(
        ClassModel.school_id == school_id
    ).options(selectinload(ClassFeeModel.fee))

    if academic_year:
        query = query.filter(ClassFeeModel.academic_year == academic_year)

    class_fees = query.all()

    return [
        {
            "id": str(cf.id),
            "class_id": str(cf.class_id),
            "fee_id": str(cf.fee_id),
            "fee_name": cf.fee.fee_name if cf.fee else "Unknown Fee",
            "amount": float(cf.amount),
            "installment_type": cf.installment_type,
            "academic_year": cf.academic_year
        }
        for cf in class_fees
    ]


@router.post("/class-fees", dependencies=[Depends(is_admin)])
def create_class_fee(
    class_fee_data: ClassFeeCreate,
    db: Session = Depends(get_db)
):
    """Create a new class fee or update if already exists."""
    # Check if already exists
    existing = db.query(ClassFeeModel).filter(
        ClassFeeModel.class_id == class_fee_data.class_id,
        ClassFeeModel.fee_id == class_fee_data.fee_id,
        ClassFeeModel.academic_year == class_fee_data.academic_year
    ).first()

    if existing:
        # Update existing
        existing.amount = class_fee_data.amount
        if class_fee_data.installment_type:
            existing.installment_type = class_fee_data.installment_type
        db.commit()
        db.refresh(existing)
        return existing
    else:
        # Create new
        new_class_fee = ClassFeeModel(
            id=uuid.uuid4(),
            **class_fee_data.model_dump()
        )
        db.add(new_class_fee)
        db.commit()
        db.refresh(new_class_fee)
        return new_class_fee


@router.post("/class-fees/bulk", dependencies=[Depends(is_admin)])
def bulk_set_class_fees(
    bulk_data: BulkClassFeeCreate,
    db: Session = Depends(get_db)
):
    """Set fees for multiple classes at once."""
    created = []

    for class_fee_data in bulk_data.class_fees:
        # Check if exists
        existing = db.query(ClassFeeModel).filter(
            ClassFeeModel.class_id == class_fee_data.class_id,
            ClassFeeModel.fee_id == class_fee_data.fee_id,
            ClassFeeModel.academic_year == class_fee_data.academic_year
        ).first()

        if existing:
            # Update
            existing.amount = class_fee_data.amount
            existing.installment_type = class_fee_data.installment_type
        else:
            # Create new
            new_class_fee = ClassFeeModel(
                id=uuid.uuid4(),
                **class_fee_data.model_dump()
            )
            db.add(new_class_fee)
            created.append(new_class_fee)

    db.commit()

    return {"message": f"Bulk operation completed. Created: {len(created)}"}


@router.put("/class-fees/{class_fee_id}", dependencies=[Depends(is_admin)])
def update_class_fee(
    class_fee_id: uuid.UUID,
    update_data: ClassFeeUpdate,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Update an existing class fee — verifies it belongs to the admin's school via class."""
    from app.models.class_model import Class as ClassModel
    class_fee = db.query(ClassFeeModel).join(ClassModel, ClassFeeModel.class_id == ClassModel.id).filter(
        ClassFeeModel.id == class_fee_id,
        ClassModel.school_id == school_id
    ).first()

    if not class_fee:
        raise HTTPException(status_code=404, detail="Class fee not found")

    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(class_fee, key, value)

    db.commit()
    db.refresh(class_fee)

    return class_fee


@router.delete("/class-fees/{class_fee_id}", status_code=204, dependencies=[Depends(is_admin)])
def delete_class_fee(
    class_fee_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Delete a class fee — verifies it belongs to the admin's school via class."""
    from app.models.class_model import Class as ClassModel
    class_fee = db.query(ClassFeeModel).join(ClassModel, ClassFeeModel.class_id == ClassModel.id).filter(
        ClassFeeModel.id == class_fee_id,
        ClassModel.school_id == school_id
    ).first()

    if not class_fee:
        raise HTTPException(status_code=404, detail="Class fee not found")

    db.delete(class_fee)
    db.commit()

    return {"message": "Class fee deleted"}


# --- Bulk Operations ---

@router.post("/payments/bulk", dependencies=[Depends(is_admin)])
def bulk_create_payments(
    bulk_data: BulkPaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Record multiple payments at once (e.g., bank batch deposits)."""
    created_payments = []

    for payment_data in bulk_data.payments:
        # Generate receipt number
        receipt_number = ReceiptNumberService.generate_receipt_number(db, payment_data.fund_id)

        # Create payment
        payment = PaymentModel(
            id=uuid.uuid4(),
            receipt_number=receipt_number,
            student_id=payment_data.student_id,
            school_id=bulk_data.school_id,
            fund_id=payment_data.fund_id,
            payment_date=payment_data.payment_date,
            amount_paid=payment_data.amount_paid,
            payment_mode=payment_data.payment_mode,
            transaction_id=payment_data.transaction_id,
            remarks=payment_data.remarks,
            received_by_user_id=current_user.id
        )

        db.add(payment)
        created_payments.append(payment)

        # Auto-allocate if requested
        if payment_data.auto_allocate:
            # Get oldest outstanding fees
            fee_structures = db.query(StudentFeeStructureModel).filter(
                StudentFeeStructureModel.student_id == payment_data.student_id,
                StudentFeeStructureModel.outstanding_amount > 0
            ).order_by(StudentFeeStructureModel.created_at).all()

            remaining = Decimal(str(payment_data.amount_paid))
            allocations = []

            for fs in fee_structures:
                if remaining <= 0:
                    break

                alloc_amount = min(remaining, fs.outstanding_amount)
                allocations.append({
                    'fee_id': fs.class_fee.fee_id,
                    'student_fee_structure_id': fs.id,
                    'amount': alloc_amount
                })
                remaining -= alloc_amount

            if allocations:
                PaymentAllocationService.allocate_payment(db, payment, allocations)

    db.commit()

    return {
        "message": f"Successfully created {len(created_payments)} payments",
        "payments": [{"id": str(p.id), "receipt_number": p.receipt_number} for p in created_payments]
    }


@router.post("/concessions/bulk", dependencies=[Depends(is_admin)])
def bulk_create_concessions(
    bulk_data: BulkConcessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Apply same concession to multiple students."""
    created_concessions = []

    # Get student IDs
    student_ids = bulk_data.student_ids or []

    # If class_ids provided, get all students in those classes
    if bulk_data.class_ids:
        students_in_classes = db.query(StudentModel.id).filter(
            StudentModel.class_id.in_(bulk_data.class_ids)
        ).all()
        student_ids.extend([str(s.id) for s in students_in_classes])

    # Remove duplicates
    student_ids = list(set(student_ids))

    for student_id in student_ids:
        concession = ConcessionModel(
            id=uuid.uuid4(),
            student_id=uuid.UUID(student_id),
            fee_id=bulk_data.fee_id,
            discount_amount=bulk_data.discount_amount,
            discount_percentage=bulk_data.discount_percentage,
            reason=bulk_data.reason,
            academic_year=bulk_data.academic_year,
            school_id=bulk_data.school_id,
            approved_by_user_id=current_user.id
        )

        db.add(concession)
        created_concessions.append(concession)

    db.commit()

    return {
        "message": f"Successfully created {len(created_concessions)} concessions",
        "count": len(created_concessions)
    }


# --- Installment Endpoints ---

@router.get("/students/{student_id}/installments", dependencies=[Depends(is_admin_or_teacher)])
def get_student_installments(
    student_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Get all installments for a student with payment status."""
    from app.models.finance import FeeInstallment as FeeInstallmentModel

    # Verify student
    student = db.query(StudentModel).filter(
        StudentModel.id == student_id,
        StudentModel.school_id == school_id
    ).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Get installments
    installments = db.query(FeeInstallmentModel).join(
        StudentFeeStructureModel
    ).filter(
        StudentFeeStructureModel.student_id == student_id
    ).order_by(FeeInstallmentModel.due_date).all()

    # Update statuses
    for installment in installments:
        InstallmentService.update_installment_status(db, installment.id)

    return [
        {
            "id": str(inst.id),
            "installment_number": inst.installment_number,
            "due_date": inst.due_date.isoformat(),
            "amount": float(inst.amount),
            "paid_amount": float(inst.paid_amount),
            "status": inst.status,
            "days_overdue": InstallmentService.calculate_days_overdue(inst.due_date) if inst.status == 'overdue' else 0
        }
        for inst in installments
    ]


def _calculate_student_outstanding(db: Session, student_id: uuid.UUID, school_id: str, academic_year: Optional[str] = None):
    """
    Helper function to calculate student outstanding fees.
    Returns a dict with total_outstanding and by_fee breakdown.
    """
    # Get outstanding by fee type
    query = db.query(StudentFeeStructureModel).filter(
        StudentFeeStructureModel.student_id == student_id,
        StudentFeeStructureModel.outstanding_amount > 0
    ).options(
        selectinload(StudentFeeStructureModel.class_fee)
    )

    if academic_year:
        query = query.filter(StudentFeeStructureModel.academic_year == academic_year)

    fee_structures = query.all()

    total_outstanding = sum(fs.outstanding_amount for fs in fee_structures)

    return {
        'total_outstanding': float(total_outstanding),
        'by_fee': [{
            'fee_id': str(fs.class_fee.fee_id) if fs.class_fee and fs.class_fee.fee_id else None,
            'fee_structure_id': str(fs.id),
            'fee_name': fs.class_fee.fee.fee_name if fs.class_fee and fs.class_fee.fee else "Unknown",
            'outstanding': float(fs.outstanding_amount)
        } for fs in fee_structures]
    }


# --- Fee Due Slips ---

@router.get("/students/{student_id}/fee-due-slip", dependencies=[Depends(is_admin_or_teacher)])
def generate_fee_due_slip(
    student_id: uuid.UUID,
    academic_year: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """
    Generate and download PDF fee due slip for a student.
    Includes outstanding fees, overdue installments, and payment instructions.
    """
    from app.services.pdf_service import PDFReceiptService
    from app.services.installment_service import InstallmentService
    from app.models.finance import FeeInstallment as FeeInstallmentModel

    # Get student with relationships
    student = tenant_aware_query(db, StudentModel, school_id).options(
        selectinload(StudentModel.class_)
    ).filter(StudentModel.id == student_id).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Get outstanding data
    outstanding = _calculate_student_outstanding(db, student_id, school_id, academic_year)

    if outstanding['total_outstanding'] <= 0:
        raise HTTPException(status_code=400, detail="Student has no outstanding fees")

    # Get overdue installments
    overdue_installments = db.query(FeeInstallmentModel).join(
        StudentFeeStructureModel
    ).join(
        ClassFeeModel
    ).filter(
        StudentFeeStructureModel.student_id == student_id,
        FeeInstallmentModel.status == 'overdue'
    ).order_by(FeeInstallmentModel.due_date).limit(5).all()

    overdue_data = []
    for inst in overdue_installments:
        class_fee = inst.student_fee_structure.class_fee
        overdue_data.append({
            'fee_name': class_fee.fee.fee_name,
            'due_date': inst.due_date.isoformat(),
            'amount': float(inst.amount),
            'days_overdue': InstallmentService.calculate_days_overdue(inst.due_date)
        })

    # Get parent information
    from app.models.parent import Parent as ParentModel, ParentStudentRelation as ParentStudentRelationModel
    parent_relation = db.query(ParentStudentRelationModel).join(
        ParentModel, ParentStudentRelationModel.parent_id == ParentModel.id
    ).filter(
        ParentStudentRelationModel.student_id == student_id
    ).first()

    father_name = 'N/A'
    if parent_relation and parent_relation.parent:
        father_name = parent_relation.parent.father_name or 'N/A'

    # Prepare student data
    student_data = {
        'student_name': f"{student.first_name} {student.last_name}",
        'admission_number': student.admission_number,
        'class_name': student.class_.name if student.class_ else 'N/A',
        'father_name': father_name,
        'school_name': getattr(student.school, 'name', 'School Name'),
        'school_address': getattr(student.school, 'address', ''),
        'school_contact': f"Phone: {getattr(student.school, 'phone', '')} | Email: {getattr(student.school, 'email', '')}",
        'academic_year': academic_year or '2025-26'
    }

    # Load school print settings
    print_settings = {}
    try:
        from app.models.school import School as SchoolModel
        school_obj = db.query(SchoolModel).filter(SchoolModel.id == school_id).first()
        if school_obj and school_obj.settings:
            print_settings = school_obj.settings.get('print', {})
    except Exception:
        pass

    # Generate PDF
    pdf_buffer = PDFReceiptService.generate_fee_due_slip(
        student_data=student_data,
        outstanding_data=outstanding,
        installments=overdue_data,
        print_settings=print_settings
    )

    # Return as downloadable PDF
    filename = f"fee_due_slip_{student.admission_number}_{datetime.now().strftime('%Y%m%d')}.pdf"
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/students/fee-due-slips/bulk", dependencies=[Depends(is_admin)])
def generate_bulk_fee_due_slips(
    class_id: Optional[uuid.UUID] = Query(None),
    min_outstanding: Optional[float] = Query(None),
    academic_year: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """
    Get list of students eligible for fee due slip generation.
    Can be filtered by class or minimum outstanding amount.
    """
    # Get all students with outstanding fees
    query = db.query(StudentModel).join(
        StudentFeeStructureModel
    ).filter(
        StudentModel.school_id == uuid.UUID(school_id) if isinstance(school_id, str) else school_id,
        StudentFeeStructureModel.outstanding_amount > 0
    )

    if class_id:
        query = query.filter(StudentModel.class_id == class_id)

    if academic_year:
        query = query.filter(StudentFeeStructureModel.academic_year == academic_year)

    students = query.distinct().all()

    # Calculate outstanding for each student
    result = []
    for student in students:
        outstanding = _calculate_student_outstanding(db, student.id, school_id, academic_year)

        if min_outstanding and outstanding['total_outstanding'] < min_outstanding:
            continue

        result.append({
            'student_id': str(student.id),
            'student_name': f"{student.first_name} {student.last_name}",
            'admission_number': student.admission_number,
            'class_name': student.class_.name if student.class_ else 'N/A',
            'total_outstanding': outstanding['total_outstanding']
        })

    return result


# --- Print Settings ---

from app.services.pdf_service import DEFAULT_PRINT_SETTINGS as _DEFAULT_PRINT_SETTINGS

@router.get("/print-settings", dependencies=[Depends(is_admin)])
def get_print_settings(
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Get school's print settings for receipts and fee due slips."""
    from app.models.school import School as SchoolModel
    school = db.query(SchoolModel).filter(SchoolModel.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    settings = school.settings or {}
    saved = settings.get('print', {})
    # Merge with defaults so all keys are always present
    result = {}
    for doc_type in ('receipt', 'fee_due'):
        defaults = _DEFAULT_PRINT_SETTINGS.get(doc_type, {})
        result[doc_type] = {**defaults, **saved.get(doc_type, {})}
    return result


@router.put("/print-settings", dependencies=[Depends(is_admin)])
def update_print_settings(
    body: dict,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Update school's print settings for receipts and fee due slips."""
    from app.models.school import School as SchoolModel
    from sqlalchemy.orm.attributes import flag_modified
    school = db.query(SchoolModel).filter(SchoolModel.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    current = dict(school.settings or {})
    current['print'] = body
    school.settings = current
    flag_modified(school, 'settings')
    db.commit()
    return body
