from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session, joinedload, selectinload
from typing import List, Optional
from app.core.database import get_db
from app.models.parent import Parent as ParentModel, ParentStudentRelation as ParentStudentRelationModel
from app.models.student import Student as StudentModel
from app.models.finance import StudentFeeStructure as StudentFeeStructureModel, Payment as PaymentModel, FeeInstallment as FeeInstallmentModel, ClassFee as ClassFeeModel, Fee as FeeModel, PaymentDetail as PaymentDetailModel
from app.models.attendance import Attendance as AttendanceModel
from app.core.permissions import is_admin
from app.core.utils import tenant_aware_query
from app.api.deps import get_current_user_school, get_current_user
from app.models.user import User as UserModel
from app.services.pdf_service import PDFReceiptService
from app.core.security import hash_password
from decimal import Decimal
import uuid
from pydantic import BaseModel, EmailStr

router = APIRouter()


# --- Admin Parent Management Schemas ---

class ParentCreateRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    father_name: Optional[str] = None
    father_phone: Optional[str] = None
    father_email: Optional[str] = None
    father_occupation: Optional[str] = None
    mother_name: Optional[str] = None
    mother_phone: Optional[str] = None
    mother_email: Optional[str] = None
    mother_occupation: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    student_ids: Optional[List[str]] = []


class ParentUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    father_name: Optional[str] = None
    father_phone: Optional[str] = None
    father_email: Optional[str] = None
    father_occupation: Optional[str] = None
    mother_name: Optional[str] = None
    mother_phone: Optional[str] = None
    mother_email: Optional[str] = None
    mother_occupation: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None


class LinkStudentsRequest(BaseModel):
    parent_id: str
    student_ids: List[str]
    relationship_type: str = "PARENT"


class ResetPasswordRequest(BaseModel):
    new_password: str

# --- Admin Parent Management Endpoints ---

