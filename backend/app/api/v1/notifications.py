from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload
from typing import List, Optional
import uuid
import httpx
import logging
from datetime import datetime

logger = logging.getLogger(__name__)
from app.core.database import get_db
from app.schemas.notification_schema import (
    SMSTemplate, SMSTemplateCreate, SMSTemplateUpdate,
    SMSNotification, SMSNotificationCreate,
    SendSMSRequest, BulkSMSRequest, SMSSendResponse,
    NotificationType, SMSNotificationWithStudent
)
from app.models.notification import (
    SMSTemplate as SMSTemplateModel,
    SMSNotification as SMSNotificationModel
)
from app.models.student import Student as StudentModel
from app.models.class_model import Class as ClassModel
from app.models.school import School as SchoolModel
from app.api.deps import get_current_user_school, get_current_user
from app.models.user import User
from app.core.utils import tenant_aware_query
from app.core.permissions import is_admin, is_admin_or_superadmin, is_admin_or_teacher

router = APIRouter()

def ensure_uuid(value):
    """Convert to UUID if string, otherwise return as-is"""
    return value if isinstance(value, uuid.UUID) else uuid.UUID(value)

def get_school_sms_api_key(db: Session, school_id: str) -> Optional[str]:
    """Get the SMS API key for a school."""
    school_uuid = ensure_uuid(school_id)
    school = db.query(SchoolModel).filter(SchoolModel.id == school_uuid).first()
    if school:
        return school.sms_api_key
    return None

def _dispatch_sms(phone: str, message: str, api_key: str) -> str:
    """
    Send an SMS via MSG91 (https://msg91.com).
    Returns 'sent' on success, 'failed' on error.
    The api_key stored on the School record should be a MSG91 authkey.
    To switch providers, only this function needs to change.
    """
    try:
        payload = {
            "sender": "SCHOOL",
            "route": "4",
            "country": "91",
            "sms": [{"message": message, "to": [phone]}],
        }
        headers = {"authkey": api_key, "Content-Type": "application/json"}
        response = httpx.post(
            "https://api.msg91.com/api/v2/sendsms",
            json=payload,
            headers=headers,
            timeout=10,
        )
        response.raise_for_status()
        logger.info(f"SMS dispatched to {phone}: HTTP {response.status_code}")
        return "sent"
    except Exception as exc:
        logger.error(f"SMS dispatch failed for {phone}: {exc}")
        raise

# ===== SMS Template Endpoints =====

@router.get("/sms/templates", response_model=List[SMSTemplate], dependencies=[Depends(is_admin)])
def list_sms_templates(
    notification_type: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """List all SMS templates for the school."""
    query = tenant_aware_query(db, SMSTemplateModel, school_id)

    if notification_type:
        query = query.filter(SMSTemplateModel.notification_type == notification_type)

    if is_active is not None:
        query = query.filter(SMSTemplateModel.is_active == is_active)

    return query.order_by(SMSTemplateModel.created_at.desc()).all()

@router.post("/sms/templates", response_model=SMSTemplate, dependencies=[Depends(is_admin)])
def create_sms_template(
    template: SMSTemplateCreate,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school),
    current_user: User = Depends(get_current_user)
):
    """Create a new SMS template."""
    school_uuid = ensure_uuid(school_id)
    if template.school_id != school_uuid:
        raise HTTPException(status_code=403, detail="Cannot create template for another school")

    db_template = SMSTemplateModel(
        **template.model_dump(),
        created_by_user_id=current_user.id
    )
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template

