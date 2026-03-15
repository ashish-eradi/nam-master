from sqlalchemy.orm import Session
from app.models.user import User
from fastapi import Depends
from app.api.deps import get_current_user_school

def tenant_aware_query(db: Session, model, school_id: str = Depends(get_current_user_school)):
    query = db.query(model)
    if school_id:
        query = query.filter(model.school_id == school_id)
    return query
