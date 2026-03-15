from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.schemas.communication_schema import Announcement, AnnouncementCreate, AnnouncementUpdate
from app.models.communication import Announcement as AnnouncementModel
from app.core.permissions import is_admin_or_teacher, is_student, is_parent
from app.core.utils import tenant_aware_query
from app.api.deps import get_current_user_school, get_current_user
from app.models.user import User

router = APIRouter()

@router.get("", response_model=List[Announcement], dependencies=[Depends(is_admin_or_teacher)]) # Should be more granular
def read_announcements(db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    return tenant_aware_query(db, AnnouncementModel, school_id).all()

@router.post("", response_model=Announcement, dependencies=[Depends(is_admin_or_teacher)])
def create_announcement(announcement: AnnouncementCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    announcement_data = announcement.model_dump()
    announcement_data["created_by_user_id"] = current_user.id
    db_announcement = AnnouncementModel(
        **announcement_data,
    )
    db.add(db_announcement)
    db.commit()
    db.refresh(db_announcement)
    return db_announcement