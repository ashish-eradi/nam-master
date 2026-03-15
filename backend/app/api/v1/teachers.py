import uuid
import csv
import io
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session, joinedload
from typing import List
from app.core.database import get_db
from app.schemas.teacher_schema import Teacher, TeacherCreate, TeacherUpdate
from app.models.teacher import Teacher as TeacherModel
from app.models.user import User as UserModel
from app.core.permissions import is_admin, is_admin_or_teacher
from app.api.deps import get_current_user_school
from app.core.security import hash_password
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("", response_model=List[Teacher], dependencies=[Depends(is_admin_or_teacher)])
def read_teachers(db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    logger.info(f"Reading teachers for school_id: {school_id}")
    query = db.query(TeacherModel).options(joinedload(TeacherModel.user))
    if school_id:
        query = query.filter(TeacherModel.school_id == school_id)
    teachers = query.all()

    teacher_list = []
    for teacher in teachers:
        teacher_dict = {
            "id": teacher.id,
            "user_id": teacher.user_id,
            "school_id": teacher.school_id,
            "employee_id": teacher.employee_id,
            "department": teacher.department,
            "qualification": teacher.qualification,
            "specialization": teacher.specialization,
            "hire_date": teacher.hire_date,
            "experience_years": teacher.experience_years,
            "email": teacher.user.email if teacher.user else None,
            "full_name": teacher.user.full_name if teacher.user else None,
        }
        teacher_list.append(teacher_dict)
    return teacher_list

@router.post("", response_model=Teacher, dependencies=[Depends(is_admin)])
def create_teacher(teacher: TeacherCreate, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    # Override school_id from token if not provided
    if not teacher.school_id:
        if not school_id:
            raise HTTPException(status_code=400, detail="School ID required")
        teacher.school_id = uuid.UUID(str(school_id))

    # Check if employee_id already exists
    existing_teacher = db.query(TeacherModel).filter(TeacherModel.employee_id == teacher.employee_id).first()
    if existing_teacher:
        raise HTTPException(status_code=400, detail="Employee ID already exists")

    # Only create user if email is provided (for staff with login access)
    if teacher.email:
        # Check if email already exists
        db_user = db.query(UserModel).filter(UserModel.email == teacher.email).first()
        if db_user:
            raise HTTPException(status_code=400, detail="Email already registered")

        # Create user first
        password = teacher.password if teacher.password else "Teacher@123"
        hashed_password = hash_password(password)

        db_user = UserModel(
            username=teacher.email,
            email=teacher.email,
            full_name=teacher.full_name,
            password_hash=hashed_password,
            role="TEACHER",
            school_id=teacher.school_id,
            is_active=True,
            is_verified=True,
        )
        db.add(db_user)
        db.flush()
        db.refresh(db_user)
        user_id = db_user.id
    else:
        # For non-teaching staff without email, create a placeholder user or handle differently
        # Create a minimal user record without login credentials
        db_user = UserModel(
            username=f"{teacher.employee_id}_{uuid.uuid4().hex[:8]}",  # Unique username
            email=f"noaccess_{uuid.uuid4().hex}@placeholder.internal",
            full_name=teacher.full_name,
            password_hash=hash_password("NoAccess@123"),  # Placeholder password
            role="TEACHER",
            school_id=teacher.school_id,
            is_active=False,  # No login access
            is_verified=False,
        )
        db.add(db_user)
        db.flush()
        db.refresh(db_user)
        user_id = db_user.id

    # Create teacher record
    teacher_data = teacher.model_dump(exclude={"email", "password", "full_name"})
    db_teacher = TeacherModel(**teacher_data, user_id=user_id)
    db.add(db_teacher)
    db.commit()
    db.refresh(db_teacher)

    return {
        "id": db_teacher.id,
        "user_id": db_teacher.user_id,
        "school_id": db_teacher.school_id,
        "employee_id": db_teacher.employee_id,
        "department": db_teacher.department,
        "qualification": db_teacher.qualification,
        "specialization": db_teacher.specialization,
        "hire_date": db_teacher.hire_date,
        "experience_years": db_teacher.experience_years,
        "email": db_user.email if teacher.email else None,
        "full_name": db_user.full_name,
    }

@router.get("/{teacher_id}", response_model=Teacher, dependencies=[Depends(is_admin_or_teacher)])
def read_teacher(teacher_id: uuid.UUID, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    teacher = db.query(TeacherModel).options(joinedload(TeacherModel.user)).filter(
        TeacherModel.id == teacher_id,
        TeacherModel.school_id == school_id
    ).first()
    if teacher is None:
        raise HTTPException(status_code=404, detail="Teacher not found")

    return {
        "id": teacher.id,
        "user_id": teacher.user_id,
        "school_id": teacher.school_id,
        "employee_id": teacher.employee_id,
        "department": teacher.department,
        "qualification": teacher.qualification,
        "specialization": teacher.specialization,
        "hire_date": teacher.hire_date,
        "experience_years": teacher.experience_years,
        "email": teacher.user.email if teacher.user else None,
        "full_name": teacher.user.full_name if teacher.user else None,
    }

@router.put("/{teacher_id}", response_model=Teacher, dependencies=[Depends(is_admin)])
def update_teacher(teacher_id: uuid.UUID, teacher: TeacherUpdate, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    db_teacher = db.query(TeacherModel).options(joinedload(TeacherModel.user)).filter(
        TeacherModel.id == teacher_id,
        TeacherModel.school_id == school_id
    ).first()
    if db_teacher is None:
        raise HTTPException(status_code=404, detail="Teacher not found")

    teacher_data = teacher.model_dump(exclude_unset=True)
    for key, value in teacher_data.items():
        setattr(db_teacher, key, value)

    db.commit()
    db.refresh(db_teacher)

    return {
        "id": db_teacher.id,
        "user_id": db_teacher.user_id,
        "school_id": db_teacher.school_id,
        "employee_id": db_teacher.employee_id,
        "department": db_teacher.department,
        "qualification": db_teacher.qualification,
        "specialization": db_teacher.specialization,
        "hire_date": db_teacher.hire_date,
        "experience_years": db_teacher.experience_years,
        "email": db_teacher.user.email if db_teacher.user else None,
        "full_name": db_teacher.user.full_name if db_teacher.user else None,
    }

def _create_teacher_record(row, row_num, school_id, db, include_specialization=True):
    """Helper: validates a CSV row and creates user + teacher records. Returns (teacher, error_str)."""
    employee_id = row.get('employee_id', '').strip()
    if not employee_id:
        return None, f"Row {row_num}: Employee ID is required"

    full_name = row.get('full_name', '').strip()
    if not full_name:
        return None, f"Row {row_num}: Full Name is required"

    existing = db.query(TeacherModel).filter(TeacherModel.employee_id == employee_id).first()
    if existing:
        return None, f"Row {row_num}: Employee ID '{employee_id}' already exists"

    email = row.get('email', '').strip() or None

    if email:
        if db.query(UserModel).filter(UserModel.email == email).first():
            return None, f"Row {row_num}: Email '{email}' already registered"
        password = row.get('password', '').strip() or "Teacher@123"
        db_user = UserModel(
            username=email, email=email, full_name=full_name,
            password_hash=hash_password(password), role="TEACHER",
            school_id=uuid.UUID(str(school_id)), is_active=True, is_verified=True,
        )
    else:
        db_user = UserModel(
            username=f"{employee_id}_{uuid.uuid4().hex[:8]}", email=None, full_name=full_name,
            password_hash=hash_password("NoAccess@123"), role="TEACHER",
            school_id=uuid.UUID(str(school_id)), is_active=False, is_verified=False,
        )

    db.add(db_user)
    db.flush()

    exp = row.get('experience_years', '').strip()
    db_teacher = TeacherModel(
        employee_id=employee_id,
        school_id=uuid.UUID(str(school_id)),
        user_id=db_user.id,
        department=row.get('department', '').strip() or None,
        qualification=row.get('qualification', '').strip() or None,
        specialization=row.get('specialization', '').strip() or None if include_specialization else None,
        hire_date=row.get('hire_date', '').strip() or None,
        experience_years=int(exp) if exp else None,
    )
    db.add(db_teacher)
    return db_teacher, None


@router.post("/bulk_import/teaching", dependencies=[Depends(is_admin)])
async def bulk_import_teaching_staff(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school),
):
    if not school_id:
        raise HTTPException(status_code=400, detail="School ID required")
    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
    try:
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB.")
        csv_reader = csv.DictReader(io.StringIO(content.decode('utf-8')))
        created, errors = 0, []
        for row_num, row in enumerate(csv_reader, start=2):
            try:
                _, err = _create_teacher_record(row, row_num, school_id, db, include_specialization=True)
                if err:
                    errors.append(err)
                else:
                    created += 1
            except Exception as e:
                errors.append(f"Row {row_num}: {str(e)}")
        db.commit()
        return {"message": f"Successfully imported {created} teaching staff", "staff_created": created, "errors": errors or None}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")


@router.post("/bulk_import/non_teaching", dependencies=[Depends(is_admin)])
async def bulk_import_non_teaching_staff(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school),
):
    if not school_id:
        raise HTTPException(status_code=400, detail="School ID required")
    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
    try:
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB.")
        csv_reader = csv.DictReader(io.StringIO(content.decode('utf-8')))
        created, errors = 0, []
        for row_num, row in enumerate(csv_reader, start=2):
            try:
                _, err = _create_teacher_record(row, row_num, school_id, db, include_specialization=False)
                if err:
                    errors.append(err)
                else:
                    created += 1
            except Exception as e:
                errors.append(f"Row {row_num}: {str(e)}")
        db.commit()
        return {"message": f"Successfully imported {created} non-teaching staff", "staff_created": created, "errors": errors or None}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")


@router.delete("/{teacher_id}", response_model=Teacher, dependencies=[Depends(is_admin)])
def delete_teacher(teacher_id: uuid.UUID, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    db_teacher = db.query(TeacherModel).options(joinedload(TeacherModel.user)).filter(
        TeacherModel.id == teacher_id,
        TeacherModel.school_id == school_id
    ).first()
    if db_teacher is None:
        raise HTTPException(status_code=404, detail="Teacher not found")

    result = {
        "id": db_teacher.id,
        "user_id": db_teacher.user_id,
        "school_id": db_teacher.school_id,
        "employee_id": db_teacher.employee_id,
        "department": db_teacher.department,
        "qualification": db_teacher.qualification,
        "specialization": db_teacher.specialization,
        "hire_date": db_teacher.hire_date,
        "experience_years": db_teacher.experience_years,
        "email": db_teacher.user.email if db_teacher.user else None,
        "full_name": db_teacher.user.full_name if db_teacher.user else None,
    }

    db.delete(db_teacher)
    db.commit()
    return result
