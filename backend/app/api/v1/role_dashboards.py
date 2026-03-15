from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import Dict, Any, List
from datetime import datetime, timedelta
import uuid

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.class_model import Class
from app.models.attendance import Attendance
from app.models.finance import Payment, Fee, Fund
from app.models.exam import Exam
from app.models.grade import Grade


router = APIRouter()


@router.get("/principal")
def get_principal_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get dashboard data for Principal role.
    Shows comprehensive school overview.
    """
    if current_user.role not in ["ADMIN", "SUPERADMIN"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    school_id = current_user.school_id
    if not school_id:
        raise HTTPException(status_code=400, detail="User must be associated with a school")

    # Total students
    total_students = db.query(func.count(Student.id)).filter(
        Student.school_id == school_id,
        Student.status == "ACTIVE"
    ).scalar()

    # Total teachers
    total_teachers = db.query(func.count(Teacher.id)).filter(
        Teacher.school_id == school_id,
        Teacher.status == "ACTIVE"
    ).scalar()

    # Total classes
    total_classes = db.query(func.count(Class.id)).filter(
        Class.school_id == school_id
    ).scalar()

    # Today's attendance
    today = datetime.now().date()
    total_attendance_today = db.query(func.count(Attendance.id)).filter(
        Attendance.school_id == school_id,
        func.date(Attendance.date) == today
    ).scalar()

    present_today = db.query(func.count(Attendance.id)).filter(
        Attendance.school_id == school_id,
        func.date(Attendance.date) == today,
        Attendance.status == "PRESENT"
    ).scalar()

    attendance_percentage = (present_today / total_attendance_today * 100) if total_attendance_today > 0 else 0

    # Financial summary - Current month
    first_day_of_month = datetime.now().replace(day=1)
    total_payments_this_month = db.query(func.sum(Payment.amount)).filter(
        Payment.school_id == school_id,
        Payment.payment_date >= first_day_of_month,
        Payment.status == "COMPLETED"
    ).scalar() or 0

    total_dues = db.query(func.sum(Fee.amount)).filter(
        Fee.school_id == school_id,
        Fee.status == "PENDING"
    ).scalar() or 0

    # Recent activities (upcoming exams)
    upcoming_exams = db.query(Exam).filter(
        Exam.school_id == school_id,
        Exam.exam_date >= datetime.now()
    ).order_by(Exam.exam_date).limit(5).all()

    return {
        "overview": {
            "total_students": total_students,
            "total_teachers": total_teachers,
            "total_classes": total_classes
        },
        "attendance": {
            "today_total": total_attendance_today,
            "today_present": present_today,
            "today_percentage": round(attendance_percentage, 2)
        },
        "finance": {
            "payments_this_month": float(total_payments_this_month),
            "total_outstanding_dues": float(total_dues)
        },
        "upcoming_exams": [
            {
                "id": str(exam.id),
                "name": exam.name,
                "date": exam.exam_date.isoformat() if exam.exam_date else None,
                "class_id": str(exam.class_id) if exam.class_id else None
            }
            for exam in upcoming_exams
        ]
    }


@router.get("/accountant")
def get_accountant_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get dashboard data for Accountant role.
    Shows detailed financial metrics.
    """
    if current_user.role not in ["ACCOUNTANT", "ADMIN", "SUPERADMIN"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    school_id = current_user.school_id
    if not school_id:
        raise HTTPException(status_code=400, detail="User must be associated with a school")

    # Total revenue (all time)
    total_revenue = db.query(func.sum(Payment.amount)).filter(
        Payment.school_id == school_id,
        Payment.status == "COMPLETED"
    ).scalar() or 0

    # This month's revenue
    first_day_of_month = datetime.now().replace(day=1)
    monthly_revenue = db.query(func.sum(Payment.amount)).filter(
        Payment.school_id == school_id,
        Payment.payment_date >= first_day_of_month,
        Payment.status == "COMPLETED"
    ).scalar() or 0

    # Total outstanding dues
    total_dues = db.query(func.sum(Fee.amount)).filter(
        Fee.school_id == school_id,
        Fee.status == "PENDING"
    ).scalar() or 0

    # Fee collection by month (last 6 months)
    monthly_collections = []
    for i in range(6):
        month_start = (datetime.now().replace(day=1) - timedelta(days=i*30)).replace(day=1)
        month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(days=1)

        collection = db.query(func.sum(Payment.amount)).filter(
            Payment.school_id == school_id,
            Payment.payment_date >= month_start,
            Payment.payment_date <= month_end,
            Payment.status == "COMPLETED"
        ).scalar() or 0

        monthly_collections.append({
            "month": month_start.strftime("%B %Y"),
            "amount": float(collection)
        })

    # Recent payments
    recent_payments = db.query(Payment).filter(
        Payment.school_id == school_id
    ).order_by(Payment.payment_date.desc()).limit(10).all()

    # Pending fees count
    pending_fees_count = db.query(func.count(Fee.id)).filter(
        Fee.school_id == school_id,
        Fee.status == "PENDING"
    ).scalar()

    return {
        "summary": {
            "total_revenue": float(total_revenue),
            "monthly_revenue": float(monthly_revenue),
            "total_outstanding_dues": float(total_dues),
            "pending_fees_count": pending_fees_count
        },
        "monthly_collections": monthly_collections[::-1],  # Reverse to show oldest first
        "recent_payments": [
            {
                "id": str(payment.id),
                "amount": float(payment.amount),
                "payment_date": payment.payment_date.isoformat() if payment.payment_date else None,
                "payment_mode": payment.payment_mode,
                "status": payment.status
            }
            for payment in recent_payments
        ]
    }


@router.get("/teacher")
def get_teacher_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get dashboard data for Teacher role.
    Shows classes, attendance, and grading info.
    """
    if current_user.role not in ["TEACHER", "ADMIN", "SUPERADMIN"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    school_id = current_user.school_id
    if not school_id:
        raise HTTPException(status_code=400, detail="User must be associated with a school")

    # Get teacher record
    teacher = db.query(Teacher).filter(
        Teacher.user_id == current_user.id,
        Teacher.school_id == school_id
    ).first()

    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher record not found")

    # Classes taught (assuming teacher has class_teacher field or similar)
    # This would need to be adjusted based on actual schema
    my_classes = db.query(Class).filter(
        Class.school_id == school_id,
        Class.class_teacher_id == teacher.id
    ).all()

    total_students_in_classes = 0
    class_details = []

    for cls in my_classes:
        student_count = db.query(func.count(Student.id)).filter(
            Student.class_id == cls.id,
            Student.status == "ACTIVE"
        ).scalar()

        total_students_in_classes += student_count

        # Today's attendance for this class
        today = datetime.now().date()
        attendance_count = db.query(func.count(Attendance.id)).filter(
            Attendance.class_id == cls.id,
            func.date(Attendance.date) == today
        ).scalar()

        class_details.append({
            "id": str(cls.id),
            "name": cls.name,
            "section": cls.section,
            "student_count": student_count,
            "attendance_marked_today": attendance_count > 0
        })

    # Pending grading tasks
    pending_grades = db.query(func.count(Grade.id)).filter(
        Grade.school_id == school_id,
        Grade.status == "PENDING"
    ).scalar()

    # Upcoming exams for my classes
    class_ids = [cls.id for cls in my_classes]
    upcoming_exams = db.query(Exam).filter(
        Exam.school_id == school_id,
        Exam.class_id.in_(class_ids) if class_ids else False,
        Exam.exam_date >= datetime.now()
    ).order_by(Exam.exam_date).limit(5).all()

    return {
        "summary": {
            "total_classes": len(my_classes),
            "total_students": total_students_in_classes,
            "pending_grades": pending_grades
        },
        "my_classes": class_details,
        "upcoming_exams": [
            {
                "id": str(exam.id),
                "name": exam.name,
                "date": exam.exam_date.isoformat() if exam.exam_date else None,
                "class_id": str(exam.class_id) if exam.class_id else None
            }
            for exam in upcoming_exams
        ]
    }


@router.get("/registrar")
def get_registrar_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get dashboard data for Registrar role.
    Shows student enrollment and records.
    """
    if current_user.role not in ["REGISTRAR", "ADMIN", "SUPERADMIN"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    school_id = current_user.school_id
    if not school_id:
        raise HTTPException(status_code=400, detail="User must be associated with a school")

    # Total students
    total_students = db.query(func.count(Student.id)).filter(
        Student.school_id == school_id
    ).scalar()

    active_students = db.query(func.count(Student.id)).filter(
        Student.school_id == school_id,
        Student.status == "ACTIVE"
    ).scalar()

    # Recent enrollments (last 30 days)
    thirty_days_ago = datetime.now() - timedelta(days=30)
    recent_enrollments = db.query(func.count(Student.id)).filter(
        Student.school_id == school_id,
        Student.created_at >= thirty_days_ago
    ).scalar()

    # Students by class
    students_by_class = db.query(
        Class.name,
        func.count(Student.id).label('count')
    ).join(Student, Student.class_id == Class.id).filter(
        Class.school_id == school_id,
        Student.status == "ACTIVE"
    ).group_by(Class.name).all()

    # Recent student registrations
    recent_students = db.query(Student).filter(
        Student.school_id == school_id
    ).order_by(Student.created_at.desc()).limit(10).all()

    return {
        "summary": {
            "total_students": total_students,
            "active_students": active_students,
            "recent_enrollments": recent_enrollments
        },
        "students_by_class": [
            {
                "class_name": class_name,
                "student_count": count
            }
            for class_name, count in students_by_class
        ],
        "recent_students": [
            {
                "id": str(student.id),
                "admission_number": student.admission_number,
                "first_name": student.first_name,
                "last_name": student.last_name,
                "enrolled_date": student.created_at.isoformat() if student.created_at else None
            }
            for student in recent_students
        ]
    }
