from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import uuid
from datetime import datetime

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.student import Student
from app.models.class_model import Class
from app.models.finance import Fee, Payment
from app.services.audit_service import AuditService
from sqlalchemy import func


router = APIRouter()


class BulkStudentPromotionRequest(BaseModel):
    student_ids: List[uuid.UUID]
    target_class_id: uuid.UUID
    academic_year: str


class BulkFeeAssignmentRequest(BaseModel):
    student_ids: List[uuid.UUID]
    fee_structure_id: uuid.UUID
    academic_year: str
    due_date: datetime


class BulkSMSRequest(BaseModel):
    recipient_type: str  # "students", "parents", "teachers"
    recipient_ids: Optional[List[uuid.UUID]] = None  # If None, send to all
    message: str


class BulkAttendanceRequest(BaseModel):
    class_id: uuid.UUID
    date: datetime
    student_statuses: Dict[str, str]  # student_id: status


@router.post("/promote-students")
async def bulk_promote_students(
    request: BulkStudentPromotionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Promote multiple students to a new class.
    Only accessible by ADMIN and SUPERADMIN roles.
    """
    if current_user.role not in ["ADMIN", "SUPERADMIN"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    school_id = current_user.school_id
    if not school_id:
        raise HTTPException(status_code=400, detail="User must be associated with a school")

    # Verify target class exists
    target_class = db.query(Class).filter(
        Class.id == request.target_class_id,
        Class.school_id == school_id
    ).first()

    if not target_class:
        raise HTTPException(status_code=404, detail="Target class not found")

    promoted_count = 0
    failed_students = []

    for student_id in request.student_ids:
        try:
            student = db.query(Student).filter(
                Student.id == student_id,
                Student.school_id == school_id
            ).first()

            if not student:
                failed_students.append({
                    "student_id": str(student_id),
                    "reason": "Student not found"
                })
                continue

            old_class_id = student.class_id

            # Update student class
            student.class_id = request.target_class_id
            student.academic_year = request.academic_year

            db.commit()

            # Log the promotion
            await AuditService.log(
                db=db,
                school_id=school_id,
                action="UPDATE",
                resource_type="Student",
                resource_id=student_id,
                user_id=current_user.id,
                old_value={"class_id": str(old_class_id) if old_class_id else None},
                new_value={"class_id": str(request.target_class_id)},
                description=f"Promoted student to {target_class.name}"
            )

            promoted_count += 1

        except Exception as e:
            failed_students.append({
                "student_id": str(student_id),
                "reason": str(e)
            })

    return {
        "success": True,
        "promoted_count": promoted_count,
        "failed_count": len(failed_students),
        "failed_students": failed_students
    }


@router.post("/assign-fees")
async def bulk_assign_fees(
    request: BulkFeeAssignmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Assign fees to multiple students.
    Only accessible by ACCOUNTANT, ADMIN and SUPERADMIN roles.
    """
    if current_user.role not in ["ACCOUNTANT", "ADMIN", "SUPERADMIN"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    school_id = current_user.school_id
    if not school_id:
        raise HTTPException(status_code=400, detail="User must be associated with a school")

    assigned_count = 0
    failed_students = []

    for student_id in request.student_ids:
        try:
            student = db.query(Student).filter(
                Student.id == student_id,
                Student.school_id == school_id
            ).first()

            if not student:
                failed_students.append({
                    "student_id": str(student_id),
                    "reason": "Student not found"
                })
                continue

            # Create fee record (simplified - in production would get amount from fee_structure)
            fee = Fee(
                id=uuid.uuid4(),
                student_id=student_id,
                school_id=school_id,
                academic_year=request.academic_year,
                due_date=request.due_date,
                status="PENDING"
                # Additional fields would be populated from fee_structure
            )

            db.add(fee)
            db.commit()

            # Log fee assignment
            await AuditService.log(
                db=db,
                school_id=school_id,
                action="CREATE",
                resource_type="Fee",
                resource_id=fee.id,
                user_id=current_user.id,
                description=f"Assigned fee to student {student.admission_number}"
            )

            assigned_count += 1

        except Exception as e:
            failed_students.append({
                "student_id": str(student_id),
                "reason": str(e)
            })

    return {
        "success": True,
        "assigned_count": assigned_count,
        "failed_count": len(failed_students),
        "failed_students": failed_students
    }


@router.post("/send-sms")
async def bulk_send_sms(
    request: BulkSMSRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Send SMS to multiple recipients.
    Only accessible by ADMIN and SUPERADMIN roles.
    NOTE: This is a simplified implementation. In production, integrate with SMS gateway.
    """
    if current_user.role not in ["ADMIN", "SUPERADMIN"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    school_id = current_user.school_id
    if not school_id:
        raise HTTPException(status_code=400, detail="User must be associated with a school")

    # Get recipient count based on type
    recipient_count = 0

    if request.recipient_type == "students":
        if request.recipient_ids:
            recipient_count = len(request.recipient_ids)
        else:
            recipient_count = db.query(func.count(Student.id)).filter(
                Student.school_id == school_id,
                Student.status == "ACTIVE"
            ).scalar()

    # In production, this would:
    # 1. Queue the SMS sending to a background task
    # 2. Integrate with SMS gateway API
    # 3. Track delivery status
    # 4. Handle failures and retries

    # Log SMS broadcast
    await AuditService.log(
        db=db,
        school_id=school_id,
        action="SEND_SMS",
        resource_type="Communication",
        user_id=current_user.id,
        description=f"Bulk SMS sent to {recipient_count} {request.recipient_type}",
        new_value={
            "recipient_type": request.recipient_type,
            "recipient_count": recipient_count,
            "message_length": len(request.message)
        }
    )

    return {
        "success": True,
        "message": "SMS queued for sending",
        "recipient_count": recipient_count,
        "status": "queued"
    }


@router.post("/mark-attendance")
async def bulk_mark_attendance(
    request: BulkAttendanceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Mark attendance for multiple students in a class.
    Only accessible by TEACHER, ADMIN and SUPERADMIN roles.
    """
    if current_user.role not in ["TEACHER", "ADMIN", "SUPERADMIN"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    school_id = current_user.school_id
    if not school_id:
        raise HTTPException(status_code=400, detail="User must be associated with a school")

    # Verify class exists
    class_obj = db.query(Class).filter(
        Class.id == request.class_id,
        Class.school_id == school_id
    ).first()

    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")

    marked_count = 0
    failed_students = []

    from app.models.attendance import Attendance

    for student_id_str, status in request.student_statuses.items():
        try:
            student_id = uuid.UUID(student_id_str)

            # Check if attendance already marked
            existing = db.query(Attendance).filter(
                Attendance.student_id == student_id,
                Attendance.class_id == request.class_id,
                func.date(Attendance.date) == request.date.date()
            ).first()

            if existing:
                # Update existing
                existing.status = status
            else:
                # Create new
                attendance = Attendance(
                    id=uuid.uuid4(),
                    student_id=student_id,
                    class_id=request.class_id,
                    school_id=school_id,
                    date=request.date,
                    status=status
                )
                db.add(attendance)

            marked_count += 1

        except Exception as e:
            failed_students.append({
                "student_id": student_id_str,
                "reason": str(e)
            })

    db.commit()

    # Log bulk attendance
    await AuditService.log(
        db=db,
        school_id=school_id,
        action="BULK_ATTENDANCE",
        resource_type="Attendance",
        user_id=current_user.id,
        description=f"Bulk attendance marked for class {class_obj.name}",
        new_value={
            "class_id": str(request.class_id),
            "date": request.date.isoformat(),
            "marked_count": marked_count
        }
    )

    return {
        "success": True,
        "marked_count": marked_count,
        "failed_count": len(failed_students),
        "failed_students": failed_students
    }


@router.post("/generate-report-cards")
async def bulk_generate_report_cards(
    class_id: uuid.UUID,
    academic_year: str,
    exam_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate report cards for all students in a class.
    Only accessible by ADMIN and SUPERADMIN roles.
    This would be processed in the background.
    """
    if current_user.role not in ["ADMIN", "SUPERADMIN"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    school_id = current_user.school_id
    if not school_id:
        raise HTTPException(status_code=400, detail="User must be associated with a school")

    # Verify class exists
    class_obj = db.query(Class).filter(
        Class.id == class_id,
        Class.school_id == school_id
    ).first()

    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")

    # Get student count
    student_count = db.query(func.count(Student.id)).filter(
        Student.class_id == class_id,
        Student.status == "ACTIVE"
    ).scalar()

    # In production, this would queue a background job to:
    # 1. Fetch all students in the class
    # 2. Fetch their grades for the exam
    # 3. Generate PDF report cards
    # 4. Store them or email them

    # Log report card generation
    await AuditService.log(
        db=db,
        school_id=school_id,
        action="GENERATE_REPORT_CARDS",
        resource_type="ReportCard",
        user_id=current_user.id,
        description=f"Bulk report card generation initiated for class {class_obj.name}",
        new_value={
            "class_id": str(class_id),
            "exam_id": str(exam_id),
            "student_count": student_count
        }
    )

    return {
        "success": True,
        "message": "Report card generation queued",
        "student_count": student_count,
        "status": "queued"
    }
