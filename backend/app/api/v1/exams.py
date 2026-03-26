from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, selectinload
from typing import List, Optional
import uuid
from datetime import date
from app.core.database import get_db
from app.schemas.exam_series_schema import (
    ExamSeries, ExamSeriesCreate, ExamSeriesUpdate,
    ExamTimetable, ExamTimetableCreate, ExamTimetableUpdate,
    ExamScheduleItem, ExamScheduleItemCreate, ExamScheduleItemUpdate,
    StudentExamMarks, StudentExamMarksCreate, StudentExamMarksUpdate,
    ExamSeriesWithTimetables, ExamTimetableWithSchedule, HallTicket,
    BulkSubjectMarks, StudentMarksSheet, ExamScheduleItemWithSubject
)
from app.models.exam_series import (
    ExamSeries as ExamSeriesModel,
    ExamTimetable as ExamTimetableModel,
    ExamScheduleItem as ExamScheduleItemModel,
    StudentExamMarks as StudentExamMarksModel
)
from app.models.class_model import Class as ClassModel
from app.models.subject import Subject as SubjectModel
from app.models.student import Student as StudentModel
from app.api.deps import get_current_user_school, get_current_user
from app.models.user import User
from app.core.utils import tenant_aware_query
from app.core.permissions import is_admin, is_admin_or_superadmin, is_admin_or_teacher

router = APIRouter()

def ensure_uuid(value):
    """Convert to UUID if string, otherwise return as-is"""
    return value if isinstance(value, uuid.UUID) else uuid.UUID(value)

# ===== ExamSeries Endpoints =====

@router.get("/exam-series", response_model=List[ExamSeries], dependencies=[Depends(is_admin_or_teacher)])
def list_exam_series(
    academic_year: Optional[str] = None,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """List all exam series for the school, optionally filtered by academic year."""
    query = tenant_aware_query(db, ExamSeriesModel, school_id)

    if academic_year:
        query = query.filter(ExamSeriesModel.academic_year == academic_year)

    return query.order_by(ExamSeriesModel.start_date.desc()).all()

@router.post("/exam-series", response_model=ExamSeries, dependencies=[Depends(is_admin)])
def create_exam_series(
    exam_series: ExamSeriesCreate,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school),
    current_user: User = Depends(get_current_user)
):
    """Create a new exam series."""
    school_uuid = ensure_uuid(school_id)
    if exam_series.school_id != school_uuid:
        raise HTTPException(status_code=403, detail="Cannot create exam series for another school")

    # Validate dates
    if exam_series.end_date < exam_series.start_date:
        raise HTTPException(status_code=400, detail="End date must be after start date")

    db_exam_series = ExamSeriesModel(
        **exam_series.model_dump(),
        created_by_user_id=current_user.id
    )
    db.add(db_exam_series)
    db.commit()
    db.refresh(db_exam_series)
    return db_exam_series

