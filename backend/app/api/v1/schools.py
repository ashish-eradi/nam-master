from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from pathlib import Path
import shutil
import uuid as uuid_lib

from app.core.database import get_db
from app.schemas.school import School, SchoolCreate, SchoolUpdate
from app.models.school import School as SchoolModel
from app.core.permissions import is_superadmin

UPLOAD_DIR = Path("/app/uploads")
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}

router = APIRouter()

@router.get("", response_model=List[School], dependencies=[Depends(is_superadmin)])
def read_schools(db: Session = Depends(get_db)):
    return db.query(SchoolModel).all()

from sqlalchemy.exc import IntegrityError

@router.post("", response_model=School, dependencies=[Depends(is_superadmin)])
def create_school(school: SchoolCreate, db: Session = Depends(get_db)):
    try:
        db_school = SchoolModel(**school.model_dump())
        db.add(db_school)
        db.commit()
        db.refresh(db_school)
        return db_school
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="School with this code already exists.")

import uuid

@router.get("/{school_id}", response_model=School, dependencies=[Depends(is_superadmin)])
def read_school(school_id: uuid.UUID, db: Session = Depends(get_db)):
    school = db.query(SchoolModel).filter(SchoolModel.id == school_id).first()
    if school is None:
        raise HTTPException(status_code=404, detail="School not found")
    return school

@router.put("/{school_id}", response_model=School, dependencies=[Depends(is_superadmin)])
def update_school(school_id: uuid.UUID, school: SchoolUpdate, db: Session = Depends(get_db)):
    db_school = db.query(SchoolModel).filter(SchoolModel.id == school_id).first()
    if db_school is None:
        raise HTTPException(status_code=404, detail="School not found")
    update_data = school.model_dump(exclude_unset=True)
    for var, value in update_data.items():
        setattr(db_school, var, value)
    db.commit()
    db.refresh(db_school)
    return db_school

@router.delete("/{school_id}", response_model=School, dependencies=[Depends(is_superadmin)])
def delete_school(school_id: uuid.UUID, db: Session = Depends(get_db)):
    db_school = db.query(SchoolModel).filter(SchoolModel.id == school_id).first()
    if db_school is None:
        raise HTTPException(status_code=404, detail="School not found")
    db.delete(db_school)
    db.commit()
    return db_school

@router.post("/{school_id}/activate", response_model=School, dependencies=[Depends(is_superadmin)])
def activate_school(school_id: uuid.UUID, db: Session = Depends(get_db)):
    """Activate a school - enables all users to login and use the system"""
    db_school = db.query(SchoolModel).filter(SchoolModel.id == school_id).first()
    if db_school is None:
        raise HTTPException(status_code=404, detail="School not found")
    db_school.is_active = True
    db.commit()
    db.refresh(db_school)
    return db_school

@router.post("/{school_id}/deactivate", response_model=School, dependencies=[Depends(is_superadmin)])
def deactivate_school(school_id: uuid.UUID, db: Session = Depends(get_db)):
    """Deactivate a school - prevents all users from that school from logging in"""
    db_school = db.query(SchoolModel).filter(SchoolModel.id == school_id).first()
    if db_school is None:
        raise HTTPException(status_code=404, detail="School not found")
    db_school.is_active = False
    db.commit()
    db.refresh(db_school)
    return db_school

from pydantic import BaseModel

class SMSApiKeyUpdate(BaseModel):
    sms_api_key: str

@router.post("/{school_id}/set-offline", response_model=School, dependencies=[Depends(is_superadmin)])
def set_school_offline(school_id: uuid.UUID, db: Session = Depends(get_db)):
    """Mark a school as using the offline desktop app."""
    db_school = db.query(SchoolModel).filter(SchoolModel.id == school_id).first()
    if db_school is None:
        raise HTTPException(status_code=404, detail="School not found")
    db_school.is_offline = True
    db.commit()
    db.refresh(db_school)
    return db_school

@router.post("/{school_id}/set-online", response_model=School, dependencies=[Depends(is_superadmin)])
def set_school_online(school_id: uuid.UUID, db: Session = Depends(get_db)):
    """Mark a school as using the online portal (remove offline flag)."""
    db_school = db.query(SchoolModel).filter(SchoolModel.id == school_id).first()
    if db_school is None:
        raise HTTPException(status_code=404, detail="School not found")
    db_school.is_offline = False
    db.commit()
    db.refresh(db_school)
    return db_school

@router.put("/{school_id}/sms-api-key", response_model=School, dependencies=[Depends(is_superadmin)])
def update_school_sms_api_key(school_id: uuid.UUID, api_key_update: SMSApiKeyUpdate, db: Session = Depends(get_db)):
    """Update the SMS API key for a school - only accessible by superadmin"""
    db_school = db.query(SchoolModel).filter(SchoolModel.id == school_id).first()
    if db_school is None:
        raise HTTPException(status_code=404, detail="School not found")
    db_school.sms_api_key = api_key_update.sms_api_key
    db.commit()
    db.refresh(db_school)
    return db_school


@router.post("/{school_id}/logo", response_model=School, dependencies=[Depends(is_superadmin)])
async def upload_school_logo(school_id: uuid.UUID, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload or replace the logo for a school"""
    db_school = db.query(SchoolModel).filter(SchoolModel.id == school_id).first()
    if db_school is None:
        raise HTTPException(status_code=404, detail="School not found")

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}")

    # Delete old logo if it exists
    if db_school.logo_url and db_school.logo_url.startswith("/uploads/"):
        old_path = UPLOAD_DIR / db_school.logo_url.replace("/uploads/", "")
        if old_path.exists():
            old_path.unlink()

    # Save new logo
    save_dir = UPLOAD_DIR / "schools" / str(school_id)
    save_dir.mkdir(parents=True, exist_ok=True)
    filename = f"logo{ext}"
    file_path = save_dir / filename
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    db_school.logo_url = f"/uploads/schools/{school_id}/{filename}"
    db.commit()
    db.refresh(db_school)
    return db_school