@router.put("/sms/templates/{template_id}", response_model=SMSTemplate, dependencies=[Depends(is_admin)])
def update_sms_template(
    template_id: uuid.UUID,
    template: SMSTemplateUpdate,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Update an existing SMS template."""
    db_template = tenant_aware_query(db, SMSTemplateModel, school_id).filter(
        SMSTemplateModel.id == template_id
    ).first()

    if not db_template:
        raise HTTPException(status_code=404, detail="Template not found")

    update_data = template.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_template, key, value)

    db.commit()
    db.refresh(db_template)
    return db_template

@router.delete("/sms/templates/{template_id}", status_code=204, dependencies=[Depends(is_admin)])
def delete_sms_template(
    template_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Delete an SMS template."""
    db_template = tenant_aware_query(db, SMSTemplateModel, school_id).filter(
        SMSTemplateModel.id == template_id
    ).first()

    if not db_template:
        raise HTTPException(status_code=404, detail="Template not found")

    db.delete(db_template)
    db.commit()
    return {"detail": "Template deleted successfully"}

# ===== SMS Sending Endpoints =====

@router.post("/sms/send", response_model=SMSSendResponse, dependencies=[Depends(is_admin)])
def send_sms(
    sms_request: SendSMSRequest,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school),
    current_user: User = Depends(get_current_user)
):
    """
    Send SMS to specific recipients.
    This is a basic implementation that logs SMS without actually sending.
    Integrate with Twilio, MSG91, or other SMS gateway for actual sending.
    """
    school_uuid = ensure_uuid(school_id)
    if sms_request.school_id != school_uuid:
        raise HTTPException(status_code=403, detail="Cannot send SMS for another school")

    # Get school's SMS API key
    sms_api_key = get_school_sms_api_key(db, school_id)
    if not sms_api_key:
        raise HTTPException(
            status_code=400,
            detail="SMS API key not configured for this school. Please contact the administrator."
        )

    # Get message (either direct or from template)
    message_template = sms_request.message

    if sms_request.template_id:
        template = tenant_aware_query(db, SMSTemplateModel, school_id).filter(
            SMSTemplateModel.id == sms_request.template_id,
            SMSTemplateModel.is_active == True
        ).first()

        if not template:
            raise HTTPException(status_code=404, detail="Template not found or inactive")

        message_template = template.message_template

    if not message_template:
        raise HTTPException(status_code=400, detail="Message or template_id is required")

    sent_count = 0
    failed_count = 0
    failed_numbers = []

    for recipient in sms_request.recipients:
        try:
            # Replace variables in template
            message = message_template
            if recipient.variables:
                for key, value in recipient.variables.items():
                    message = message.replace(f"{{{{{key}}}}}", str(value))

            # Dispatch SMS via provider
            sms_status = _dispatch_sms(recipient.phone, message, sms_api_key)

            # Record result
            sms_notification = SMSNotificationModel(
                school_id=sms_request.school_id,
                recipient_phone=recipient.phone,
                recipient_name=recipient.name,
                student_id=recipient.student_id,
                message=message,
                notification_type=sms_request.notification_type.value,
                status=sms_status,
                sent_by_user_id=current_user.id,
                sent_at=datetime.now()
            )
            db.add(sms_notification)
            sent_count += 1

        except Exception as e:
            failed_count += 1
            failed_numbers.append(recipient.phone)

            # Log failed SMS
            sms_notification = SMSNotificationModel(
                school_id=sms_request.school_id,
                recipient_phone=recipient.phone,
                recipient_name=recipient.name,
                student_id=recipient.student_id,
                message=message,
                notification_type=sms_request.notification_type.value,
                status="failed",
                error_message=str(e),
                sent_by_user_id=current_user.id
            )
            db.add(sms_notification)

    db.commit()

    return SMSSendResponse(
        total_sent=sent_count,
        total_failed=failed_count,
        failed_numbers=failed_numbers,
        message=f"SMS sent successfully to {sent_count} recipients. {failed_count} failed."
    )