@router.put("/exam-series/{exam_series_id}", response_model=ExamSeries, dependencies=[Depends(is_admin)])
def update_exam_series(
    exam_series_id: uuid.UUID,
    exam_series: ExamSeriesUpdate,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Update an existing exam series."""
    db_exam_series = tenant_aware_query(db, ExamSeriesModel, school_id).filter(
        ExamSeriesModel.id == exam_series_id
    ).first()

    if not db_exam_series:
        raise HTTPException(status_code=404, detail="Exam series not found")

    update_data = exam_series.model_dump(exclude_unset=True)

    # Validate dates if both are being updated
    if 'start_date' in update_data and 'end_date' in update_data:
        if update_data['end_date'] < update_data['start_date']:
            raise HTTPException(status_code=400, detail="End date must be after start date")

    for key, value in update_data.items():
        setattr(db_exam_series, key, value)

    db.commit()
    db.refresh(db_exam_series)
    return db_exam_series

@router.get("/exam-series/{exam_series_id}", response_model=ExamSeriesWithTimetables, dependencies=[Depends(is_admin_or_teacher)])
def get_exam_series(
    exam_series_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Get a specific exam series with all its timetables."""
    exam_series = tenant_aware_query(db, ExamSeriesModel, school_id).options(
        selectinload(ExamSeriesModel.timetables).selectinload(ExamTimetableModel.schedule_items)
    ).filter(ExamSeriesModel.id == exam_series_id).first()

    if not exam_series:
        raise HTTPException(status_code=404, detail="Exam series not found")

    return exam_series

@router.delete("/exam-series/{exam_series_id}", status_code=204, dependencies=[Depends(is_admin)])
def delete_exam_series(
    exam_series_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Delete an exam series and all its timetables."""
    db_exam_series = tenant_aware_query(db, ExamSeriesModel, school_id).filter(
        ExamSeriesModel.id == exam_series_id
    ).first()

    if not db_exam_series:
        raise HTTPException(status_code=404, detail="Exam series not found")

    db.delete(db_exam_series)
    db.commit()
    return {"detail": "Exam series deleted successfully"}

# ===== ExamTimetable Endpoints =====

@router.get("/exam-series/{exam_series_id}/timetables", response_model=List[ExamTimetableWithSchedule], dependencies=[Depends(is_admin_or_teacher)])
def list_timetables_for_series(
    exam_series_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """List all timetables for an exam series."""
    # Verify exam series exists and belongs to school
    exam_series = tenant_aware_query(db, ExamSeriesModel, school_id).filter(
        ExamSeriesModel.id == exam_series_id
    ).first()

    if not exam_series:
        raise HTTPException(status_code=404, detail="Exam series not found")

    timetables = db.query(ExamTimetableModel).options(
        selectinload(ExamTimetableModel.schedule_items).selectinload(ExamScheduleItemModel.subject),
        selectinload(ExamTimetableModel.class_)
    ).filter(
        ExamTimetableModel.exam_series_id == exam_series_id
    ).all()

    # Build response with class names and subject details
    response = []
    for timetable in timetables:
        schedule_items_with_subject = []
        for item in timetable.schedule_items:
            schedule_items_with_subject.append({
                **item.__dict__,
                'subject_name': item.subject.name,
                'subject_code': item.subject.code
            })

        response.append({
            **timetable.__dict__,
            'class_name': timetable.class_.name,
            'schedule_items': schedule_items_with_subject
        })

    return response

@router.get("/timetables/{timetable_id}", response_model=ExamTimetableWithSchedule, dependencies=[Depends(is_admin_or_teacher)])
def get_timetable(
    timetable_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Get a specific timetable with schedule items."""
    timetable = tenant_aware_query(db, ExamTimetableModel, school_id).options(
        selectinload(ExamTimetableModel.schedule_items).selectinload(ExamScheduleItemModel.subject),
        selectinload(ExamTimetableModel.class_)
    ).filter(ExamTimetableModel.id == timetable_id).first()

    if not timetable:
        raise HTTPException(status_code=404, detail="Timetable not found")

    # Build response with subject details
    schedule_items_with_subject = []
    for item in timetable.schedule_items:
        schedule_items_with_subject.append({
            **item.__dict__,
            'subject_name': item.subject.name,
            'subject_code': item.subject.code
        })

    return {
        **timetable.__dict__,
        'class_name': timetable.class_.name,
        'schedule_items': schedule_items_with_subject
    }

@router.post("/timetables", response_model=ExamTimetable, dependencies=[Depends(is_admin)])
def create_timetable(
    timetable: ExamTimetableCreate,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Create a new exam timetable for a class."""
    if timetable.school_id != ensure_uuid(school_id):
        raise HTTPException(status_code=403, detail="Cannot create timetable for another school")

    # Verify exam series exists
    exam_series = tenant_aware_query(db, ExamSeriesModel, school_id).filter(
        ExamSeriesModel.id == timetable.exam_series_id
    ).first()

    if not exam_series:
        raise HTTPException(status_code=404, detail="Exam series not found")

    # Check if timetable already exists for this class and exam series
    existing = db.query(ExamTimetableModel).filter(
        ExamTimetableModel.exam_series_id == timetable.exam_series_id,
        ExamTimetableModel.class_id == timetable.class_id
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Timetable already exists for this class in this exam series"
        )

    # Create timetable
    schedule_items_data = timetable.schedule_items
    timetable_dict = timetable.model_dump(exclude={'schedule_items'})

    db_timetable = ExamTimetableModel(**timetable_dict)
    db.add(db_timetable)
    db.flush()

    # Create schedule items
    for item_data in schedule_items_data:
        # Validate exam date is within exam series date range
        if item_data.exam_date < exam_series.start_date or item_data.exam_date > exam_series.end_date:
            raise HTTPException(
                status_code=400,
                detail=f"Exam date {item_data.exam_date} is outside exam series date range"
            )

        db_schedule_item = ExamScheduleItemModel(
            **item_data.model_dump(),
            exam_timetable_id=db_timetable.id
        )
        db.add(db_schedule_item)

    db.commit()
    db.refresh(db_timetable)
    return db_timetable

@router.put("/timetables/{timetable_id}", response_model=ExamTimetable, dependencies=[Depends(is_admin)])
def update_timetable(
    timetable_id: uuid.UUID,
    timetable: ExamTimetableUpdate,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Update timetable instructions."""
    db_timetable = tenant_aware_query(db, ExamTimetableModel, school_id).filter(
        ExamTimetableModel.id == timetable_id
    ).first()

    if not db_timetable:
        raise HTTPException(status_code=404, detail="Timetable not found")

    update_data = timetable.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_timetable, key, value)

    db.commit()
    db.refresh(db_timetable)
    return db_timetable

@router.delete("/timetables/{timetable_id}", status_code=204, dependencies=[Depends(is_admin)])
def delete_timetable(
    timetable_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Delete a timetable and all its schedule items."""
    db_timetable = tenant_aware_query(db, ExamTimetableModel, school_id).filter(
        ExamTimetableModel.id == timetable_id
    ).first()

    if not db_timetable:
        raise HTTPException(status_code=404, detail="Timetable not found")

    db.delete(db_timetable)
    db.commit()
    return {"detail": "Timetable deleted successfully"}

# ===== ExamScheduleItem Endpoints =====

@router.post("/schedule-items", response_model=ExamScheduleItem, dependencies=[Depends(is_admin)])
def create_schedule_item(
    schedule_item: ExamScheduleItemCreate,
    timetable_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Add a schedule item to a timetable."""
    # Verify timetable exists
    timetable = tenant_aware_query(db, ExamTimetableModel, school_id).options(
        selectinload(ExamTimetableModel.exam_series)
    ).filter(ExamTimetableModel.id == timetable_id).first()

    if not timetable:
        raise HTTPException(status_code=404, detail="Timetable not found")

    # Validate exam date is within exam series date range
    if schedule_item.exam_date < timetable.exam_series.start_date or schedule_item.exam_date > timetable.exam_series.end_date:
        raise HTTPException(
            status_code=400,
            detail=f"Exam date {schedule_item.exam_date} is outside exam series date range"
        )

    db_schedule_item = ExamScheduleItemModel(
        **schedule_item.model_dump(),
        exam_timetable_id=timetable_id
    )
    db.add(db_schedule_item)
    db.commit()
    db.refresh(db_schedule_item)
    return db_schedule_item

@router.put("/schedule-items/{schedule_item_id}", response_model=ExamScheduleItem, dependencies=[Depends(is_admin)])
def update_schedule_item(
    schedule_item_id: uuid.UUID,
    schedule_item: ExamScheduleItemUpdate,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Update a schedule item."""
    db_schedule_item = db.query(ExamScheduleItemModel).join(
        ExamTimetableModel
    ).filter(
        ExamScheduleItemModel.id == schedule_item_id,
        ExamTimetableModel.school_id == ensure_uuid(school_id)
    ).first()

    if not db_schedule_item:
        raise HTTPException(status_code=404, detail="Schedule item not found")

    update_data = schedule_item.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_schedule_item, key, value)

    db.commit()
    db.refresh(db_schedule_item)
    return db_schedule_item

@router.delete("/schedule-items/{schedule_item_id}", status_code=204, dependencies=[Depends(is_admin)])
def delete_schedule_item(
    schedule_item_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Delete a schedule item."""
    db_schedule_item = db.query(ExamScheduleItemModel).join(
        ExamTimetableModel
    ).filter(
        ExamScheduleItemModel.id == schedule_item_id,
        ExamTimetableModel.school_id == ensure_uuid(school_id)
    ).first()

    if not db_schedule_item:
        raise HTTPException(status_code=404, detail="Schedule item not found")

    db.delete(db_schedule_item)
    db.commit()
    return {"detail": "Schedule item deleted successfully"}

# ===== Hall Ticket Endpoints =====

@router.get("/hall-tickets/exam-series/{exam_series_id}/student/{student_id}", response_model=HallTicket, dependencies=[Depends(is_admin_or_teacher)])
def get_hall_ticket(
    exam_series_id: uuid.UUID,
    student_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Generate hall ticket data for a student for a specific exam series."""
    # Get student
    student = tenant_aware_query(db, StudentModel, school_id).options(
        selectinload(StudentModel.class_)
    ).filter(StudentModel.id == student_id).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Get exam series
    exam_series = tenant_aware_query(db, ExamSeriesModel, school_id).filter(
        ExamSeriesModel.id == exam_series_id
    ).first()

    if not exam_series:
        raise HTTPException(status_code=404, detail="Exam series not found")

    # Get timetable for student's class
    timetable = db.query(ExamTimetableModel).options(
        selectinload(ExamTimetableModel.schedule_items).selectinload(ExamScheduleItemModel.subject)
    ).filter(
        ExamTimetableModel.exam_series_id == exam_series_id,
        ExamTimetableModel.class_id == student.class_id
    ).first()

    if not timetable:
        raise HTTPException(
            status_code=404,
            detail="No timetable found for this student's class in this exam series"
        )

    # Build schedule with subject details
    schedule = []
    for item in sorted(timetable.schedule_items, key=lambda x: x.exam_date):
        schedule.append({
            **item.__dict__,
            'subject_name': item.subject.name,
            'subject_code': item.subject.code
        })

    return {
        'student_id': student.id,
        'student_name': f"{student.first_name} {student.last_name}",
        'admission_number': student.admission_number,
        'class_name': student.class_.name,
        'father_name': student.father_name,
        'exam_series_name': exam_series.name,
        'exam_type': exam_series.exam_type,
        'start_date': exam_series.start_date,
        'end_date': exam_series.end_date,
        'schedule': schedule,
        'instructions': timetable.instructions,
        'student_photo_url': student.photo_url if hasattr(student, 'photo_url') else None
    }

@router.get("/hall-tickets/exam-series/{exam_series_id}/class/{class_id}", response_model=List[HallTicket], dependencies=[Depends(is_admin_or_teacher)])
def get_class_hall_tickets(
    exam_series_id: uuid.UUID,
    class_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Generate hall tickets for all students in a class for a specific exam series."""
    # Get all students in the class
    students = tenant_aware_query(db, StudentModel, school_id).options(
        selectinload(StudentModel.class_)
    ).filter(StudentModel.class_id == class_id).all()

    if not students:
        raise HTTPException(status_code=404, detail="No students found in this class")

    # Get exam series
    exam_series = tenant_aware_query(db, ExamSeriesModel, school_id).filter(
        ExamSeriesModel.id == exam_series_id
    ).first()

    if not exam_series:
        raise HTTPException(status_code=404, detail="Exam series not found")

    # Get timetable
    timetable = db.query(ExamTimetableModel).options(
        selectinload(ExamTimetableModel.schedule_items).selectinload(ExamScheduleItemModel.subject)
    ).filter(
        ExamTimetableModel.exam_series_id == exam_series_id,
        ExamTimetableModel.class_id == class_id
    ).first()

    if not timetable:
        raise HTTPException(
            status_code=404,
            detail="No timetable found for this class in this exam series"
        )

    # Build schedule with subject details
    schedule = []
    for item in sorted(timetable.schedule_items, key=lambda x: x.exam_date):
        schedule.append({
            **item.__dict__,
            'subject_name': item.subject.name,
            'subject_code': item.subject.code
        })

    # Generate hall tickets for all students
    hall_tickets = []
    for student in students:
        hall_tickets.append({
            'student_id': student.id,
            'student_name': f"{student.first_name} {student.last_name}",
            'admission_number': student.admission_number,
            'class_name': student.class_.name,
            'father_name': student.father_name,
            'exam_series_name': exam_series.name,
            'exam_type': exam_series.exam_type,
            'start_date': exam_series.start_date,
            'end_date': exam_series.end_date,
            'schedule': schedule,
            'instructions': timetable.instructions,
            'student_photo_url': student.photo_url if hasattr(student, 'photo_url') else None
        })

    return hall_tickets

# ===== Marks Entry Endpoints =====

@router.post("/marks", response_model=StudentExamMarks, dependencies=[Depends(is_admin_or_teacher)])
def create_student_marks(
    marks: StudentExamMarksCreate,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school),
    current_user: User = Depends(get_current_user)
):
    """Enter marks for a student for a specific subject exam."""
    # Verify schedule item exists
    schedule_item = db.query(ExamScheduleItemModel).join(
        ExamTimetableModel
    ).filter(
        ExamScheduleItemModel.id == marks.exam_schedule_item_id,
        ExamTimetableModel.school_id == ensure_uuid(school_id)
    ).first()

    if not schedule_item:
        raise HTTPException(status_code=404, detail="Exam schedule item not found")

    # Verify student exists
    student = tenant_aware_query(db, StudentModel, school_id).filter(
        StudentModel.id == marks.student_id
    ).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Validate marks if provided
    if marks.marks_obtained is not None and not marks.is_absent:
        if marks.marks_obtained < 0:
            raise HTTPException(status_code=400, detail="Marks cannot be negative")
        if marks.marks_obtained > schedule_item.max_marks:
            raise HTTPException(
                status_code=400,
                detail=f"Marks obtained ({marks.marks_obtained}) cannot exceed maximum marks ({schedule_item.max_marks})"
            )

    # Check if marks already exist
    existing = db.query(StudentExamMarksModel).filter(
        StudentExamMarksModel.student_id == marks.student_id,
        StudentExamMarksModel.exam_schedule_item_id == marks.exam_schedule_item_id
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Marks already entered for this student. Use update endpoint to modify."
        )

    db_marks = StudentExamMarksModel(
        **marks.model_dump(),
        entered_by_user_id=current_user.id
    )
    db.add(db_marks)
    db.commit()
    db.refresh(db_marks)
    return db_marks

@router.put("/marks/{marks_id}", response_model=StudentExamMarks, dependencies=[Depends(is_admin_or_teacher)])
def update_student_marks(
    marks_id: uuid.UUID,
    marks: StudentExamMarksUpdate,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Update marks for a student."""
    # Find marks with school verification
    db_marks = db.query(StudentExamMarksModel).join(
        ExamScheduleItemModel
    ).join(
        ExamTimetableModel
    ).filter(
        StudentExamMarksModel.id == marks_id,
        ExamTimetableModel.school_id == ensure_uuid(school_id)
    ).first()

    if not db_marks:
        raise HTTPException(status_code=404, detail="Marks record not found")

    update_data = marks.model_dump(exclude_unset=True)

    # Validate marks if being updated
    if 'marks_obtained' in update_data and update_data['marks_obtained'] is not None:
        is_absent = update_data.get('is_absent', db_marks.is_absent)
        if not is_absent:
            if update_data['marks_obtained'] < 0:
                raise HTTPException(status_code=400, detail="Marks cannot be negative")
            if update_data['marks_obtained'] > db_marks.exam_schedule_item.max_marks:
                raise HTTPException(
                    status_code=400,
                    detail=f"Marks obtained ({update_data['marks_obtained']}) cannot exceed maximum marks ({db_marks.exam_schedule_item.max_marks})"
                )

    for key, value in update_data.items():
        setattr(db_marks, key, value)

    db.commit()
    db.refresh(db_marks)
    return db_marks

@router.post("/marks/bulk", response_model=dict, dependencies=[Depends(is_admin_or_teacher)])
def bulk_create_marks(
    bulk_marks: BulkSubjectMarks,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school),
    current_user: User = Depends(get_current_user)
):
    """Enter marks for multiple students in one subject at once."""
    # Verify schedule item exists
    schedule_item = db.query(ExamScheduleItemModel).join(
        ExamTimetableModel
    ).filter(
        ExamScheduleItemModel.id == bulk_marks.exam_schedule_item_id,
        ExamTimetableModel.school_id == ensure_uuid(school_id)
    ).first()

    if not schedule_item:
        raise HTTPException(status_code=404, detail="Exam schedule item not found")

    created_count = 0
    updated_count = 0
    errors = []

    for mark_entry in bulk_marks.marks:
        try:
            # Validate marks if provided
            if mark_entry.marks_obtained is not None and not mark_entry.is_absent:
                if mark_entry.marks_obtained < 0:
                    raise ValueError("Marks cannot be negative")
                if mark_entry.marks_obtained > schedule_item.max_marks:
                    raise ValueError(f"Marks obtained ({mark_entry.marks_obtained}) cannot exceed maximum marks ({schedule_item.max_marks})")

            # Check if marks already exist
            existing = db.query(StudentExamMarksModel).filter(
                StudentExamMarksModel.student_id == mark_entry.student_id,
                StudentExamMarksModel.exam_schedule_item_id == bulk_marks.exam_schedule_item_id
            ).first()

            if existing:
                # Update existing marks
                existing.marks_obtained = mark_entry.marks_obtained
                existing.grade_letter = mark_entry.grade_letter
                existing.is_absent = mark_entry.is_absent
                existing.remarks = mark_entry.remarks
                updated_count += 1
            else:
                # Create new marks
                db_marks = StudentExamMarksModel(
                    student_id=mark_entry.student_id,
                    exam_schedule_item_id=bulk_marks.exam_schedule_item_id,
                    marks_obtained=mark_entry.marks_obtained,
                    grade_letter=mark_entry.grade_letter,
                    is_absent=mark_entry.is_absent,
                    remarks=mark_entry.remarks,
                    entered_by_user_id=current_user.id
                )
                db.add(db_marks)
                created_count += 1

        except Exception as e:
            errors.append({
                'student_id': str(mark_entry.student_id),
                'error': str(e)
            })

    db.commit()

    return {
        'message': f'Marks processed successfully',
        'created_count': created_count,
        'updated_count': updated_count,
        'errors': errors
    }

@router.get("/marks/schedule-item/{schedule_item_id}", response_model=List[StudentExamMarks], dependencies=[Depends(is_admin_or_teacher)])
def get_marks_by_schedule_item(
    schedule_item_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Get all marks for a specific exam schedule item (subject exam)."""
    # Verify schedule item exists and belongs to school
    schedule_item = db.query(ExamScheduleItemModel).join(
        ExamTimetableModel
    ).filter(
        ExamScheduleItemModel.id == schedule_item_id,
        ExamTimetableModel.school_id == ensure_uuid(school_id)
    ).first()

    if not schedule_item:
        raise HTTPException(status_code=404, detail="Exam schedule item not found")

    marks = db.query(StudentExamMarksModel).filter(
        StudentExamMarksModel.exam_schedule_item_id == schedule_item_id
    ).all()

    return marks

@router.get("/marks/student/{student_id}/exam-series/{exam_series_id}", response_model=StudentMarksSheet, dependencies=[Depends(is_admin_or_teacher)])
def get_student_marks_sheet(
    student_id: uuid.UUID,
    exam_series_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Get complete marks sheet for a student for an exam series."""
    # Get student
    student = tenant_aware_query(db, StudentModel, school_id).options(
        selectinload(StudentModel.class_)
    ).filter(StudentModel.id == student_id).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Get exam series
    exam_series = tenant_aware_query(db, ExamSeriesModel, school_id).filter(
        ExamSeriesModel.id == exam_series_id
    ).first()

    if not exam_series:
        raise HTTPException(status_code=404, detail="Exam series not found")

    # Get timetable for student's class
    timetable = db.query(ExamTimetableModel).filter(
        ExamTimetableModel.exam_series_id == exam_series_id,
        ExamTimetableModel.class_id == student.class_id
    ).first()

    if not timetable:
        raise HTTPException(
            status_code=404,
            detail="No timetable found for this student's class in this exam series"
        )

    # Get all schedule items for this timetable
    schedule_items = db.query(ExamScheduleItemModel).filter(
        ExamScheduleItemModel.exam_timetable_id == timetable.id
    ).all()

    # Get marks for all schedule items
    marks = db.query(StudentExamMarksModel).filter(
        StudentExamMarksModel.student_id == student_id,
        StudentExamMarksModel.exam_schedule_item_id.in_([item.id for item in schedule_items])
    ).all()

    # Calculate totals
    total_marks_obtained = 0.0
    total_max_marks = 0.0

    for item in schedule_items:
        total_max_marks += float(item.max_marks)

        # Find corresponding marks
        student_marks = next((m for m in marks if m.exam_schedule_item_id == item.id), None)
        if student_marks and not student_marks.is_absent and student_marks.marks_obtained:
            total_marks_obtained += float(student_marks.marks_obtained)

    percentage = (total_marks_obtained / total_max_marks * 100) if total_max_marks > 0 else 0

    # Calculate overall grade (simple logic)
    if percentage >= 90:
        overall_grade = "A+"
    elif percentage >= 80:
        overall_grade = "A"
    elif percentage >= 70:
        overall_grade = "B+"
    elif percentage >= 60:
        overall_grade = "B"
    elif percentage >= 50:
        overall_grade = "C"
    elif percentage >= 40:
        overall_grade = "D"
    else:
        overall_grade = "F"

    return {
        'student_id': student.id,
        'student_name': f"{student.first_name} {student.last_name}",
        'admission_number': student.admission_number,
        'class_name': student.class_.name,
        'exam_series_name': exam_series.name,
        'exam_type': exam_series.exam_type,
        'marks': marks,
        'total_marks_obtained': total_marks_obtained,
        'total_max_marks': total_max_marks,
        'percentage': round(percentage, 2),
        'overall_grade': overall_grade
    }


# ===== Admit Card / Hall Ticket PDF Generation =====

@router.get("/hall-tickets/exam-series/{exam_series_id}/student/{student_id}/download", dependencies=[Depends(is_admin_or_teacher)])
def download_admit_card(
    exam_series_id: uuid.UUID,
    student_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Generate and download admit card PDF for a student."""
    from app.services.admit_card_service import AdmitCardService
    from app.models.school import School as SchoolModel

    # Get hall ticket data (reuse existing endpoint logic)
    student = tenant_aware_query(db, StudentModel, school_id).options(
        selectinload(StudentModel.class_)
    ).filter(StudentModel.id == student_id).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    exam_series = tenant_aware_query(db, ExamSeriesModel, school_id).filter(
        ExamSeriesModel.id == exam_series_id
    ).first()

    if not exam_series:
        raise HTTPException(status_code=404, detail="Exam series not found")

    timetable = db.query(ExamTimetableModel).options(
        selectinload(ExamTimetableModel.schedule_items).selectinload(ExamScheduleItemModel.subject)
    ).filter(
        ExamTimetableModel.exam_series_id == exam_series_id,
        ExamTimetableModel.class_id == student.class_id
    ).first()

    if not timetable:
        raise HTTPException(
            status_code=404,
            detail="No timetable found for this student's class in this exam series"
        )

    # Get school info
    school = db.query(SchoolModel).filter(SchoolModel.id == ensure_uuid(school_id)).first()
    school_name = school.name if school else "School"

    # Build schedule items
    schedule_items = []
    for item in sorted(timetable.schedule_items, key=lambda x: x.exam_date):
        schedule_items.append({
            'subject_name': item.subject.name,
            'exam_date': item.exam_date.strftime("%d-%b-%Y"),
            'start_time': item.start_time,
            'duration_minutes': item.duration_minutes,
            'max_marks': float(item.max_marks),
            'room_number': item.room_number or '-'
        })

    # Generate PDF
    pdf_buffer = AdmitCardService.generate_admit_card(
        student_name=f"{student.first_name} {student.last_name}",
        admission_number=student.admission_number,
        class_name=student.class_.name,
        father_name=student.father_name,
        exam_series_name=exam_series.name,
        exam_type=exam_series.exam_type,
        start_date=exam_series.start_date.strftime("%d-%b-%Y"),
        end_date=exam_series.end_date.strftime("%d-%b-%Y"),
        schedule_items=schedule_items,
        instructions=timetable.instructions,
        school_name=school_name,
        school_logo_path=None,  # Can be configured later
        student_photo_path=None  # Can be configured later
    )

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=admit_card_{student.admission_number}_{exam_series.name.replace(' ', '_')}.pdf"
        }
    )


@router.get("/hall-tickets/exam-series/{exam_series_id}/class/{class_id}/download-all", dependencies=[Depends(is_admin_or_teacher)])
def download_class_admit_cards(
    exam_series_id: uuid.UUID,
    class_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Generate and download admit cards for all students in a class as a merged PDF."""
    from app.services.admit_card_service import AdmitCardService
    from app.models.school import School as SchoolModel
    from PyPDF2 import PdfMerger
    from io import BytesIO

    # Get all students in the class
    students = tenant_aware_query(db, StudentModel, school_id).options(
        selectinload(StudentModel.class_)
    ).filter(StudentModel.class_id == class_id).order_by(StudentModel.admission_number).all()

    if not students:
        raise HTTPException(status_code=404, detail="No students found in this class")

    exam_series = tenant_aware_query(db, ExamSeriesModel, school_id).filter(
        ExamSeriesModel.id == exam_series_id
    ).first()

    if not exam_series:
        raise HTTPException(status_code=404, detail="Exam series not found")

    timetable = db.query(ExamTimetableModel).options(
        selectinload(ExamTimetableModel.schedule_items).selectinload(ExamScheduleItemModel.subject)
    ).filter(
        ExamTimetableModel.exam_series_id == exam_series_id,
        ExamTimetableModel.class_id == class_id
    ).first()

    if not timetable:
        raise HTTPException(
            status_code=404,
            detail="No timetable found for this class in this exam series"
        )

    # Get school info
    school = db.query(SchoolModel).filter(SchoolModel.id == ensure_uuid(school_id)).first()
    school_name = school.name if school else "School"

    # Build schedule items
    schedule_items = []
    for item in sorted(timetable.schedule_items, key=lambda x: x.exam_date):
        schedule_items.append({
            'subject_name': item.subject.name,
            'exam_date': item.exam_date.strftime("%d-%b-%Y"),
            'start_time': item.start_time,
            'duration_minutes': item.duration_minutes,
            'max_marks': float(item.max_marks),
            'room_number': item.room_number or '-'
        })

    # Merge PDFs for all students
    merger = PdfMerger()

    for student in students:
        pdf_buffer = AdmitCardService.generate_admit_card(
            student_name=f"{student.first_name} {student.last_name}",
            admission_number=student.admission_number,
            class_name=student.class_.name,
            father_name=student.father_name,
            exam_series_name=exam_series.name,
            exam_type=exam_series.exam_type,
            start_date=exam_series.start_date.strftime("%d-%b-%Y"),
            end_date=exam_series.end_date.strftime("%d-%b-%Y"),
            schedule_items=schedule_items,
            instructions=timetable.instructions,
            school_name=school_name,
            school_logo_path=None,
            student_photo_path=None
        )
        merger.append(pdf_buffer)

    # Write merged PDF to buffer
    merged_buffer = BytesIO()
    merger.write(merged_buffer)
    merger.close()
    merged_buffer.seek(0)

    class_name = students[0].class_.name if students else "class"

    return StreamingResponse(
        merged_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=admit_cards_{class_name}_{exam_series.name.replace(' ', '_')}.pdf"
        }
    )


# ===== Report Card PDF Generation =====

@router.get("/report-cards/student/{student_id}/exam-series/{exam_series_id}/download", dependencies=[Depends(is_admin_or_teacher)])
def download_report_card(
    student_id: uuid.UUID,
    exam_series_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Generate and download report card PDF for a student."""
    from app.services.report_card_service import ReportCardService
    from app.models.school import School as SchoolModel

    # Get student marks sheet data (reuse existing endpoint logic)
    student = tenant_aware_query(db, StudentModel, school_id).options(
        selectinload(StudentModel.class_)
    ).filter(StudentModel.id == student_id).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    exam_series = tenant_aware_query(db, ExamSeriesModel, school_id).filter(
        ExamSeriesModel.id == exam_series_id
    ).first()

    if not exam_series:
        raise HTTPException(status_code=404, detail="Exam series not found")

    timetable = db.query(ExamTimetableModel).filter(
        ExamTimetableModel.exam_series_id == exam_series_id,
        ExamTimetableModel.class_id == student.class_id
    ).first()

    if not timetable:
        raise HTTPException(
            status_code=404,
            detail="No timetable found for this student's class in this exam series"
        )

    # Get all schedule items and marks
    schedule_items = db.query(ExamScheduleItemModel).options(
        selectinload(ExamScheduleItemModel.subject)
    ).filter(
        ExamScheduleItemModel.exam_timetable_id == timetable.id
    ).all()

    marks = db.query(StudentExamMarksModel).filter(
        StudentExamMarksModel.student_id == student_id,
        StudentExamMarksModel.exam_schedule_item_id.in_([item.id for item in schedule_items])
    ).all()

    # Build marks data
    marks_data = []
    total_marks_obtained = 0.0
    total_max_marks = 0.0

    for item in sorted(schedule_items, key=lambda x: x.subject.name):
        total_max_marks += float(item.max_marks)

        student_marks = next((m for m in marks if m.exam_schedule_item_id == item.id), None)

        if student_marks:
            marks_data.append({
                'subject_name': item.subject.name,
                'max_marks': float(item.max_marks),
                'marks_obtained': float(student_marks.marks_obtained) if student_marks.marks_obtained else 0,
                'grade': student_marks.grade_letter or '-',
                'is_absent': student_marks.is_absent
            })
            if not student_marks.is_absent and student_marks.marks_obtained:
                total_marks_obtained += float(student_marks.marks_obtained)
        else:
            marks_data.append({
                'subject_name': item.subject.name,
                'max_marks': float(item.max_marks),
                'marks_obtained': 0,
                'grade': '-',
                'is_absent': False
            })

    percentage = (total_marks_obtained / total_max_marks * 100) if total_max_marks > 0 else 0

    # Calculate overall grade
    if percentage >= 90:
        overall_grade = "A+"
    elif percentage >= 80:
        overall_grade = "A"
    elif percentage >= 70:
        overall_grade = "B+"
    elif percentage >= 60:
        overall_grade = "B"
    elif percentage >= 50:
        overall_grade = "C"
    elif percentage >= 40:
        overall_grade = "D"
    else:
        overall_grade = "F"

    # Get father name from parent relation
    from app.models.parent import ParentStudentRelation as ParentStudentRelationModel
    from sqlalchemy.orm import joinedload as _jl
    father_name = None
    p_rel = db.query(ParentStudentRelationModel).options(
        _jl(ParentStudentRelationModel.parent)
    ).filter(ParentStudentRelationModel.student_id == student_id).first()
    if p_rel and p_rel.parent:
        father_name = p_rel.parent.father_name

    # Calculate attendance for the academic year
    from app.models.attendance import Attendance as AttendanceModel
    from sqlalchemy import func as _func
    working_days = None
    present_days = None
    attendance_pct = None
    try:
        acad_year = exam_series.academic_year  # e.g. "2024-25"
        start_yr = int(acad_year.split("-")[0])
        acad_start = date(start_yr, 4, 1)
        acad_end = date(start_yr + 1, 3, 31)
        # Working days = distinct dates with any attendance record for the class
        wd_q = db.query(_func.count(_func.distinct(AttendanceModel.date))).filter(
            AttendanceModel.class_id == student.class_id,
            AttendanceModel.date >= acad_start,
            AttendanceModel.date <= acad_end
        ).scalar()
        # Present days = dates student was P, L, or HL
        pd_q = db.query(_func.count(AttendanceModel.id)).filter(
            AttendanceModel.student_id == student_id,
            AttendanceModel.date >= acad_start,
            AttendanceModel.date <= acad_end,
            AttendanceModel.status.in_(["P", "L", "HL"])
        ).scalar()
        working_days = wd_q or 0
        present_days = pd_q or 0
        attendance_pct = (present_days / working_days * 100) if working_days > 0 else None
    except Exception:
        pass

    # Get school info and print settings
    school = db.query(SchoolModel).filter(SchoolModel.id == ensure_uuid(school_id)).first()
    school_name = school.name if school else "School"
    rc_print_settings = (school.settings or {}).get('print', {}).get('report_card', {}) if school else {}

    # Generate PDF
    pdf_buffer = ReportCardService.generate_report_card(
        student_name=f"{student.first_name} {student.last_name}",
        admission_number=student.admission_number,
        class_name=student.class_.name,
        section=getattr(student.class_, 'section', None),
        father_name=father_name,
        date_of_birth=student.date_of_birth,
        roll_number=student.roll_number,
        hall_ticket_number=None,
        exam_series_name=exam_series.name,
        exam_type=exam_series.exam_type,
        academic_year=exam_series.academic_year,
        marks_data=marks_data,
        total_marks_obtained=total_marks_obtained,
        total_max_marks=total_max_marks,
        percentage=percentage,
        overall_grade=overall_grade,
        working_days=working_days,
        present_days=present_days,
        attendance_percentage=attendance_pct,
        teacher_remarks=None,
        school_name=school_name,
        school_logo_path=None,
        print_settings=rc_print_settings,
    )

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=report_card_{student.admission_number}_{exam_series.name.replace(' ', '_')}.pdf"
        }
    )


@router.get("/report-cards/exam-series/{exam_series_id}/class/{class_id}/download-all", dependencies=[Depends(is_admin_or_teacher)])
def download_class_report_cards(
    exam_series_id: uuid.UUID,
    class_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Generate and download report cards for all students in a class as a merged PDF."""
    from app.services.report_card_service import ReportCardService
    from app.models.school import School as SchoolModel
    from PyPDF2 import PdfMerger
    from io import BytesIO

    # Get all students in the class
    students = tenant_aware_query(db, StudentModel, school_id).options(
        selectinload(StudentModel.class_)
    ).filter(StudentModel.class_id == class_id).order_by(StudentModel.admission_number).all()

    if not students:
        raise HTTPException(status_code=404, detail="No students found in this class")

    exam_series = tenant_aware_query(db, ExamSeriesModel, school_id).filter(
        ExamSeriesModel.id == exam_series_id
    ).first()

    if not exam_series:
        raise HTTPException(status_code=404, detail="Exam series not found")

    timetable = db.query(ExamTimetableModel).filter(
        ExamTimetableModel.exam_series_id == exam_series_id,
        ExamTimetableModel.class_id == class_id
    ).first()

    if not timetable:
        raise HTTPException(
            status_code=404,
            detail="No timetable found for this class in this exam series"
        )

    # Pre-fetch all schedule items with subjects once
    schedule_items = db.query(ExamScheduleItemModel).options(
        selectinload(ExamScheduleItemModel.subject)
    ).filter(
        ExamScheduleItemModel.exam_timetable_id == timetable.id
    ).all()

    # Pre-fetch all marks for the class in one query
    all_marks = db.query(StudentExamMarksModel).filter(
        StudentExamMarksModel.exam_schedule_item_id.in_([item.id for item in schedule_items])
    ).all()

    # Pre-fetch all father names in one query
    from app.models.parent import ParentStudentRelation as ParentStudentRelationModel
    from sqlalchemy.orm import joinedload as _jl
    student_ids = [s.id for s in students]
    parent_rels = db.query(ParentStudentRelationModel).options(
        _jl(ParentStudentRelationModel.parent)
    ).filter(ParentStudentRelationModel.student_id.in_(student_ids)).all()
    father_names = {
        str(r.student_id): r.parent.father_name
        for r in parent_rels if r.parent and r.parent.father_name
    }

    # Get school info and print settings
    school = db.query(SchoolModel).filter(SchoolModel.id == ensure_uuid(school_id)).first()
    school_name = school.name if school else "School"
    rc_print_settings = (school.settings or {}).get('print', {}).get('report_card', {}) if school else {}

    class_obj = students[0].class_ if students else None
    class_name = class_obj.name if class_obj else "class"
    section = getattr(class_obj, 'section', None)

    # Pre-calculate attendance for the academic year for all students
    from app.models.attendance import Attendance as AttendanceModel
    from sqlalchemy import func as _func
    try:
        acad_year = exam_series.academic_year
        start_yr = int(acad_year.split("-")[0])
        acad_start = date(start_yr, 4, 1)
        acad_end = date(start_yr + 1, 3, 31)
        working_days_count = db.query(_func.count(_func.distinct(AttendanceModel.date))).filter(
            AttendanceModel.class_id == class_id,
            AttendanceModel.date >= acad_start,
            AttendanceModel.date <= acad_end
        ).scalar() or 0
        # Get present days per student
        from sqlalchemy import case as _case
        student_attendance = db.query(
            AttendanceModel.student_id,
            _func.count(AttendanceModel.id).label("present_count")
        ).filter(
            AttendanceModel.student_id.in_(student_ids),
            AttendanceModel.date >= acad_start,
            AttendanceModel.date <= acad_end,
            AttendanceModel.status.in_(["P", "L", "HL"])
        ).group_by(AttendanceModel.student_id).all()
        present_by_student = {str(r.student_id): r.present_count for r in student_attendance}
    except Exception:
        working_days_count = 0
        present_by_student = {}

    # Merge PDFs for all students
    merger = PdfMerger()
    generated_count = 0

    for student in students:
        student_marks = [m for m in all_marks if m.student_id == student.id]

        marks_data = []
        total_marks_obtained = 0.0
        total_max_marks = 0.0

        for item in sorted(schedule_items, key=lambda x: x.subject.name):
            total_max_marks += float(item.max_marks)
            mark = next((m for m in student_marks if m.exam_schedule_item_id == item.id), None)
            if mark:
                marks_data.append({
                    'subject_name': item.subject.name,
                    'max_marks': float(item.max_marks),
                    'marks_obtained': float(mark.marks_obtained) if mark.marks_obtained else 0,
                    'grade': mark.grade_letter or '-',
                    'is_absent': mark.is_absent
                })
                if not mark.is_absent and mark.marks_obtained:
                    total_marks_obtained += float(mark.marks_obtained)
            else:
                marks_data.append({
                    'subject_name': item.subject.name,
                    'max_marks': float(item.max_marks),
                    'marks_obtained': 0,
                    'grade': '-',
                    'is_absent': False
                })

        percentage = (total_marks_obtained / total_max_marks * 100) if total_max_marks > 0 else 0

        if percentage >= 90:
            overall_grade = "A+"
        elif percentage >= 80:
            overall_grade = "A"
        elif percentage >= 70:
            overall_grade = "B+"
        elif percentage >= 60:
            overall_grade = "B"
        elif percentage >= 50:
            overall_grade = "C"
        elif percentage >= 40:
            overall_grade = "D"
        else:
            overall_grade = "F"

        present_days = present_by_student.get(str(student.id), 0)
        att_pct = (present_days / working_days_count * 100) if working_days_count > 0 else None

        pdf_buffer = ReportCardService.generate_report_card(
            student_name=f"{student.first_name} {student.last_name}",
            admission_number=student.admission_number,
            class_name=class_name,
            section=section,
            father_name=father_names.get(str(student.id)),
            date_of_birth=student.date_of_birth,
            roll_number=student.roll_number,
            hall_ticket_number=None,
            exam_series_name=exam_series.name,
            exam_type=exam_series.exam_type,
            academic_year=exam_series.academic_year,
            marks_data=marks_data,
            total_marks_obtained=total_marks_obtained,
            total_max_marks=total_max_marks,
            percentage=percentage,
            overall_grade=overall_grade,
            working_days=working_days_count,
            present_days=present_days,
            attendance_percentage=att_pct,
            teacher_remarks=None,
            school_name=school_name,
            school_logo_path=None,
            print_settings=rc_print_settings,
        )
        merger.append(pdf_buffer)
        generated_count += 1

    if generated_count == 0:
        raise HTTPException(status_code=404, detail="No report cards could be generated")

    merged_buffer = BytesIO()
    merger.write(merged_buffer)
    merger.close()
    merged_buffer.seek(0)

    return StreamingResponse(
        merged_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=report_cards_{class_name.replace(' ', '_')}_{exam_series.name.replace(' ', '_')}.pdf"
        }
    )
