import uuid
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
import csv
import io
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import desc, cast, Integer, func as sql_func
from typing import List, List as TypingList, Optional
from pydantic import BaseModel, validator
from app.core.database import get_db
from app.schemas.student import Student, StudentCreate, StudentUpdate
from app.models.student import Student as StudentModel
from app.core.permissions import is_admin, is_admin_or_teacher, is_student, is_parent
from app.core.utils import tenant_aware_query
from app.api.deps import get_current_user_school, get_current_user
from app.models.grade import Grade as GradeModel
from app.models.attendance import Attendance as AttendanceModel
from app.models.finance import Payment as PaymentModel
from app.schemas.grade_schema import Grade
from app.schemas.attendance_schema import Attendance
from app.models.user import User, User as UserModel
from app.core.security import hash_password
from app.models.enums import RollNumberAssignmentType, Gender
import logging

logger = logging.getLogger(__name__)

# ── Helpers ──────────────────────────────────────────────────────────────────

def _parse_date(value: str) -> Optional[date]:
    """Convert a CSV date string (YYYY-MM-DD or DD/MM/YYYY) to a date, or None."""
    if not value or not value.strip():
        return None
    for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y', '%m/%d/%Y'):
        try:
            return datetime.strptime(value.strip(), fmt).date()
        except ValueError:
            continue
    return None

def _parse_gender(value: str) -> Optional[Gender]:
    """Convert a CSV gender string to the Gender enum, or None."""
    if not value or not value.strip():
        return None
    normalised = value.strip().upper()
    # Accept MALE/FEMALE/OTHER and M/F/O
    aliases = {'M': 'MALE', 'F': 'FEMALE', 'O': 'OTHER'}
    normalised = aliases.get(normalised, normalised)
    try:
        return Gender[normalised]
    except KeyError:
        return None

router = APIRouter()