@router.post("/admin/create", dependencies=[Depends(is_admin)])
def create_parent_with_account(
    parent_data: ParentCreateRequest,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Create a parent user account and link to students."""

    # Check if user with this email already exists
    existing_user = db.query(UserModel).filter(UserModel.email == parent_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create user account
    new_user = UserModel(
        email=parent_data.email,
        password_hash=hash_password(parent_data.password),
        full_name=parent_data.full_name,
        username=parent_data.email.split('@')[0],
        role="PARENT",
        school_id=school_id,
        is_active=True,
        is_verified=True
    )
    db.add(new_user)
    db.flush()

    # Create parent profile
    new_parent = ParentModel(
        user_id=new_user.id,
        school_id=school_id,
        father_name=parent_data.father_name,
        father_phone=parent_data.father_phone,
        father_email=parent_data.father_email,
        father_occupation=parent_data.father_occupation,
        mother_name=parent_data.mother_name,
        mother_phone=parent_data.mother_phone,
        mother_email=parent_data.mother_email,
        mother_occupation=parent_data.mother_occupation,
        address=parent_data.address,
        city=parent_data.city,
        state=parent_data.state,
        pincode=parent_data.pincode
    )
    db.add(new_parent)
    db.flush()

    # Link students if provided
    if parent_data.student_ids:
        for student_id in parent_data.student_ids:
            # Verify student exists and belongs to same school
            student = db.query(StudentModel).filter(
                StudentModel.id == uuid.UUID(student_id),
                StudentModel.school_id == school_id
            ).first()

            if student:
                link = ParentStudentRelationModel(
                    parent_id=new_parent.id,
                    student_id=student.id,
                    relationship_type="PARENT"
                )
                db.add(link)

    db.commit()
    db.refresh(new_parent)

    return {
        "id": str(new_parent.id),
        "user_id": str(new_user.id),
        "email": new_user.email,
        "full_name": new_user.full_name,
        "father_name": new_parent.father_name,
        "mother_name": new_parent.mother_name,
        "father_phone": new_parent.father_phone,
        "mother_phone": new_parent.mother_phone,
        "address": new_parent.address,
        "students_linked": len(parent_data.student_ids) if parent_data.student_ids else 0
    }


@router.get("/admin/list", dependencies=[Depends(is_admin)])
def list_all_parents(
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Get list of all parents with their linked students."""

    parents = db.query(ParentModel).options(
        joinedload(ParentModel.user),
        joinedload(ParentModel.students).joinedload(ParentStudentRelationModel.student)
    ).filter(ParentModel.school_id == school_id).all()

    result = []
    for parent in parents:
        students = []
        for relation in parent.students:
            students.append({
                "id": str(relation.student.id),
                "first_name": relation.student.first_name,
                "last_name": relation.student.last_name,
                "admission_number": relation.student.admission_number,
                "relationship_type": relation.relationship_type
            })

        result.append({
            "id": str(parent.id),
            "user_id": str(parent.user_id),
            "email": parent.user.email if parent.user else None,
            "full_name": parent.user.full_name if parent.user else None,
            "father_name": parent.father_name,
            "father_phone": parent.father_phone,
            "father_email": parent.father_email,
            "father_occupation": parent.father_occupation,
            "mother_name": parent.mother_name,
            "mother_phone": parent.mother_phone,
            "mother_email": parent.mother_email,
            "mother_occupation": parent.mother_occupation,
            "address": parent.address,
            "city": parent.city,
            "state": parent.state,
            "pincode": parent.pincode,
            "students": students,
            "is_active": parent.user.is_active if parent.user else False,
            "created_at": parent.created_at.isoformat() if parent.created_at else None
        })

    return result


@router.put("/admin/{parent_id}", dependencies=[Depends(is_admin)])
def update_parent(
    parent_id: uuid.UUID,
    parent_data: ParentUpdateRequest,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Update parent information."""

    parent = db.query(ParentModel).filter(
        ParentModel.id == parent_id,
        ParentModel.school_id == school_id
    ).first()

    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")

    # Update parent fields
    for field, value in parent_data.dict(exclude_unset=True).items():
        if hasattr(parent, field):
            setattr(parent, field, value)

    # Update user full_name if provided
    if parent_data.full_name and parent.user:
        parent.user.full_name = parent_data.full_name

    db.commit()
    db.refresh(parent)

    return {"message": "Parent updated successfully", "id": str(parent.id)}


@router.post("/admin/link-students", dependencies=[Depends(is_admin)])
def link_students_to_parent(
    link_data: LinkStudentsRequest,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Link multiple students to a parent."""

    parent = db.query(ParentModel).filter(
        ParentModel.id == uuid.UUID(link_data.parent_id),
        ParentModel.school_id == school_id
    ).first()

    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")

    linked_count = 0
    for student_id in link_data.student_ids:
        # Check if link already exists
        existing_link = db.query(ParentStudentRelationModel).filter(
            ParentStudentRelationModel.parent_id == parent.id,
            ParentStudentRelationModel.student_id == uuid.UUID(student_id)
        ).first()

        if not existing_link:
            # Verify student exists and belongs to same school
            student = db.query(StudentModel).filter(
                StudentModel.id == uuid.UUID(student_id),
                StudentModel.school_id == school_id
            ).first()

            if student:
                link = ParentStudentRelationModel(
                    parent_id=parent.id,
                    student_id=student.id,
                    relationship_type=link_data.relationship_type
                )
                db.add(link)
                linked_count += 1

    db.commit()

    return {"message": f"Linked {linked_count} students to parent", "linked_count": linked_count}


@router.delete("/admin/unlink-student/{parent_id}/{student_id}", dependencies=[Depends(is_admin)])
def unlink_student_from_parent(
    parent_id: uuid.UUID,
    student_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Unlink a student from a parent."""

    # Verify parent belongs to school
    parent = db.query(ParentModel).filter(
        ParentModel.id == parent_id,
        ParentModel.school_id == school_id
    ).first()

    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")

    # Find and delete the link
    link = db.query(ParentStudentRelationModel).filter(
        ParentStudentRelationModel.parent_id == parent_id,
        ParentStudentRelationModel.student_id == student_id
    ).first()

    if not link:
        raise HTTPException(status_code=404, detail="Student link not found")

    db.delete(link)
    db.commit()

    return {"message": "Student unlinked from parent successfully"}


@router.post("/admin/{parent_id}/reset-password", dependencies=[Depends(is_admin)])
def reset_parent_password(
    parent_id: uuid.UUID,
    password_data: ResetPasswordRequest,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Reset a parent's password."""

    parent = db.query(ParentModel).options(
        joinedload(ParentModel.user)
    ).filter(
        ParentModel.id == parent_id,
        ParentModel.school_id == school_id
    ).first()

    if not parent or not parent.user:
        raise HTTPException(status_code=404, detail="Parent not found")

    parent.user.password_hash = hash_password(password_data.new_password)
    db.commit()

    return {"message": "Password reset successfully"}


@router.delete("/admin/{parent_id}", dependencies=[Depends(is_admin)])
def delete_parent(
    parent_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Delete a parent account."""

    parent = db.query(ParentModel).options(
        joinedload(ParentModel.user)
    ).filter(
        ParentModel.id == parent_id,
        ParentModel.school_id == school_id
    ).first()

    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")

    # Delete all student links first
    db.query(ParentStudentRelationModel).filter(
        ParentStudentRelationModel.parent_id == parent_id
    ).delete()

    # Delete parent record
    user = parent.user
    db.delete(parent)

    # Delete user account
    if user:
        db.delete(user)

    db.commit()

    return {"message": "Parent deleted successfully"}


# --- Parent Portal Endpoints ---

@router.get("/me/children")
def get_my_children(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Get list of children for the current parent user."""
    school_id = current_user.school_id

    # Get parent record
    parent = db.query(ParentModel).filter(
        ParentModel.user_id == current_user.id,
        ParentModel.school_id == school_id
    ).first()

    if not parent:
        raise HTTPException(status_code=404, detail="Parent profile not found")

    # Get all children linked to this parent
    relationships = db.query(ParentStudentRelationModel).options(
        joinedload(ParentStudentRelationModel.student).joinedload(StudentModel.class_)
    ).filter(
        ParentStudentRelationModel.parent_id == parent.id
    ).all()

    children = []
    for rel in relationships:
        student = rel.student
        children.append({
            "id": str(student.id),
            "first_name": student.first_name,
            "last_name": student.last_name,
            "admission_number": student.admission_number,
            "class_": {
                "name": student.class_.name if student.class_ else None,
                "section": student.class_.section if student.class_ else None
            } if student.class_ else None,
            "date_of_birth": student.date_of_birth.isoformat() if student.date_of_birth else None,
            "gender": student.gender,
            "status": student.status
        })

    return children


@router.get("/me/profile")
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Get current parent's profile information."""
    school_id = current_user.school_id

    # Get parent record
    parent = db.query(ParentModel).filter(
        ParentModel.user_id == current_user.id,
        ParentModel.school_id == school_id
    ).first()

    if not parent:
        raise HTTPException(status_code=404, detail="Parent profile not found")

    return {
        "id": str(parent.id),
        "user_id": str(current_user.id),
        "email": current_user.email,
        "username": current_user.username,
        "full_name": current_user.full_name,
        "father_name": parent.father_name,
        "mother_name": parent.mother_name,
        "father_phone": parent.father_phone,
        "mother_phone": parent.mother_phone,
        "father_email": parent.father_email,
        "mother_email": parent.mother_email,
        "address": parent.address,
        "city": parent.city,
        "state": parent.state,
        "pincode": parent.pincode
    }


# --- Parent Finance Endpoints ---

@router.get("/children/{child_id}/fees")
def get_child_fees(
    child_id: uuid.UUID,
    academic_year: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Get fee details for a specific child. Parents can only access their own children's data."""
    school_id = current_user.school_id

    # Verify that this student belongs to the current parent (if parent role)
    if current_user.role == "PARENT":
        parent = db.query(ParentModel).filter(
            ParentModel.user_id == current_user.id,
            ParentModel.school_id == school_id
        ).first()

        if not parent:
            raise HTTPException(status_code=403, detail="Parent profile not found")

        # Verify parent-child relationship
        relationship = db.query(ParentStudentRelationModel).filter(
            ParentStudentRelationModel.parent_id == parent.id,
            ParentStudentRelationModel.student_id == child_id
        ).first()

        if not relationship:
            raise HTTPException(status_code=403, detail="Access denied to this student's data")

    # Get student
    student = db.query(StudentModel).filter(
        StudentModel.id == child_id,
        StudentModel.school_id == school_id
    ).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Get fee structures
    query = db.query(StudentFeeStructureModel).options(
        joinedload(StudentFeeStructureModel.class_fee).joinedload(ClassFeeModel.fee)
    ).filter(
        StudentFeeStructureModel.student_id == child_id
    )

    if academic_year:
        query = query.filter(StudentFeeStructureModel.academic_year == academic_year)

    fee_structures = query.all()

    # Format response
    fee_structures_data = []
    all_installments = []

    for fs in fee_structures:
        fee_name = fs.class_fee.fee.fee_name if fs.class_fee and fs.class_fee.fee else "Fee"

        # Get installments for this fee structure
        installments = db.query(FeeInstallmentModel).filter(
            FeeInstallmentModel.student_fee_structure_id == fs.id
        ).order_by(FeeInstallmentModel.installment_number).all()

        for inst in installments:
            all_installments.append({
                "id": str(inst.id),
                "installment_number": inst.installment_number,
                "fee_name": fee_name,
                "due_date": inst.due_date.isoformat() if inst.due_date else None,
                "amount": float(inst.amount),
                "amount_paid": float(inst.paid_amount) if inst.paid_amount else 0,
                "status": inst.status
            })

        fee_structures_data.append({
            "id": str(fs.id),
            "fee_name": fee_name,
            "academic_year": fs.academic_year,
            "total_amount": float(fs.total_amount),
            "discount_amount": float(fs.discount_amount) if fs.discount_amount else 0,
            "final_amount": float(fs.final_amount),
            "amount_paid": float(fs.amount_paid) if fs.amount_paid else 0,
            "outstanding_amount": float(fs.outstanding_amount)
        })

    return {
        "student_id": str(student.id),
        "student_name": f"{student.first_name} {student.last_name}",
        "admission_number": student.admission_number,
        "fee_structures": fee_structures_data,
        "installments": all_installments
    }


@router.get("/children/{child_id}/payments")
def get_child_payments(
    child_id: uuid.UUID,
    academic_year: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Get payment history for a specific child."""
    school_id = current_user.school_id

    # Verify parent-child relationship if parent role
    if current_user.role == "PARENT":
        parent = db.query(ParentModel).filter(
            ParentModel.user_id == current_user.id,
            ParentModel.school_id == school_id
        ).first()

        if not parent:
            raise HTTPException(status_code=403, detail="Parent profile not found")

        relationship = db.query(ParentStudentRelationModel).filter(
            ParentStudentRelationModel.parent_id == parent.id,
            ParentStudentRelationModel.student_id == child_id
        ).first()

        if not relationship:
            raise HTTPException(status_code=403, detail="Access denied to this student's data")

    # Get student
    student = db.query(StudentModel).filter(
        StudentModel.id == child_id,
        StudentModel.school_id == school_id
    ).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Get payments
    query = db.query(PaymentModel).options(
        joinedload(PaymentModel.fund),
        joinedload(PaymentModel.payment_details)
    ).filter(
        PaymentModel.student_id == child_id,
        PaymentModel.school_id == school_id
    ).order_by(PaymentModel.payment_date.desc())

    total_count = query.count()
    payments = query.offset(offset).limit(limit).all()

    # Format response
    payment_list = []
    for payment in payments:
        payment_list.append({
            "id": str(payment.id),
            "payment_id": str(payment.id),
            "receipt_number": payment.receipt_number,
            "payment_date": payment.payment_date.isoformat() if payment.payment_date else None,
            "amount": float(payment.amount_paid) if payment.amount_paid else 0,
            "amount_paid": float(payment.amount_paid) if payment.amount_paid else 0,
            "payment_mode": payment.payment_mode,
            "fund_name": payment.fund.name if payment.fund else "N/A",
            "transaction_id": payment.transaction_id,
            "remarks": payment.remarks,
            "status": "COMPLETED"
        })

    return {
        "student_id": str(student.id),
        "student_name": f"{student.first_name} {student.last_name}",
        "total_count": total_count,
        "payments": payment_list
    }


@router.get("/payments/{payment_id}/receipt")
def download_receipt(
    payment_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Download PDF receipt for a payment. Parents can only access their children's receipts."""
    school_id = current_user.school_id

    # Get payment with all relationships
    payment = db.query(PaymentModel).options(
        selectinload(PaymentModel.student).selectinload(StudentModel.class_),
        selectinload(PaymentModel.fund),
        selectinload(PaymentModel.payment_details).selectinload(PaymentDetailModel.fee),
        selectinload(PaymentModel.received_by),
        selectinload(PaymentModel.school)
    ).filter(
        PaymentModel.id == payment_id,
        PaymentModel.school_id == school_id
    ).first()

    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    # Verify parent-child relationship if parent role
    if current_user.role == "PARENT":
        parent = db.query(ParentModel).filter(
            ParentModel.user_id == current_user.id,
            ParentModel.school_id == school_id
        ).first()

        if not parent:
            raise HTTPException(status_code=403, detail="Parent profile not found")

        relationship = db.query(ParentStudentRelationModel).filter(
            ParentStudentRelationModel.parent_id == parent.id,
            ParentStudentRelationModel.student_id == payment.student_id
        ).first()

        if not relationship:
            raise HTTPException(status_code=403, detail="Access denied to this receipt")

    # Generate PDF receipt
    pdf_buffer = PDFReceiptService.generate_receipt(payment, db)

    # Return as downloadable PDF
    filename = f"receipt_{payment.receipt_number}.pdf"
    return Response(
        content=pdf_buffer.getvalue(),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


# --- Parent Attendance Endpoints ---

@router.get("/children/{child_id}/attendance")
def get_child_attendance(
    child_id: uuid.UUID,
    month: Optional[str] = None,
    year: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Get attendance records for a specific child."""
    from sqlalchemy import extract, func
    from datetime import datetime

    school_id = current_user.school_id

    # Verify parent-child relationship if parent role
    if current_user.role == "PARENT":
        parent = db.query(ParentModel).filter(
            ParentModel.user_id == current_user.id,
            ParentModel.school_id == school_id
        ).first()

        if not parent:
            raise HTTPException(status_code=403, detail="Parent profile not found")

        relationship = db.query(ParentStudentRelationModel).filter(
            ParentStudentRelationModel.parent_id == parent.id,
            ParentStudentRelationModel.student_id == child_id
        ).first()

        if not relationship:
            raise HTTPException(status_code=403, detail="Access denied to this student's data")

    # Build query
    query = db.query(AttendanceModel).filter(
        AttendanceModel.student_id == child_id,
        AttendanceModel.school_id == school_id
    )

    # Filter by month and year if provided
    if month and year:
        query = query.filter(
            extract('month', AttendanceModel.date) == int(month),
            extract('year', AttendanceModel.date) == int(year)
        )

    attendance_records = query.order_by(AttendanceModel.date.desc()).all()

    return [{
        "id": str(record.id),
        "date": record.date.isoformat() if record.date else None,
        "status": record.status,
        "remarks": record.remarks
    } for record in attendance_records]


@router.get("/children/{child_id}/attendance/stats")
def get_child_attendance_stats(
    child_id: uuid.UUID,
    academic_year: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Get attendance statistics for a specific child."""
    from sqlalchemy import func

    school_id = current_user.school_id

    # Verify parent-child relationship if parent role
    if current_user.role == "PARENT":
        parent = db.query(ParentModel).filter(
            ParentModel.user_id == current_user.id,
            ParentModel.school_id == school_id
        ).first()

        if not parent:
            raise HTTPException(status_code=403, detail="Parent profile not found")

        relationship = db.query(ParentStudentRelationModel).filter(
            ParentStudentRelationModel.parent_id == parent.id,
            ParentStudentRelationModel.student_id == child_id
        ).first()

        if not relationship:
            raise HTTPException(status_code=403, detail="Access denied to this student's data")

    # Get attendance statistics
    query = db.query(AttendanceModel).filter(
        AttendanceModel.student_id == child_id,
        AttendanceModel.school_id == school_id
    )

    total_days = query.count()
    present_days = query.filter(AttendanceModel.status == "PRESENT").count()
    absent_days = query.filter(AttendanceModel.status == "ABSENT").count()
    late_days = query.filter(AttendanceModel.status == "LATE").count()

    attendance_percentage = (present_days / total_days * 100) if total_days > 0 else 0

    return {
        "total_days": total_days,
        "present_days": present_days,
        "absent_days": absent_days,
        "late_days": late_days,
        "attendance_percentage": round(attendance_percentage, 2)
    }


# --- Parent Dashboard Endpoint ---

@router.get("/me/dashboard")
def get_family_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Get dashboard statistics for family portal."""
    from datetime import date
    from app.models.exam import Exam as ExamModel
    from app.models.library import BookTransaction as BookTransactionModel

    school_id = current_user.school_id

    # Get parent record
    parent = db.query(ParentModel).filter(
        ParentModel.user_id == current_user.id,
        ParentModel.school_id == school_id
    ).first()

    if not parent:
        raise HTTPException(status_code=404, detail="Parent profile not found")

    # Get linked children IDs
    relations = db.query(ParentStudentRelationModel).filter(
        ParentStudentRelationModel.parent_id == parent.id
    ).all()
    children_count = len(relations)
    child_ids = [r.student_id for r in relations]

    # Upcoming exams: exams for the classes the children are enrolled in, with date >= today
    upcoming_exams = 0
    if child_ids:
        child_class_ids = [
            s.class_id for s in db.query(StudentModel.class_id).filter(
                StudentModel.id.in_(child_ids),
                StudentModel.class_id.isnot(None)
            ).all()
        ]
        if child_class_ids:
            upcoming_exams = db.query(ExamModel).filter(
                ExamModel.class_id.in_(child_class_ids),
                ExamModel.school_id == school_id,
                ExamModel.exam_date >= date.today()
            ).count()

    # Books currently borrowed (not yet returned)
    books_borrowed = 0
    if child_ids:
        books_borrowed = db.query(BookTransactionModel).filter(
            BookTransactionModel.student_id.in_(child_ids),
            BookTransactionModel.status == "borrowed"
        ).count()

    return {
        "my_children": children_count,
        "upcoming_exams": upcoming_exams,
        "books_borrowed": books_borrowed,
        "achievements": 0
    }