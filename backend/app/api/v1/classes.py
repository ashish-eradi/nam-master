from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import uuid
from app.core.database import get_db
from app.schemas.class_schema import Class, ClassCreate, ClassUpdate, ClassBase
from app.models.class_model import Class as ClassModel
from app.schemas.student import Student as StudentSchema
from app.models.student import Student as StudentModel
from app.core.permissions import is_admin, is_admin_or_teacher
from app.core.utils import tenant_aware_query
from app.api.deps import get_current_user_school

router = APIRouter()

@router.get("", response_model=List[Class], dependencies=[Depends(is_admin_or_teacher)])
def read_classes(db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    return tenant_aware_query(db, ClassModel, school_id).all()

@router.post("", response_model=Class, dependencies=[Depends(is_admin)])
def create_class(class_in: ClassBase, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    class_data = class_in.model_dump()
    # Handle both string and UUID types for school_id
    if isinstance(school_id, uuid.UUID):
        class_data['school_id'] = school_id
    else:
        class_data['school_id'] = uuid.UUID(str(school_id))
    db_class = ClassModel(**class_data)
    db.add(db_class)
    db.commit()
    db.refresh(db_class)
    return db_class

@router.get("/{class_id}", response_model=Class, dependencies=[Depends(is_admin_or_teacher)])
def read_class(class_id: uuid.UUID, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    class_ = tenant_aware_query(db, ClassModel, school_id).filter(ClassModel.id == class_id).first()
    if class_ is None:
        raise HTTPException(status_code=404, detail="Class not found")
    return class_

@router.put("/{class_id}", response_model=Class, dependencies=[Depends(is_admin)])
def update_class(class_id: uuid.UUID, class_in: ClassUpdate, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    db_class = tenant_aware_query(db, ClassModel, school_id).filter(ClassModel.id == class_id).first()
    if db_class is None:
        raise HTTPException(status_code=404, detail="Class not found")
    class_data = class_in.model_dump(exclude_unset=True)
    for key, value in class_data.items():
        setattr(db_class, key, value)
    db.commit()
    db.refresh(db_class)
    return db_class

@router.get("/{class_id}/students", response_model=List[StudentSchema], dependencies=[Depends(is_admin_or_teacher)])
def read_students_in_class(class_id: uuid.UUID, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    # First, ensure the class exists and belongs to the school
    class_ = tenant_aware_query(db, ClassModel, school_id).filter(ClassModel.id == class_id).first()
    if not class_:
        raise HTTPException(status_code=404, detail="Class not found")
    
    # Then, get the students from that class
    students = db.query(StudentModel).filter(StudentModel.class_id == class_id).all()
    return students

@router.delete("/{class_id}", response_model=Class, dependencies=[Depends(is_admin)])
def delete_class(class_id: uuid.UUID, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    db_class = tenant_aware_query(db, ClassModel, school_id).filter(ClassModel.id == class_id).first()
    if db_class is None:
        raise HTTPException(status_code=404, detail="Class not found")
    db.delete(db_class)
    db.commit()
    return db_class