@router.get("", response_model=List[Student], dependencies=[Depends(is_admin_or_teacher)])
def read_students(db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    logger.info(f"Attempting to read students for school_id: {school_id}")

    query = db.query(StudentModel).options(selectinload(StudentModel.class_))
    if school_id:
        query = query.filter(StudentModel.school_id == school_id)

    students = query.all()
    logger.info(f"Found {len(students)} students for school_id: {school_id}")
    student_list = []
    for student in students:
        student_dict = student.__dict__.copy() # Use .copy() for safety
        # Students no longer have user accounts/email
        # Add class relationship if it exists
        if student.class_:
            student_dict['class_'] = student.class_
        student_list.append(student_dict)
    return student_list

@router.post("/bulk_import", dependencies=[Depends(is_admin)])
async def bulk_import_students(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school),
):
    from app.models.parent import Parent as ParentModel, ParentStudentRelation as ParentStudentRelationModel

    if not school_id:
        raise HTTPException(status_code=400, detail="School ID required for bulk import")

    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB.")

    try:
        # utf-8-sig strips the BOM automatically (Excel-saved CSV files add one)
        decoded_content = content.decode('utf-8-sig')
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File must be UTF-8 encoded.")

    csv_reader = csv.DictReader(io.StringIO(decoded_content))

    required_headers = {'admission_number', 'first_name', 'last_name'}
    actual_headers = set(csv_reader.fieldnames or [])
    logger.info(f"CSV headers received: {actual_headers}")
    if not csv_reader.fieldnames or not required_headers.issubset(actual_headers):
        missing = required_headers - actual_headers
        raise HTTPException(status_code=400, detail=f"CSV missing required columns: {', '.join(missing)}")

    students_created = 0
    errors = []
    school_uuid = uuid.UUID(str(school_id))

    for row_num, row in enumerate(csv_reader, start=2):
        # Use a savepoint so a per-row failure doesn't corrupt the session
        savepoint = db.begin_nested()
        try:
            admission_number = row.get('admission_number', '').strip()
            if not admission_number:
                errors.append(f"Row {row_num}: Admission number is required")
                savepoint.rollback()
                continue

            if db.query(StudentModel).filter(
                StudentModel.admission_number == admission_number,
                StudentModel.school_id == school_uuid,
            ).first():
                errors.append(f"Row {row_num}: Admission number '{admission_number}' already exists")
                savepoint.rollback()
                continue

            parent_email = row.get('parent_email', '').strip()
            father_name  = row.get('father_name', '').strip()
            father_phone = row.get('father_phone', '').strip()

            if not father_name:
                errors.append(f"Row {row_num}: father_name is required")
                savepoint.rollback()
                continue
            if not father_phone:
                errors.append(f"Row {row_num}: father_phone is required")
                savepoint.rollback()
                continue

            # ── Parse fields ──────────────────────────────────────────────
            admission_date = _parse_date(row.get('admission_date', '')) or date.today()
            dob            = _parse_date(row.get('date_of_birth', ''))
            gender         = _parse_gender(row.get('gender', ''))
            class_id_raw   = row.get('class_id', '').strip()
            class_uuid     = uuid.UUID(class_id_raw) if class_id_raw else None

            db_student = StudentModel(
                school_id        = school_uuid,
                admission_number = admission_number,
                first_name       = row.get('first_name', '').strip(),
                last_name        = row.get('last_name', '').strip(),
                date_of_birth    = dob,
                gender           = gender,
                admission_date   = admission_date,
                academic_year    = row.get('academic_year', '').strip() or None,
                class_id         = class_uuid,
                address          = row.get('address', '').strip() or None,
                area             = row.get('area', '').strip() or None,
                blood_group      = row.get('blood_group', '').strip() or None,
                aadhar_number    = row.get('aadhar_number', '').strip() or None,
            )
            db.add(db_student)
            db.flush()

            # ── Parent account ────────────────────────────────────────────
            if parent_email:
                existing_parent_user = db.query(UserModel).filter(UserModel.email == parent_email).first()
                if not existing_parent_user:
                    parent_user = UserModel(
                        email         = parent_email,
                        password_hash = hash_password("Parent@123"),
                        full_name     = f"Parent of {db_student.first_name}",
                        username      = parent_email.split('@')[0],
                        role          = "PARENT",
                        school_id     = school_uuid,
                        is_active     = True,
                        is_verified   = True,
                    )
                    db.add(parent_user)
                    db.flush()

                    parent_profile = ParentModel(
                        user_id      = parent_user.id,
                        school_id    = school_uuid,
                        father_name  = father_name,
                        father_phone = father_phone,
                        mother_name  = row.get('mother_name', '').strip() or None,
                        mother_phone = row.get('mother_phone', '').strip() or None,
                        address      = row.get('address', '').strip() or None,
                    )
                    db.add(parent_profile)
                    db.flush()
                else:
                    parent_profile = db.query(ParentModel).filter(
                        ParentModel.user_id == existing_parent_user.id
                    ).first()
            else:
                # No email — placeholder disabled user
                placeholder_email = f"noaccess_{uuid.uuid4().hex}@placeholder.internal"
                parent_user = UserModel(
                    email         = placeholder_email,
                    password_hash = hash_password("NoAccess@123"),
                    full_name     = f"Parent of {db_student.first_name}",
                    username      = f"parent_{uuid.uuid4().hex[:8]}",
                    role          = "PARENT",
                    school_id     = school_uuid,
                    is_active     = False,
                    is_verified   = False,
                )
                db.add(parent_user)
                db.flush()

                parent_profile = ParentModel(
                    user_id      = parent_user.id,
                    school_id    = school_uuid,
                    father_name  = father_name,
                    father_phone = father_phone,
                    mother_name  = row.get('mother_name', '').strip() or None,
                    mother_phone = row.get('mother_phone', '').strip() or None,
                    address      = row.get('address', '').strip() or None,
                )
                db.add(parent_profile)
                db.flush()

            if parent_profile:
                db.add(ParentStudentRelationModel(
                    parent_id         = parent_profile.id,
                    student_id        = db_student.id,
                    relationship_type = "PARENT",
                ))

            savepoint.commit()
            students_created += 1

        except Exception as e:
            savepoint.rollback()
            errors.append(f"Row {row_num}: {str(e)}")
            continue

    db.commit()

    return {
        "message": f"Successfully imported {students_created} student(s)",
        "students_created": students_created,
        "errors": errors if errors else None,
    }

