from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from app.core.database import get_db
from app.core.permissions import is_admin, is_teacher, is_superadmin
from app.api.deps import get_current_user
from app.models.user import User
from app.models.student import Student as StudentModel
from app.models.teacher import Teacher as TeacherModel
from app.models.class_model import Class as ClassModel
from app.models.attendance import Attendance as AttendanceModel
from app.models.school import School as SchoolModel
from app.models.finance import Payment as PaymentModel, StudentFeeStructure as StudentFeeStructureModel
from datetime import date, datetime
from decimal import Decimal
from dateutil.relativedelta import relativedelta

router = APIRouter()

@router.get("/superadmin", dependencies=[Depends(is_superadmin)])
def get_superadmin_dashboard(db: Session = Depends(get_db)):
    total_schools = db.query(func.count(SchoolModel.id)).scalar()
    total_users = db.query(func.count(User.id)).scalar()
    total_students = db.query(func.count(StudentModel.id)).scalar()

    # Calculate system-wide revenue (total collected from all schools)
    total_revenue = db.query(func.sum(PaymentModel.amount_paid)).scalar() or 0

    return {
        "total_schools": total_schools,
        "total_users": total_users,
        "total_students": total_students,
        "system_wide_revenue": float(total_revenue),
    }

@router.get("/admin", dependencies=[Depends(is_admin)])
def get_admin_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    school_id = current_user.school_id

    total_students = db.query(func.count(StudentModel.id)).filter(StudentModel.school_id == school_id).scalar()
    total_teachers = db.query(func.count(TeacherModel.id)).filter(TeacherModel.school_id == school_id).scalar()
    total_classes = db.query(func.count(ClassModel.id)).filter(ClassModel.school_id == school_id).scalar()

    # Today's Attendance Rate
    today = date.today()
    present_count = db.query(func.count(AttendanceModel.id)).filter(
        AttendanceModel.school_id == school_id,
        AttendanceModel.date == today,
        AttendanceModel.status == 'P'
    ).scalar()
    total_marked = db.query(func.count(AttendanceModel.id)).filter(
        AttendanceModel.school_id == school_id,
        AttendanceModel.date == today
    ).scalar()
    attendance_rate = (present_count / total_marked) * 100 if total_marked > 0 else 0

    # Financial Metrics

    # Total outstanding fees across all students
    outstanding_fees_result = db.query(
        func.sum(StudentFeeStructureModel.outstanding_amount)
    ).join(
        StudentModel, StudentFeeStructureModel.student_id == StudentModel.id
    ).filter(
        StudentModel.school_id == school_id
    ).scalar()
    outstanding_fees = float(outstanding_fees_result) if outstanding_fees_result else 0.0

    # Today's collection
    today_collection_result = db.query(
        func.sum(PaymentModel.amount_paid)
    ).filter(
        PaymentModel.school_id == school_id,
        PaymentModel.payment_date == today
    ).scalar()
    today_collection = float(today_collection_result) if today_collection_result else 0.0

    # This month's collection
    first_day_of_month = today.replace(day=1)
    month_collection_result = db.query(
        func.sum(PaymentModel.amount_paid)
    ).filter(
        PaymentModel.school_id == school_id,
        PaymentModel.payment_date >= first_day_of_month,
        PaymentModel.payment_date <= today
    ).scalar()
    month_collection = float(month_collection_result) if month_collection_result else 0.0

    # Total expected fees for current academic year
    current_year = datetime.now().year
    academic_year = f"{current_year}-{str(current_year + 1)[-2:]}"

    total_expected_result = db.query(
        func.sum(StudentFeeStructureModel.final_amount)
    ).join(
        StudentModel, StudentFeeStructureModel.student_id == StudentModel.id
    ).filter(
        StudentModel.school_id == school_id,
        StudentFeeStructureModel.academic_year == academic_year
    ).scalar()
    total_expected = float(total_expected_result) if total_expected_result else 0.0

    # Total collected for current academic year
    total_collected_result = db.query(
        func.sum(StudentFeeStructureModel.amount_paid)
    ).join(
        StudentModel, StudentFeeStructureModel.student_id == StudentModel.id
    ).filter(
        StudentModel.school_id == school_id,
        StudentFeeStructureModel.academic_year == academic_year
    ).scalar()
    total_collected = float(total_collected_result) if total_collected_result else 0.0

    # Collection percentage
    collection_percentage = (total_collected / total_expected * 100) if total_expected > 0 else 0.0

    # Recent Activity — last 5 events across admissions, payments, staff additions
    recent_activity = []

    recent_students = db.query(StudentModel).filter(
        StudentModel.school_id == school_id
    ).order_by(StudentModel.created_at.desc()).limit(3).all()
    for s in recent_students:
        name = f"{s.first_name or ''} {s.last_name or ''}".strip() or "Student"
        recent_activity.append({
            "type": "admission",
            "title": "New Student Admitted",
            "description": f"{name} has been enrolled",
            "time": s.created_at.isoformat() if s.created_at else None,
        })

    recent_payments = db.query(PaymentModel).options(
        joinedload(PaymentModel.student)
    ).filter(
        PaymentModel.school_id == school_id
    ).order_by(PaymentModel.created_at.desc()).limit(3).all()
    for p in recent_payments:
        student_name = ""
        if p.student:
            student_name = f"{p.student.first_name or ''} {p.student.last_name or ''}".strip()
        recent_activity.append({
            "type": "payment",
            "title": "Fee Payment Received",
            "description": f"₹{float(p.amount_paid):,.0f} received" + (f" from {student_name}" if student_name else ""),
            "time": p.created_at.isoformat() if p.created_at else None,
        })

    recent_teachers = db.query(TeacherModel).options(
        joinedload(TeacherModel.user)
    ).filter(
        TeacherModel.school_id == school_id
    ).order_by(TeacherModel.created_at.desc()).limit(2).all()
    for t in recent_teachers:
        name = t.user.full_name if t.user else "Staff Member"
        recent_activity.append({
            "type": "teacher",
            "title": "New Staff Added",
            "description": f"{name} joined the team",
            "time": t.created_at.isoformat() if t.created_at else None,
        })

    recent_activity.sort(key=lambda x: x.get("time") or "", reverse=True)
    recent_activity = recent_activity[:5]

    return {
        "total_students": total_students,
        "total_teachers": total_teachers,
        "total_classes": total_classes,
        "attendance_rate": round(attendance_rate, 2),
        "outstanding_fees": round(outstanding_fees, 2),
        "today_collection": round(today_collection, 2),
        "month_collection": round(month_collection, 2),
        "total_expected": round(total_expected, 2),
        "total_collected": round(total_collected, 2),
        "collection_percentage": round(collection_percentage, 2),
        "recent_activity": recent_activity,
    }

