from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.schemas.timetable_schema import Period, PeriodCreate, PeriodUpdate, TimetableEntry, TimetableEntryCreate, TimetableEntryUpdate
from app.models.timetable import Period as PeriodModel, TimetableEntry as TimetableEntryModel
from app.core.permissions import is_admin, is_admin_or_teacher, is_student
from app.core.utils import tenant_aware_query
from app.api.deps import get_current_user_school
import uuid

router = APIRouter()

@router.get("/periods", response_model=List[Period], dependencies=[Depends(is_admin)])
def read_periods(db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    return tenant_aware_query(db, PeriodModel, school_id).all()

@router.post("/periods", response_model=Period, dependencies=[Depends(is_admin)])
def create_period(period: PeriodCreate, db: Session = Depends(get_db)):
    db_period = PeriodModel(**period.dict())
    db.add(db_period)
    db.commit()
    db.refresh(db_period)
    return db_period

@router.put("/periods/{period_id}", response_model=Period, dependencies=[Depends(is_admin)])
def update_period(period_id: str, period: PeriodUpdate, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    db_period = tenant_aware_query(db, PeriodModel, school_id).filter(PeriodModel.id == uuid.UUID(period_id)).first()
    if not db_period:
        raise HTTPException(status_code=404, detail="Period not found")
    update_data = period.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_period, key, value)
    db.commit()
    db.refresh(db_period)
    return db_period

@router.delete("/periods/{period_id}", status_code=204, dependencies=[Depends(is_admin)])
def delete_period(period_id: str, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    db_period = tenant_aware_query(db, PeriodModel, school_id).filter(PeriodModel.id == uuid.UUID(period_id)).first()
    if not db_period:
        raise HTTPException(status_code=404, detail="Period not found")
    db.delete(db_period)
    db.commit()
    return {"detail": "Period deleted successfully"}

@router.get("/class/{class_id}", response_model=List[TimetableEntry], dependencies=[Depends(is_admin_or_teacher)]) # Should be more granular
def read_class_timetable(class_id: str, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    return db.query(TimetableEntryModel).filter(TimetableEntryModel.class_id == uuid.UUID(class_id), TimetableEntryModel.school_id == school_id).all()

@router.post("", response_model=TimetableEntry, dependencies=[Depends(is_admin)])
def create_timetable_entry(entry: TimetableEntryCreate, db: Session = Depends(get_db)):
    # Check for teacher conflict
    teacher_conflict = db.query(TimetableEntryModel).filter(
        TimetableEntryModel.teacher_id == entry.teacher_id,
        TimetableEntryModel.period_id == entry.period_id,
        TimetableEntryModel.day_of_week == entry.day_of_week
    ).first()
    if teacher_conflict:
        raise HTTPException(status_code=409, detail="Teacher is already booked for this period.")

    # Check for class conflict
    class_conflict = db.query(TimetableEntryModel).filter(
        TimetableEntryModel.class_id == entry.class_id,
        TimetableEntryModel.period_id == entry.period_id,
        TimetableEntryModel.day_of_week == entry.day_of_week
    ).first()
    if class_conflict:
        raise HTTPException(status_code=409, detail="Class is already scheduled for this period.")

    db_entry = TimetableEntryModel(**entry.dict())
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry

@router.put("/{entry_id}", response_model=TimetableEntry, dependencies=[Depends(is_admin)])
def update_timetable_entry(entry_id: str, entry: TimetableEntryUpdate, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    db_entry = tenant_aware_query(db, TimetableEntryModel, school_id).filter(TimetableEntryModel.id == uuid.UUID(entry_id)).first()
    if not db_entry:
        raise HTTPException(status_code=404, detail="Timetable entry not found")

    update_data = entry.dict(exclude_unset=True)
    # Add conflict detection here if necessary before updating

    for key, value in update_data.items():
        setattr(db_entry, key, value)
    db.commit()
    db.refresh(db_entry)
    return db_entry

@router.delete("/{entry_id}", status_code=204, dependencies=[Depends(is_admin)])
def delete_timetable_entry(entry_id: str, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    db_entry = tenant_aware_query(db, TimetableEntryModel, school_id).filter(TimetableEntryModel.id == uuid.UUID(entry_id)).first()
    if not db_entry:
        raise HTTPException(status_code=404, detail="Timetable entry not found")
    db.delete(db_entry)
    db.commit()
    return {"detail": "Timetable entry deleted successfully"}