@router.get("/export", dependencies=[Depends(is_admin)])
def export_students(db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    from app.models.parent import ParentStudentRelation as ParentStudentRelationModel

    if not school_id:
        raise HTTPException(status_code=400, detail="School ID required for export")

    from app.models.parent import Parent as ParentModel
    students = db.query(StudentModel).options(
        joinedload(StudentModel.class_),
        selectinload(StudentModel.parents)
            .joinedload(ParentStudentRelationModel.parent)
            .joinedload(ParentModel.user),
    ).filter(StudentModel.school_id == school_id).all()

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        'admission_number', 'first_name', 'last_name', 'date_of_birth',
        'gender', 'admission_date', 'academic_year', 'class_id', 'class_name',
        'parent_email', 'father_name', 'father_phone', 'mother_name', 'mother_phone',
        'address', 'area', 'blood_group', 'aadhar_number',
    ])

    for student in students:
        # Get first linked parent profile (if any)
        parent_rel     = student.parents[0] if student.parents else None
        parent_profile = parent_rel.parent if parent_rel else None
        parent_user    = parent_profile.user if parent_profile else None

        writer.writerow([
            student.admission_number,
            student.first_name,
            student.last_name,
            student.date_of_birth or '',
            student.gender.value if student.gender else '',
            student.admission_date or '',
            student.academic_year or '',
            str(student.class_id) if student.class_id else '',
            student.class_.name if student.class_ else '',
            parent_user.email if parent_user else '',
            parent_profile.father_name if parent_profile else '',
            parent_profile.father_phone if parent_profile else '',
            parent_profile.mother_name if parent_profile else '',
            parent_profile.mother_phone if parent_profile else '',
            student.address or '',
            student.area or '',
            student.blood_group or '',
            student.aadhar_number or '',
        ])

    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=students_export.csv"},
    )