@router.post("/sms/send-bulk", response_model=SMSSendResponse, dependencies=[Depends(is_admin)])
def send_bulk_sms(
    bulk_request: BulkSMSRequest,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school),
    current_user: User = Depends(get_current_user)
):
    """
    Send bulk SMS to all students in a class or all students in school.
    """
    school_uuid = ensure_uuid(school_id)
    if bulk_request.school_id != school_uuid:
        raise HTTPException(status_code=403, detail="Cannot send SMS for another school")

    # Get school's SMS API key
    sms_api_key = get_school_sms_api_key(db, school_id)
    if not sms_api_key:
        raise HTTPException(
            status_code=400,
            detail="SMS API key not configured for this school. Please contact the administrator."
        )

    # Get message
    message_template = bulk_request.message

    if bulk_request.template_id:
        template = tenant_aware_query(db, SMSTemplateModel, school_id).filter(
            SMSTemplateModel.id == bulk_request.template_id,
            SMSTemplateModel.is_active == True
        ).first()

        if not template:
            raise HTTPException(status_code=404, detail="Template not found or inactive")

        message_template = template.message_template

    if not message_template:
        raise HTTPException(status_code=400, detail="Message or template_id is required")

    # Get students
    query = tenant_aware_query(db, StudentModel, school_id)

    if bulk_request.class_id:
        query = query.filter(StudentModel.class_id == bulk_request.class_id)

    students = query.all()

    if not students:
        raise HTTPException(status_code=404, detail="No students found")

    sent_count = 0
    failed_count = 0
    failed_numbers = []

    for student in students:
        if not student.mobile_number:
            continue

        try:
            # Replace student-specific variables in template
            message = message_template.replace("{{student_name}}", f"{student.first_name} {student.last_name}")
            message = message.replace("{{admission_number}}", student.admission_number)

            # Dispatch SMS via provider
            sms_status = _dispatch_sms(student.mobile_number, message, sms_api_key)

            # Record result
            sms_notification = SMSNotificationModel(
                school_id=bulk_request.school_id,
                recipient_phone=student.mobile_number,
                recipient_name=f"{student.first_name} {student.last_name}",
                student_id=student.id,
                message=message,
                notification_type=bulk_request.notification_type.value,
                status=sms_status,
                sent_by_user_id=current_user.id,
                sent_at=datetime.now()
            )
            db.add(sms_notification)
            sent_count += 1

        except Exception as e:
            failed_count += 1
            failed_numbers.append(student.mobile_number)

            # Log failed SMS
            sms_notification = SMSNotificationModel(
                school_id=bulk_request.school_id,
                recipient_phone=student.mobile_number,
                recipient_name=f"{student.first_name} {student.last_name}",
                student_id=student.id,
                message=message,
                notification_type=bulk_request.notification_type.value,
                status="failed",
                error_message=str(e),
                sent_by_user_id=current_user.id
            )
            db.add(sms_notification)

    db.commit()

    return SMSSendResponse(
        total_sent=sent_count,
        total_failed=failed_count,
        failed_numbers=failed_numbers,
        message=f"Bulk SMS sent successfully to {sent_count} recipients. {failed_count} failed."
    )

# ===== SMS History Endpoints =====

@router.get("/sms/history", response_model=List[SMSNotificationWithStudent], dependencies=[Depends(is_admin)])
def get_sms_history(
    notification_type: Optional[str] = None,
    status: Optional[str] = None,
    student_id: Optional[uuid.UUID] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Get SMS history with filters."""
    query = tenant_aware_query(db, SMSNotificationModel, school_id).options(
        selectinload(SMSNotificationModel.student).selectinload(StudentModel.class_)
    )

    if notification_type:
        query = query.filter(SMSNotificationModel.notification_type == notification_type)

    if status:
        query = query.filter(SMSNotificationModel.status == status)

    if student_id:
        query = query.filter(SMSNotificationModel.student_id == student_id)

    notifications = query.order_by(SMSNotificationModel.created_at.desc()).offset(offset).limit(limit).all()

    # Build response with student details
    result = []
    for notif in notifications:
        notif_dict = notif.__dict__.copy()
        if notif.student:
            notif_dict['student_name'] = f"{notif.student.first_name} {notif.student.last_name}"
            notif_dict['admission_number'] = notif.student.admission_number
            notif_dict['class_name'] = notif.student.class_.name if notif.student.class_ else None
        else:
            notif_dict['student_name'] = None
            notif_dict['admission_number'] = None
            notif_dict['class_name'] = None
        result.append(notif_dict)

    return result

@router.get("/sms/stats", dependencies=[Depends(is_admin)])
def get_sms_stats(
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Get SMS statistics for the school."""
    total = tenant_aware_query(db, SMSNotificationModel, school_id).count()
    sent = tenant_aware_query(db, SMSNotificationModel, school_id).filter(
        SMSNotificationModel.status == "sent"
    ).count()
    failed = tenant_aware_query(db, SMSNotificationModel, school_id).filter(
        SMSNotificationModel.status == "failed"
    ).count()
    pending = tenant_aware_query(db, SMSNotificationModel, school_id).filter(
        SMSNotificationModel.status == "pending"
    ).count()

    return {
        "total": total,
        "sent": sent,
        "failed": failed,
        "pending": pending
    }
