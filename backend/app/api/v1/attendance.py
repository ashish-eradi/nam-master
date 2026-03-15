from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, extract
from typing import List, Optional
import uuid
from datetime import date, datetime
from calendar import monthrange
from app.core.database import get_db
from app.schemas.attendance_schema import (
    Attendance, AttendanceCreate, AttendanceUpdate, BulkAttendanceCreate,
    DailyAttendanceOverview, MonthlyAttendanceOverview,
    ClassAttendanceSummary, StudentAttendanceSummary
)
from app.models.attendance import Attendance as AttendanceModel
from app.models.student import Student as StudentModel
from app.models.class_model import Class as ClassModel
from app.core.permissions import is_admin, is_teacher, is_student, is_parent, is_admin_or_teacher
from app.api.deps import get_current_user, get_current_user_school
from app.models.user import User

router = APIRouter()

@router.post("/mark", response_model=Attendance, dependencies=[Depends(is_admin_or_teacher)])
def mark_attendance(attendance: AttendanceCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    student = db.query(StudentModel).filter(StudentModel.id == attendance.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    db_attendance = AttendanceModel(
        student_id=attendance.student_id,
        class_id=student.class_id,
        school_id=student.school_id,
        date=attendance.date,
        status=attendance.status,
        subject_id=attendance.subject_id,
        marked_by_user_id=current_user.id,
        remarks=attendance.remarks,
    )
    db.add(db_attendance)
    db.commit()
    db.refresh(db_attendance)
    return db_attendance

@router.get("/class/{class_id}/date/{date}", response_model=List[Attendance], dependencies=[Depends(is_admin_or_teacher)])
def get_class_attendance(class_id: uuid.UUID, date: date, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    return db.query(AttendanceModel).filter(
        AttendanceModel.class_id == class_id,
        AttendanceModel.date == date,
        AttendanceModel.school_id == school_id
    ).all()

@router.post("/bulk-mark", status_code=201, dependencies=[Depends(is_admin_or_teacher)])
def bulk_mark_attendance(bulk_data: BulkAttendanceCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    school_id = current_user.school_id
    if not school_id:
        raise HTTPException(status_code=403, detail="User is not associated with a school")

    for att_data in bulk_data.attendances:
        # Find existing record
        db_attendance = db.query(AttendanceModel).filter(
            AttendanceModel.student_id == uuid.UUID(att_data['student_id']),
            AttendanceModel.date == bulk_data.date,
            AttendanceModel.school_id == school_id
        ).first()

        if db_attendance:
            # Update existing record
            db_attendance.status = att_data['status']
        else:
            # Create new record
            db_attendance = AttendanceModel(
                student_id=uuid.UUID(att_data['student_id']),
                class_id=bulk_data.class_id,
                school_id=school_id,
                date=bulk_data.date,
                status=att_data['status'],
                marked_by_user_id=current_user.id,
            )
            db.add(db_attendance)
    
    db.commit()
    return {"detail": "Attendance marked successfully"}

@router.get("/student/{student_id}", response_model=List[Attendance], dependencies=[Depends(is_admin_or_teacher)]) # Should be more granular
def get_student_attendance(student_id: str, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    return db.query(AttendanceModel).filter(
        AttendanceModel.student_id == student_id,
        AttendanceModel.school_id == school_id
    ).all()

@router.get("/overview/daily", response_model=DailyAttendanceOverview, dependencies=[Depends(is_admin_or_teacher)])
def get_daily_attendance_overview(
    target_date: date = Query(default=None, description="Date for overview (defaults to today)"),
    class_id: Optional[uuid.UUID] = Query(default=None, description="Filter by specific class"),
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Get daily attendance overview with breakdown by class"""
    if target_date is None:
        target_date = date.today()

    # Base query for attendance on the target date
    base_query = db.query(AttendanceModel).filter(
        AttendanceModel.school_id == school_id,
        AttendanceModel.date == target_date
    )

    if class_id:
        base_query = base_query.filter(AttendanceModel.class_id == class_id)

    attendance_records = base_query.all()

    # Get all classes for the school
    classes_query = db.query(ClassModel).filter(ClassModel.school_id == school_id)
    if class_id:
        classes_query = classes_query.filter(ClassModel.id == class_id)
    classes = classes_query.all()

    # Calculate overall statistics
    total_present = sum(1 for r in attendance_records if r.status == 'P')
    total_absent = sum(1 for r in attendance_records if r.status == 'A')
    total_late = sum(1 for r in attendance_records if r.status == 'L')
    total_half_day = sum(1 for r in attendance_records if r.status == 'HL')
    total_marked = len(attendance_records)

    # Get total students count
    students_query = db.query(StudentModel).filter(StudentModel.school_id == school_id)
    if class_id:
        students_query = students_query.filter(StudentModel.class_id == class_id)
    total_students = students_query.count()

    attendance_percentage = (total_present / total_marked * 100) if total_marked > 0 else 0.0

    # Calculate by-class breakdown
    by_class = []
    for cls in classes:
        class_records = [r for r in attendance_records if str(r.class_id) == str(cls.id)]
        class_students = db.query(StudentModel).filter(StudentModel.class_id == cls.id).count()

        class_present = sum(1 for r in class_records if r.status == 'P')
        class_absent = sum(1 for r in class_records if r.status == 'A')
        class_late = sum(1 for r in class_records if r.status == 'L')
        class_half_day = sum(1 for r in class_records if r.status == 'HL')
        class_total = len(class_records)

        by_class.append(ClassAttendanceSummary(
            class_id=cls.id,
            class_name=cls.name,
            section=cls.section or "",
            total_students=class_students,
            present=class_present,
            absent=class_absent,
            late=class_late,
            half_day=class_half_day,
            attendance_percentage=(class_present / class_total * 100) if class_total > 0 else 0.0
        ))

    return DailyAttendanceOverview(
        date=target_date,
        total_students=total_students,
        present=total_present,
        absent=total_absent,
        late=total_late,
        half_day=total_half_day,
        attendance_percentage=attendance_percentage,
        by_class=by_class
    )

@router.get("/overview/monthly", response_model=MonthlyAttendanceOverview, dependencies=[Depends(is_admin_or_teacher)])
def get_monthly_attendance_overview(
    year: int = Query(default=None, description="Year (defaults to current year)"),
    month: int = Query(default=None, ge=1, le=12, description="Month (1-12, defaults to current month)"),
    class_id: Optional[uuid.UUID] = Query(default=None, description="Filter by specific class"),
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Get monthly attendance overview with breakdown by class and student"""
    if year is None:
        year = datetime.now().year
    if month is None:
        month = datetime.now().month

    # Get start and end dates for the month
    _, last_day = monthrange(year, month)
    start_date = date(year, month, 1)
    end_date = date(year, month, last_day)

    # Base query for attendance in the month
    base_query = db.query(AttendanceModel).filter(
        AttendanceModel.school_id == school_id,
        AttendanceModel.date >= start_date,
        AttendanceModel.date <= end_date
    )

    if class_id:
        base_query = base_query.filter(AttendanceModel.class_id == class_id)

    attendance_records = base_query.all()

    # Get unique dates with attendance (working days)
    working_days = len(set(r.date for r in attendance_records))

    # Get all classes for the school
    classes_query = db.query(ClassModel).filter(ClassModel.school_id == school_id)
    if class_id:
        classes_query = classes_query.filter(ClassModel.id == class_id)
    classes = classes_query.all()

    # Calculate by-class breakdown
    by_class = []
    for cls in classes:
        class_records = [r for r in attendance_records if str(r.class_id) == str(cls.id)]
        class_students = db.query(StudentModel).filter(StudentModel.class_id == cls.id).count()

        class_present = sum(1 for r in class_records if r.status == 'P')
        class_absent = sum(1 for r in class_records if r.status == 'A')
        class_late = sum(1 for r in class_records if r.status == 'L')
        class_half_day = sum(1 for r in class_records if r.status == 'HL')
        class_total = len(class_records)

        by_class.append(ClassAttendanceSummary(
            class_id=cls.id,
            class_name=cls.name,
            section=cls.section or "",
            total_students=class_students,
            present=class_present,
            absent=class_absent,
            late=class_late,
            half_day=class_half_day,
            attendance_percentage=(class_present / class_total * 100) if class_total > 0 else 0.0
        ))

    # Calculate by-student breakdown
    students_query = db.query(StudentModel).filter(StudentModel.school_id == school_id)
    if class_id:
        students_query = students_query.filter(StudentModel.class_id == class_id)
    students = students_query.all()

    by_student = []
    for student in students:
        student_records = [r for r in attendance_records if str(r.student_id) == str(student.id)]

        student_present = sum(1 for r in student_records if r.status == 'P')
        student_absent = sum(1 for r in student_records if r.status == 'A')
        student_late = sum(1 for r in student_records if r.status == 'L')
        student_half_day = sum(1 for r in student_records if r.status == 'HL')
        student_total = len(student_records)

        by_student.append(StudentAttendanceSummary(
            student_id=student.id,
            student_name=f"{student.first_name} {student.last_name}",
            roll_number=student.roll_number,
            present=student_present,
            absent=student_absent,
            late=student_late,
            half_day=student_half_day,
            total_days=student_total,
            attendance_percentage=(student_present / student_total * 100) if student_total > 0 else 0.0
        ))

    # Sort students by attendance percentage (lowest first to highlight issues)
    by_student.sort(key=lambda x: x.attendance_percentage)

    return MonthlyAttendanceOverview(
        year=year,
        month=month,
        total_working_days=working_days,
        by_class=by_class,
        by_student=by_student
    )