@router.get("/teacher", dependencies=[Depends(is_teacher)])
def get_teacher_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.models.teacher import Teacher as TeacherModel
    from app.models.class_model import Class as ClassModel
    from app.models.attendance import Attendance as AttendanceModel

    school_id = current_user.school_id

    # Find the teacher record linked to this user
    teacher = db.query(TeacherModel).filter(TeacherModel.user_id == current_user.id).first()

    # Count classes assigned to this teacher
    assigned_classes_count = 0
    if teacher:
        assigned_classes_count = db.query(func.count(ClassModel.id)).filter(
            ClassModel.school_id == school_id,
            ClassModel.class_teacher_id == teacher.id
        ).scalar() or 0

    # Today's attendance marked by this teacher
    today = date.today()
    today_attendance_count = db.query(func.count(AttendanceModel.id)).filter(
        AttendanceModel.school_id == school_id,
        AttendanceModel.date == today,
        AttendanceModel.marked_by_user_id == current_user.id
    ).scalar() or 0

    # Total students in assigned classes
    total_students_in_classes = 0
    if teacher:
        from app.models.student import Student as StudentModel
        total_students_in_classes = db.query(func.count(StudentModel.id)).join(
            ClassModel, StudentModel.class_id == ClassModel.id
        ).filter(
            ClassModel.school_id == school_id,
            ClassModel.class_teacher_id == teacher.id
        ).scalar() or 0

    # Recent announcements for context
    from app.models.announcement import Announcement as AnnouncementModel
    recent_announcements = db.query(AnnouncementModel).filter(
        AnnouncementModel.school_id == school_id
    ).order_by(AnnouncementModel.created_at.desc()).limit(3).all()

    # Today's schedule for this teacher
    from app.models.timetable import TimetableEntry as TimetableEntryModel, Period as PeriodModel
    from app.models.class_model import Class as ClassModel
    from app.models.subject import Subject as SubjectModel
    today_weekday = date.today().weekday()  # 0=Mon, 6=Sun
    today_schedule = []
    if teacher:
        entries = db.query(TimetableEntryModel).options(
            joinedload(TimetableEntryModel.period),
            joinedload(TimetableEntryModel.class_),
            joinedload(TimetableEntryModel.subject),
        ).filter(
            TimetableEntryModel.teacher_id == teacher.id,
            TimetableEntryModel.day_of_week == today_weekday,
            TimetableEntryModel.school_id == school_id
        ).all()
        for entry in entries:
            period = entry.period
            cls = entry.class_
            subject = entry.subject
            today_schedule.append({
                "period_name": f"Period {period.period_number}" if period else "N/A",
                "start_time": str(period.start_time) if period else "N/A",
                "end_time": str(period.end_time) if period else "N/A",
                "class_name": cls.name if cls else "N/A",
                "subject_name": subject.name if subject else "N/A",
            })
        today_schedule.sort(key=lambda x: x["start_time"])

    return {
        "assigned_classes_count": assigned_classes_count,
        "total_students": total_students_in_classes,
        "today_attendance_marked": today_attendance_count,
        "teacher_name": current_user.full_name,
        "today_schedule": today_schedule,
        "recent_announcements": [
            {
                "title": a.title,
                "content": a.content[:100] if a.content else "",
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in recent_announcements
        ],
    }