@router.post("", response_model=Student, dependencies=[Depends(is_admin)])
def create_student(student: StudentCreate, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    # Override school_id from token if not provided (or force it)
    if not student.school_id:
        if not school_id:
             raise HTTPException(status_code=400, detail="School ID required. Please provide it or log in as School Admin.")
        student.school_id = uuid.UUID(str(school_id))

    try:
        # Check if admission number already exists
        existing_student = db.query(StudentModel).filter(
            StudentModel.admission_number == student.admission_number,
            StudentModel.school_id == student.school_id
        ).first()
        if existing_student:
            raise HTTPException(status_code=400, detail=f"Admission number {student.admission_number} already exists")

        # Create student record (no user account!)
        student_data = student.model_dump(exclude={
            "create_parent_account", "parent_email", "parent_password",
            "parent_full_name", "father_name", "father_phone",
            "mother_name", "mother_phone"
        })
        db_student = StudentModel(**student_data)
        db.add(db_student)
        db.flush()
        db.refresh(db_student)

        # Create parent account
        try:
            from app.models.parent import Parent as ParentModel, ParentStudentRelation as ParentStudentRelationModel

            if student.parent_email:
                # Email provided — create/reuse a real login account
                existing_parent_user = db.query(UserModel).filter(UserModel.email == student.parent_email).first()

                if not existing_parent_user:
                    parent_user = UserModel(
                        email=student.parent_email,
                        password_hash=hash_password(student.parent_password or "Parent@123"),
                        full_name=student.parent_full_name or f"Parent of {student.first_name}",
                        username=student.parent_email.split('@')[0],
                        role="PARENT",
                        school_id=student.school_id,
                        is_active=True,
                        is_verified=True
                    )
                    db.add(parent_user)
                    db.flush()

                    parent_profile = ParentModel(
                        user_id=parent_user.id,
                        school_id=student.school_id,
                        father_name=student.father_name,
                        father_phone=student.father_phone,
                        mother_name=student.mother_name,
                        mother_phone=student.mother_phone,
                        address=student.address
                    )
                    db.add(parent_profile)
                    db.flush()
                else:
                    parent_profile = db.query(ParentModel).filter(
                        ParentModel.user_id == existing_parent_user.id
                    ).first()

                    if parent_profile:
                        if not parent_profile.father_name:
                            parent_profile.father_name = student.father_name
                        if not parent_profile.father_phone:
                            parent_profile.father_phone = student.father_phone
                        if student.mother_name and not parent_profile.mother_name:
                            parent_profile.mother_name = student.mother_name
                        if student.mother_phone and not parent_profile.mother_phone:
                            parent_profile.mother_phone = student.mother_phone
                        if student.address and not parent_profile.address:
                            parent_profile.address = student.address
            else:
                # No email — create a disabled placeholder user so the parent
                # profile can still be stored (user_id is NOT NULL)
                placeholder_email = f"noaccess_{uuid.uuid4().hex}@placeholder.internal"
                parent_user = UserModel(
                    email=placeholder_email,
                    password_hash=hash_password("NoAccess@123"),
                    full_name=student.parent_full_name or f"Parent of {student.first_name}",
                    username=f"parent_{uuid.uuid4().hex[:8]}",
                    role="PARENT",
                    school_id=student.school_id,
                    is_active=False,
                    is_verified=False,
                )
                db.add(parent_user)
                db.flush()

                parent_profile = ParentModel(
                    user_id=parent_user.id,
                    school_id=student.school_id,
                    father_name=student.father_name,
                    father_phone=student.father_phone,
                    mother_name=student.mother_name,
                    mother_phone=student.mother_phone,
                    address=student.address
                )
                db.add(parent_profile)
                db.flush()

            # Link parent to student (REQUIRED)
            if parent_profile:
                link = ParentStudentRelationModel(
                    parent_id=parent_profile.id,
                    student_id=db_student.id,
                    relationship_type="PARENT"
                )
                db.add(link)
            else:
                raise HTTPException(status_code=500, detail="Failed to create or find parent profile")

            logger.info(f"Parent account created and linked for student {db_student.id}")
        except Exception as e:
            logger.error(f"Error creating parent account: {str(e)}")
            db.rollback()
            raise HTTPException(
                status_code=400,
                detail=f"Failed to create parent account: {str(e)}. Student admission requires valid parent information."
            )

        db.commit()

        # Reload with relationships
        db_student = db.query(StudentModel).options(
            joinedload(StudentModel.class_)
        ).filter(StudentModel.id == db_student.id).first()

        student_dict = db_student.__dict__.copy()
        if db_student.class_:
            student_dict['class_'] = db_student.class_
        return student_dict

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating student: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create student: {str(e)}")

@router.get("/{student_id}", response_model=Student, dependencies=[Depends(is_admin_or_teacher)])
def read_student(student_id: uuid.UUID, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    student = db.query(StudentModel).options(joinedload(StudentModel.class_)).filter(StudentModel.id == student_id, StudentModel.school_id == school_id).first()
    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")
    student_dict = student.__dict__.copy()
    if student.class_:
        student_dict['class_'] = student.class_
    return student_dict

@router.put("/{student_id}", response_model=Student, dependencies=[Depends(is_admin)])
def update_student(student_id: uuid.UUID, student: StudentUpdate, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    db_student = db.query(StudentModel).options(joinedload(StudentModel.class_)).filter(StudentModel.id == student_id, StudentModel.school_id == school_id).first()
    if db_student is None:
        raise HTTPException(status_code=404, detail="Student not found")
    student_data = student.model_dump(exclude_unset=True)
    # Prevent school_id and id from being changed via API
    student_data.pop('school_id', None)
    student_data.pop('id', None)
    for key, value in student_data.items():
        setattr(db_student, key, value)
    db.commit()
    db.refresh(db_student)
    student_dict = db_student.__dict__.copy()
    if db_student.class_:
        student_dict['class_'] = db_student.class_
    return student_dict

@router.delete("/{student_id}", response_model=Student, dependencies=[Depends(is_admin)])
def delete_student(student_id: uuid.UUID, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    db_student = db.query(StudentModel).options(joinedload(StudentModel.class_)).filter(StudentModel.id == student_id, StudentModel.school_id == school_id).first()
    if db_student is None:
        raise HTTPException(status_code=404, detail="Student not found")
    student_dict = db_student.__dict__.copy()
    if db_student.class_:
        student_dict['class_'] = db_student.class_
    db.delete(db_student)
    db.commit()
    return student_dict

@router.get("/{student_id}/grades", response_model=List[Grade], dependencies=[Depends(is_student)]) # Or is_parent
def read_student_grades(student_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # In a real app, you would check if the current user is the student or the parent of the student
    return db.query(GradeModel).filter(GradeModel.student_id == uuid.UUID(student_id)).all()

@router.get("/{student_id}/attendance", response_model=List[Attendance], dependencies=[Depends(is_student)]) # Or is_parent
def read_student_attendance(student_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # In a real app, you would check if the current user is the student or the parent of the student
    return db.query(AttendanceModel).filter(AttendanceModel.student_id == uuid.UUID(student_id)).all()

@router.get("/{student_id}/payments", dependencies=[Depends(is_admin_or_teacher)])
def read_student_payments(student_id: uuid.UUID, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    """Get all payments for a specific student"""
    payments = db.query(PaymentModel).filter(
        PaymentModel.student_id == student_id,
        PaymentModel.school_id == uuid.UUID(str(school_id))
    ).order_by(desc(PaymentModel.payment_date)).all()
    return payments

@router.put("/{student_id}/transfer", response_model=Student, dependencies=[Depends(is_admin)])
def transfer_student(
    student_id: uuid.UUID,
    class_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Transfer a student to a different class"""
    db_student = db.query(StudentModel).filter(
        StudentModel.id == student_id,
        StudentModel.school_id == uuid.UUID(str(school_id))
    ).first()

    if not db_student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Verify the target class belongs to the same school
    from app.models.class_model import Class as ClassModel
    target_class = db.query(ClassModel).filter(
        ClassModel.id == class_id,
        ClassModel.school_id == uuid.UUID(str(school_id))
    ).first()

    if not target_class:
        raise HTTPException(status_code=404, detail="Target class not found")

    db_student.class_id = class_id
    db.commit()

    # Reload with relationships
    db_student = db.query(StudentModel).options(
        joinedload(StudentModel.class_)
    ).filter(StudentModel.id == student_id).first()

    student_dict = db_student.__dict__.copy()
    if db_student.class_:
        student_dict['class_'] = db_student.class_

    return student_dict

class BulkPromotionRequest(BaseModel):
    source_class_id: uuid.UUID
    target_class_id: uuid.UUID
    exclude_student_ids: Optional[TypingList[uuid.UUID]] = []
    demote_student_ids: Optional[TypingList[uuid.UUID]] = []
    demote_target_class_id: Optional[uuid.UUID] = None

@router.post("/bulk-promote", dependencies=[Depends(is_admin)])
def bulk_promote_students(
    promotion: BulkPromotionRequest,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Promote an entire class to the next class with options to exclude or demote specific students"""
    school_uuid = uuid.UUID(str(school_id))

    # Verify classes exist and belong to the same school
    from app.models.class_model import Class as ClassModel
    source_class = db.query(ClassModel).filter(
        ClassModel.id == promotion.source_class_id,
        ClassModel.school_id == school_uuid
    ).first()

    target_class = db.query(ClassModel).filter(
        ClassModel.id == promotion.target_class_id,
        ClassModel.school_id == school_uuid
    ).first()

    if not source_class:
        raise HTTPException(status_code=404, detail="Source class not found")
    if not target_class:
        raise HTTPException(status_code=404, detail="Target class not found")

    # Get all students in the source class
    students = db.query(StudentModel).filter(
        StudentModel.class_id == promotion.source_class_id,
        StudentModel.school_id == school_uuid
    ).all()

    promoted_count = 0
    demoted_count = 0
    excluded_count = 0

    for student in students:
        student_id = student.id

        # Check if student should be excluded (no change)
        if student_id in promotion.exclude_student_ids:
            excluded_count += 1
            continue

        # Check if student should be demoted
        if student_id in promotion.demote_student_ids:
            if not promotion.demote_target_class_id:
                raise HTTPException(status_code=400, detail="Demote target class ID required for demoted students")

            # Verify demote target class exists
            demote_class = db.query(ClassModel).filter(
                ClassModel.id == promotion.demote_target_class_id,
                ClassModel.school_id == school_uuid
            ).first()

            if not demote_class:
                raise HTTPException(status_code=404, detail="Demote target class not found")

            student.class_id = promotion.demote_target_class_id
            demoted_count += 1
        else:
            # Promote student to target class
            student.class_id = promotion.target_class_id
            promoted_count += 1

    db.commit()

    return {
        "message": "Bulk promotion completed successfully",
        "promoted_count": promoted_count,
        "demoted_count": demoted_count,
        "excluded_count": excluded_count,
        "total_students": len(students)
    }

class AssignRollNumberRequest(BaseModel):
    student_id: uuid.UUID
    assignment_type: str
    manual_roll_number: Optional[str] = None

    @validator('assignment_type')
    def validate_assignment_type(cls, v):
        valid_types = [t.value for t in RollNumberAssignmentType]
        if v not in valid_types:
            raise ValueError(f'assignment_type must be one of {valid_types}')
        return v

class BulkAssignRollNumberRequest(BaseModel):
    class_id: uuid.UUID
    assignment_type: str

    @validator('assignment_type')
    def validate_assignment_type(cls, v):
        valid_types = [t.value for t in RollNumberAssignmentType]
        if v not in valid_types:
            raise ValueError(f'assignment_type must be one of {valid_types}')
        return v

def generate_auto_roll_number(db: Session, class_id: uuid.UUID, school_id: uuid.UUID, assignment_type: str, gender: str = None) -> str:
    """Generate automatic roll number based on assignment type"""

    # Count ALL students with this assignment type (regardless of gender)
    # because AUTO_BOYS and AUTO_GIRLS assign to both genders in preference order
    count = db.query(StudentModel).filter(
        StudentModel.class_id == class_id,
        StudentModel.school_id == school_id,
        StudentModel.roll_number_assignment_type == RollNumberAssignmentType[assignment_type],
        StudentModel.roll_number.isnot(None)
    ).count()
    next_number = count + 1

    # Format roll number without any prefix
    return f"{next_number:03d}"

@router.post("/assign-roll-number", dependencies=[Depends(is_admin)])
def assign_roll_number(
    request: AssignRollNumberRequest,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Assign roll number to a student based on assignment type"""
    school_uuid = uuid.UUID(str(school_id))

    # Get the student
    student = db.query(StudentModel).filter(
        StudentModel.id == request.student_id,
        StudentModel.school_id == school_uuid
    ).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if not student.class_id:
        raise HTTPException(status_code=400, detail="Student must be assigned to a class first")

    # Handle manual assignment
    if request.assignment_type == RollNumberAssignmentType.MANUAL.value:
        if not request.manual_roll_number:
            raise HTTPException(status_code=400, detail="Manual roll number is required for MANUAL assignment type")

        # Check if roll number already exists in the class
        existing = db.query(StudentModel).filter(
            StudentModel.class_id == student.class_id,
            StudentModel.school_id == school_uuid,
            StudentModel.roll_number == request.manual_roll_number,
            StudentModel.id != request.student_id
        ).first()

        if existing:
            raise HTTPException(status_code=400, detail=f"Roll number {request.manual_roll_number} already exists in this class")

        student.roll_number = request.manual_roll_number
        student.roll_number_assignment_type = RollNumberAssignmentType.MANUAL

    else:
        # Validate gender for boys/girls assignment
        if request.assignment_type == RollNumberAssignmentType.AUTO_BOYS.value:
            if student.gender != Gender.MALE.value:
                raise HTTPException(status_code=400, detail="AUTO_BOYS assignment type can only be used for male students")
        elif request.assignment_type == RollNumberAssignmentType.AUTO_GIRLS.value:
            if student.gender != Gender.FEMALE.value:
                raise HTTPException(status_code=400, detail="AUTO_GIRLS assignment type can only be used for female students")

        # Generate automatic roll number
        roll_number = generate_auto_roll_number(
            db,
            student.class_id,
            school_uuid,
            request.assignment_type,
            student.gender
        )

        student.roll_number = roll_number
        student.roll_number_assignment_type = RollNumberAssignmentType[request.assignment_type]

    db.commit()
    db.refresh(student)

    return {
        "message": "Roll number assigned successfully",
        "student_id": str(student.id),
        "roll_number": student.roll_number,
        "assignment_type": student.roll_number_assignment_type.value
    }

@router.post("/bulk-assign-roll-numbers", dependencies=[Depends(is_admin)])
def bulk_assign_roll_numbers(
    request: BulkAssignRollNumberRequest,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Assign roll numbers to all students in a class based on assignment type"""
    school_uuid = uuid.UUID(str(school_id))

    # Verify class exists
    from app.models.class_model import Class as ClassModel
    class_obj = db.query(ClassModel).filter(
        ClassModel.id == request.class_id,
        ClassModel.school_id == school_uuid
    ).first()

    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")

    # Get all students in the class without roll numbers
    # For AUTO_BOYS and AUTO_GIRLS, we get ALL students but order them by gender preference
    if request.assignment_type == RollNumberAssignmentType.AUTO_BOYS.value:
        # Boys first, then girls
        boys = db.query(StudentModel).filter(
            StudentModel.class_id == request.class_id,
            StudentModel.school_id == school_uuid,
            StudentModel.gender == Gender.MALE.value,
            StudentModel.roll_number.is_(None)
        ).order_by(StudentModel.first_name, StudentModel.last_name).all()

        girls = db.query(StudentModel).filter(
            StudentModel.class_id == request.class_id,
            StudentModel.school_id == school_uuid,
            StudentModel.gender == Gender.FEMALE.value,
            StudentModel.roll_number.is_(None)
        ).order_by(StudentModel.first_name, StudentModel.last_name).all()

        students = boys + girls

    elif request.assignment_type == RollNumberAssignmentType.AUTO_GIRLS.value:
        # Girls first, then boys
        girls = db.query(StudentModel).filter(
            StudentModel.class_id == request.class_id,
            StudentModel.school_id == school_uuid,
            StudentModel.gender == Gender.FEMALE.value,
            StudentModel.roll_number.is_(None)
        ).order_by(StudentModel.first_name, StudentModel.last_name).all()

        boys = db.query(StudentModel).filter(
            StudentModel.class_id == request.class_id,
            StudentModel.school_id == school_uuid,
            StudentModel.gender == Gender.MALE.value,
            StudentModel.roll_number.is_(None)
        ).order_by(StudentModel.first_name, StudentModel.last_name).all()

        students = girls + boys

    else:  # AUTO_NORMAL
        students = db.query(StudentModel).filter(
            StudentModel.class_id == request.class_id,
            StudentModel.school_id == school_uuid,
            StudentModel.roll_number.is_(None)
        ).order_by(StudentModel.first_name, StudentModel.last_name).all()

    # Get initial count - count ALL students with this assignment type (regardless of gender)
    initial_count = db.query(StudentModel).filter(
        StudentModel.class_id == request.class_id,
        StudentModel.school_id == school_uuid,
        StudentModel.roll_number_assignment_type == RollNumberAssignmentType[request.assignment_type],
        StudentModel.roll_number.isnot(None)
    ).count()

    assigned_count = 0
    current_number = initial_count + 1

    for student in students:
        # Generate roll number without prefix
        roll_number = f"{current_number:03d}"

        student.roll_number = roll_number
        student.roll_number_assignment_type = RollNumberAssignmentType[request.assignment_type]
        assigned_count += 1
        current_number += 1

    db.commit()

    return {
        "message": "Roll numbers assigned successfully",
        "assigned_count": assigned_count,
        "assignment_type": request.assignment_type
    }