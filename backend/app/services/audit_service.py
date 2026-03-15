import uuid
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from fastapi import Request
from app.models.audit_log import AuditLog


class AuditService:
    """Service for logging audit trail events"""

    @staticmethod
    async def log(
        db: Session,
        school_id: uuid.UUID,
        action: str,
        resource_type: str,
        user_id: Optional[uuid.UUID] = None,
        resource_id: Optional[str] = None,
        old_value: Optional[Dict[str, Any]] = None,
        new_value: Optional[Dict[str, Any]] = None,
        description: Optional[str] = None,
        status: str = "SUCCESS",
        request: Optional[Request] = None
    ) -> AuditLog:
        """
        Log an audit trail event

        Args:
            db: Database session
            school_id: School ID
            action: Action performed (CREATE, UPDATE, DELETE, LOGIN, LOGOUT, etc.)
            resource_type: Type of resource (Student, Fee, Payment, etc.)
            user_id: ID of user who performed the action
            resource_id: ID of the affected resource
            old_value: Previous state of the resource
            new_value: New state of the resource
            description: Optional description of the action
            status: Status of the action (SUCCESS, FAILED)
            request: FastAPI Request object to extract IP and user agent

        Returns:
            Created AuditLog instance
        """
        ip_address = None
        user_agent = None

        if request:
            # Get client IP address
            if request.client:
                ip_address = request.client.host

            # Get user agent from headers
            user_agent = request.headers.get("user-agent")

        audit_log = AuditLog(
            id=uuid.uuid4(),
            school_id=school_id,
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id else None,
            ip_address=ip_address,
            user_agent=user_agent,
            old_value=old_value,
            new_value=new_value,
            description=description,
            status=status
        )

        db.add(audit_log)
        db.commit()
        db.refresh(audit_log)

        return audit_log

    @staticmethod
    async def log_create(
        db: Session,
        school_id: uuid.UUID,
        resource_type: str,
        resource_id: Any,
        new_value: Dict[str, Any],
        user_id: Optional[uuid.UUID] = None,
        request: Optional[Request] = None
    ) -> AuditLog:
        """Log a CREATE action"""
        return await AuditService.log(
            db=db,
            school_id=school_id,
            action="CREATE",
            resource_type=resource_type,
            resource_id=resource_id,
            new_value=new_value,
            user_id=user_id,
            description=f"Created {resource_type}",
            request=request
        )

    @staticmethod
    async def log_update(
        db: Session,
        school_id: uuid.UUID,
        resource_type: str,
        resource_id: Any,
        old_value: Dict[str, Any],
        new_value: Dict[str, Any],
        user_id: Optional[uuid.UUID] = None,
        request: Optional[Request] = None
    ) -> AuditLog:
        """Log an UPDATE action"""
        return await AuditService.log(
            db=db,
            school_id=school_id,
            action="UPDATE",
            resource_type=resource_type,
            resource_id=resource_id,
            old_value=old_value,
            new_value=new_value,
            user_id=user_id,
            description=f"Updated {resource_type}",
            request=request
        )

    @staticmethod
    async def log_delete(
        db: Session,
        school_id: uuid.UUID,
        resource_type: str,
        resource_id: Any,
        old_value: Dict[str, Any],
        user_id: Optional[uuid.UUID] = None,
        request: Optional[Request] = None
    ) -> AuditLog:
        """Log a DELETE action"""
        return await AuditService.log(
            db=db,
            school_id=school_id,
            action="DELETE",
            resource_type=resource_type,
            resource_id=resource_id,
            old_value=old_value,
            user_id=user_id,
            description=f"Deleted {resource_type}",
            request=request
        )

    @staticmethod
    async def log_login(
        db: Session,
        school_id: uuid.UUID,
        user_id: uuid.UUID,
        request: Optional[Request] = None,
        status: str = "SUCCESS"
    ) -> AuditLog:
        """Log a LOGIN action"""
        return await AuditService.log(
            db=db,
            school_id=school_id,
            action="LOGIN",
            resource_type="User",
            resource_id=user_id,
            user_id=user_id,
            description=f"User logged in",
            status=status,
            request=request
        )

    @staticmethod
    async def log_logout(
        db: Session,
        school_id: uuid.UUID,
        user_id: uuid.UUID,
        request: Optional[Request] = None
    ) -> AuditLog:
        """Log a LOGOUT action"""
        return await AuditService.log(
            db=db,
            school_id=school_id,
            action="LOGOUT",
            resource_type="User",
            resource_id=user_id,
            user_id=user_id,
            description=f"User logged out",
            request=request
        )
