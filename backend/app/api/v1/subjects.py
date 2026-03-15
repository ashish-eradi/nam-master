import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.schemas.subject_schema import Subject, SubjectCreate, SubjectUpdate
from app.models.subject import Subject as SubjectModel
from app.core.permissions import is_admin, is_admin_or_teacher
from app.core.utils import tenant_aware_query
from app.api.deps import get_current_user_school

router = APIRouter()

@router.get("", response_model=List[Subject], dependencies=[Depends(is_admin_or_teacher)])
def read_subjects(db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    return tenant_aware_query(db, SubjectModel, school_id).all()

@router.post("", response_model=Subject, dependencies=[Depends(is_admin)])
def create_subject(subject: SubjectCreate, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    if not school_id:
        raise HTTPException(status_code=400, detail="School ID required")

    subject_data = subject.model_dump()
    subject_data['school_id'] = school_id

    db_subject = SubjectModel(**subject_data)
    db.add(db_subject)
    db.commit()
    db.refresh(db_subject)
    return db_subject

@router.get("/{subject_id}", response_model=Subject, dependencies=[Depends(is_admin_or_teacher)])
def read_subject(subject_id: uuid.UUID, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    subject = tenant_aware_query(db, SubjectModel, school_id).filter(SubjectModel.id == subject_id).first()
    if subject is None:
        raise HTTPException(status_code=404, detail="Subject not found")
    return subject

@router.put("/{subject_id}", response_model=Subject, dependencies=[Depends(is_admin)])
def update_subject(subject_id: uuid.UUID, subject: SubjectUpdate, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    db_subject = tenant_aware_query(db, SubjectModel, school_id).filter(SubjectModel.id == subject_id).first()
    if db_subject is None:
        raise HTTPException(status_code=404, detail="Subject not found")
    update_data = subject.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_subject, key, value)
    db.commit()
    db.refresh(db_subject)
    return db_subject

@router.delete("/{subject_id}", response_model=Subject, dependencies=[Depends(is_admin)])
def delete_subject(subject_id: uuid.UUID, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    db_subject = tenant_aware_query(db, SubjectModel, school_id).filter(SubjectModel.id == subject_id).first()
    if db_subject is None:
        raise HTTPException(status_code=404, detail="Subject not found")
    db.delete(db_subject)
    db.commit()
    return db_subject