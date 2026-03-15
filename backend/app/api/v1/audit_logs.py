from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import uuid

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.audit_log import AuditLog
from pydantic import BaseModel


router = APIRouter()


class AuditLogResponse(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    user_id: Optional[uuid.UUID]
    action: str
    resource_type: str
    resource_id: Optional[str]
    ip_address: Optional[str]
    user_agent: Optional[str]
    old_value: Optional[dict]
    new_value: Optional[dict]
    description: Optional[str]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/", response_model=List[AuditLogResponse])
def get_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    user_id: Optional[uuid.UUID] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get audit logs with optional filters.
    Only accessible by SUPERADMIN and ADMIN roles.
    """
    # Check if user has permission to view audit logs
    if current_user.role not in ["SUPERADMIN", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    query = db.query(AuditLog)

    # For non-superadmin users, filter by their school
    if current_user.role != "SUPERADMIN":
        if not current_user.school_id:
            raise HTTPException(status_code=400, detail="User must be associated with a school")
        query = query.filter(AuditLog.school_id == current_user.school_id)

    # Apply filters
    if action:
        query = query.filter(AuditLog.action == action)
    if resource_type:
        query = query.filter(AuditLog.resource_type == resource_type)
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    if start_date:
        query = query.filter(AuditLog.created_at >= start_date)
    if end_date:
        query = query.filter(AuditLog.created_at <= end_date)

    # Order by most recent first
    query = query.order_by(AuditLog.created_at.desc())

    # Apply pagination
    audit_logs = query.offset(skip).limit(limit).all()

    return audit_logs


@router.get("/stats/summary")
def get_audit_stats(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get audit log statistics.
    Only accessible by SUPERADMIN and ADMIN roles.
    """
    # Check if user has permission
    if current_user.role not in ["SUPERADMIN", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    query = db.query(AuditLog)

    # For non-superadmin users, filter by their school
    if current_user.role != "SUPERADMIN":
        if not current_user.school_id:
            raise HTTPException(status_code=400, detail="User must be associated with a school")
        query = query.filter(AuditLog.school_id == current_user.school_id)

    # Apply date filters
    if start_date:
        query = query.filter(AuditLog.created_at >= start_date)
    if end_date:
        query = query.filter(AuditLog.created_at <= end_date)

    # Get counts by action
    from sqlalchemy import func
    action_counts = db.query(
        AuditLog.action,
        func.count(AuditLog.id).label('count')
    ).filter(
        AuditLog.school_id == current_user.school_id if current_user.role != "SUPERADMIN" else True
    )

    if start_date:
        action_counts = action_counts.filter(AuditLog.created_at >= start_date)
    if end_date:
        action_counts = action_counts.filter(AuditLog.created_at <= end_date)

    action_counts = action_counts.group_by(AuditLog.action).all()

    # Get counts by resource type
    resource_counts = db.query(
        AuditLog.resource_type,
        func.count(AuditLog.id).label('count')
    ).filter(
        AuditLog.school_id == current_user.school_id if current_user.role != "SUPERADMIN" else True
    )

    if start_date:
        resource_counts = resource_counts.filter(AuditLog.created_at >= start_date)
    if end_date:
        resource_counts = resource_counts.filter(AuditLog.created_at <= end_date)

    resource_counts = resource_counts.group_by(AuditLog.resource_type).all()

    # Total count
    total_count = query.count()

    return {
        "total_logs": total_count,
        "by_action": [{"action": action, "count": count} for action, count in action_counts],
        "by_resource_type": [{"resource_type": resource_type, "count": count} for resource_type, count in resource_counts]
    }


@router.get("/{audit_log_id}", response_model=AuditLogResponse)
def get_audit_log(
    audit_log_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get a specific audit log by ID.
    Only accessible by SUPERADMIN and ADMIN roles.
    """
    # Check if user has permission
    if current_user.role not in ["SUPERADMIN", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    audit_log = db.query(AuditLog).filter(AuditLog.id == audit_log_id).first()

    if not audit_log:
        raise HTTPException(status_code=404, detail="Audit log not found")

    # For non-superadmin users, ensure they can only view logs from their school
    if current_user.role != "SUPERADMIN":
        if not current_user.school_id or audit_log.school_id != current_user.school_id:
            raise HTTPException(status_code=403, detail="Access denied")

    return audit_log
