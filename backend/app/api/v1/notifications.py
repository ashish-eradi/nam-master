from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload
from typing import List, Optional
import uuid
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

from app.core.database import get_db
from app.schemas.notification_schema import (
    WhatsAppTemplate, WhatsAppTemplateCreate, WhatsAppTemplateUpdate,
    WhatsAppNotification, WhatsAppNotificationWithStudent,
    WhatsAppCredentialCreate, WhatsAppCredentialResponse,
    SendWhatsAppRequest, BulkWhatsAppRequest, WhatsAppSendResponse,
    NotificationType,
)
from app.models.notification import (
    SMSTemplate as WhatsAppTemplateModel,
    SMSNotification as WhatsAppNotificationModel,
    WhatsAppCredential as WhatsAppCredentialModel,
)
from app.models.student import Student as StudentModel
from app.models.class_model import Class as ClassModel
from app.models.school import School as SchoolModel
from app.api.deps import get_current_user_school, get_current_user
from app.models.user import User
from app.core.utils import tenant_aware_query
from app.core.permissions import is_admin
from app.services.whatsapp_service import WhatsAppService, WhatsAppSendError

router = APIRouter()


def _ensure_uuid(value):
    return value if isinstance(value, uuid.UUID) else uuid.UUID(str(value))


def _get_credential(db: Session, school_id) -> WhatsAppCredentialModel:
    """Return active WABA credential for the school or raise 400."""
    cred = db.query(WhatsAppCredentialModel).filter(
        WhatsAppCredentialModel.school_id == _ensure_uuid(school_id),
        WhatsAppCredentialModel.is_active == True,
    ).first()
    if not cred:
        raise HTTPException(
            status_code=400,
            detail=(
                "WhatsApp is not connected for this school. "
                "Go to Settings → WhatsApp to complete the Embedded Signup."
            ),
        )
    return cred


def _resolve_send_args(
    cred: WhatsAppCredentialModel,
    db: Session,
    school_id,
    template_id: Optional[uuid.UUID],
    message: Optional[str],
    meta_template_name: Optional[str],
    meta_template_language: str,
    meta_template_params: List[str],
    recipient_phone: str,
    recipient_vars: dict,
    recipient_meta_params: List[str],
) -> dict:
    """
    Resolve what to send for one recipient and call the appropriate
    WhatsAppService method.  Returns {"wamid": str, "rendered_message": str}.
    """
    local_template_body: Optional[str] = None

    if template_id:
        tmpl = tenant_aware_query(db, WhatsAppTemplateModel, school_id).filter(
            WhatsAppTemplateModel.id == template_id,
            WhatsAppTemplateModel.is_active == True,
        ).first()
        if not tmpl:
            raise HTTPException(status_code=404, detail="Template not found or inactive")
        # Prefer Meta template name from the template record if not overridden by request
        if not meta_template_name and tmpl.meta_template_name:
            meta_template_name = tmpl.meta_template_name
            meta_template_language = tmpl.meta_template_language or meta_template_language
        local_template_body = tmpl.message_template

    # Render local template placeholders for the log message
    rendered = local_template_body or message or ""
    if recipient_vars:
        for key, value in recipient_vars.items():
            rendered = rendered.replace(f"{{{{{key}}}}}", str(value))

    # Determine positional params: per-recipient overrides shared params
    body_params = recipient_meta_params or meta_template_params or None

    if meta_template_name:
        wamid = WhatsAppService.send_template(
            phone_number_id=cred.phone_number_id,
            access_token=cred.access_token,
            to=recipient_phone,
            template_name=meta_template_name,
            language_code=meta_template_language or "en",
            body_params=body_params if body_params else None,
        )
    else:
        if not rendered:
            raise HTTPException(status_code=400, detail="message or template_id is required")
        wamid = WhatsAppService.send_text(
            phone_number_id=cred.phone_number_id,
            access_token=cred.access_token,
            to=recipient_phone,
            body=rendered,
        )

    return {"wamid": wamid, "rendered_message": rendered}


# ─────────────────────────────────────────────────────────────
# WABA Credential Endpoints
# ─────────────────────────────────────────────────────────────

@router.post("/whatsapp/credentials", response_model=WhatsAppCredentialResponse, dependencies=[Depends(is_admin)])
def save_whatsapp_credentials(
    payload: WhatsAppCredentialCreate,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school),
):
    """
    Store (or update) the WABA credentials returned by the Embedded Signup flow.
    Call this once after the school admin completes Embedded Signup on the frontend.
    """
    school_uuid = _ensure_uuid(school_id)
    cred = db.query(WhatsAppCredentialModel).filter(
        WhatsAppCredentialModel.school_id == school_uuid
    ).first()

    if cred:
        cred.phone_number_id = payload.phone_number_id
        cred.waba_id = payload.waba_id
        cred.access_token = payload.access_token
        cred.display_name = payload.display_name
        cred.is_active = True
        cred.connected_at = datetime.now(timezone.utc)
    else:
        cred = WhatsAppCredentialModel(
            school_id=school_uuid,
            phone_number_id=payload.phone_number_id,
            waba_id=payload.waba_id,
            access_token=payload.access_token,
            display_name=payload.display_name,
            is_active=True,
        )
        db.add(cred)

    db.commit()
    db.refresh(cred)
    return cred


@router.get("/whatsapp/credentials", response_model=WhatsAppCredentialResponse, dependencies=[Depends(is_admin)])
def get_whatsapp_credentials(
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school),
):
    """Return current WABA connection status. access_token is never returned."""
    cred = db.query(WhatsAppCredentialModel).filter(
        WhatsAppCredentialModel.school_id == _ensure_uuid(school_id)
    ).first()
    if not cred:
        raise HTTPException(status_code=404, detail="WhatsApp not connected")
    return cred


@router.delete("/whatsapp/credentials", status_code=204, dependencies=[Depends(is_admin)])
def disconnect_whatsapp(
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school),
):
    """Deactivate the WABA connection for this school."""
    cred = db.query(WhatsAppCredentialModel).filter(
        WhatsAppCredentialModel.school_id == _ensure_uuid(school_id)
    ).first()
    if not cred:
        raise HTTPException(status_code=404, detail="WhatsApp not connected")
    cred.is_active = False
    db.commit()


# ─────────────────────────────────────────────────────────────
# Template Endpoints
# ─────────────────────────────────────────────────────────────

@router.get("/whatsapp/templates", response_model=List[WhatsAppTemplate], dependencies=[Depends(is_admin)])
def list_whatsapp_templates(
    notification_type: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school),
):
    query = tenant_aware_query(db, WhatsAppTemplateModel, school_id)
    if notification_type:
        query = query.filter(WhatsAppTemplateModel.notification_type == notification_type)
    if is_active is not None:
        query = query.filter(WhatsAppTemplateModel.is_active == is_active)
    return query.order_by(WhatsAppTemplateModel.created_at.desc()).all()


@router.post("/whatsapp/templates", response_model=WhatsAppTemplate, dependencies=[Depends(is_admin)])
def create_whatsapp_template(
    template: WhatsAppTemplateCreate,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school),
    current_user: User = Depends(get_current_user),
):
    school_uuid = _ensure_uuid(school_id)
    db_template = WhatsAppTemplateModel(
        **template.model_dump(),
        school_id=school_uuid,
        created_by_user_id=current_user.id,
    )
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template


@router.put("/whatsapp/templates/{template_id}", response_model=WhatsAppTemplate, dependencies=[Depends(is_admin)])
def update_whatsapp_template(
    template_id: uuid.UUID,
    template: WhatsAppTemplateUpdate,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school),
):
    db_template = tenant_aware_query(db, WhatsAppTemplateModel, school_id).filter(
        WhatsAppTemplateModel.id == template_id
    ).first()
    if not db_template:
        raise HTTPException(status_code=404, detail="Template not found")

    for key, value in template.model_dump(exclude_unset=True).items():
        setattr(db_template, key, value)
    db.commit()
    db.refresh(db_template)
    return db_template


@router.delete("/whatsapp/templates/{template_id}", status_code=204, dependencies=[Depends(is_admin)])
def delete_whatsapp_template(
    template_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school),
):
    db_template = tenant_aware_query(db, WhatsAppTemplateModel, school_id).filter(
        WhatsAppTemplateModel.id == template_id
    ).first()
    if not db_template:
        raise HTTPException(status_code=404, detail="Template not found")
    db.delete(db_template)
    db.commit()


# ─────────────────────────────────────────────────────────────
# Send Endpoints
# ─────────────────────────────────────────────────────────────

@router.post("/whatsapp/send", response_model=WhatsAppSendResponse, dependencies=[Depends(is_admin)])
def send_whatsapp(
    request: SendWhatsAppRequest,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school),
    current_user: User = Depends(get_current_user),
):
    """Send a WhatsApp message to one or more specific recipients."""
    school_uuid = _ensure_uuid(school_id)
    if request.school_id != school_uuid:
        raise HTTPException(status_code=403, detail="Cannot send messages for another school")

    cred = _get_credential(db, school_id)

    sent_count = 0
    failed_count = 0
    failed_numbers: List[str] = []

    for recipient in request.recipients:
        wamid: Optional[str] = None
        rendered_msg = ""
        status = "failed"
        error_msg: Optional[str] = None

        try:
            result = _resolve_send_args(
                cred=cred,
                db=db,
                school_id=school_id,
                template_id=request.template_id,
                message=request.message,
                meta_template_name=request.meta_template_name,
                meta_template_language=request.meta_template_language or "en",
                meta_template_params=request.meta_template_params or [],
                recipient_phone=recipient.phone,
                recipient_vars=recipient.variables or {},
                recipient_meta_params=recipient.meta_template_params or [],
            )
            wamid = result["wamid"]
            rendered_msg = result["rendered_message"]
            status = "sent"
            sent_count += 1
        except WhatsAppSendError as exc:
            error_msg = str(exc)
            failed_count += 1
            failed_numbers.append(recipient.phone)
            logger.warning("WhatsApp send failed for %s: %s", recipient.phone, exc)
        except HTTPException:
            raise
        except Exception as exc:
            error_msg = str(exc)
            failed_count += 1
            failed_numbers.append(recipient.phone)
            logger.error("Unexpected error sending WhatsApp to %s: %s", recipient.phone, exc)

        db.add(WhatsAppNotificationModel(
            school_id=request.school_id,
            recipient_phone=recipient.phone,
            recipient_name=recipient.name,
            student_id=recipient.student_id,
            message=rendered_msg,
            notification_type=request.notification_type.value,
            status=status,
            meta_message_id=wamid,
            error_message=error_msg,
            sent_by_user_id=current_user.id,
            sent_at=datetime.now(timezone.utc) if status == "sent" else None,
        ))

    db.commit()
    return WhatsAppSendResponse(
        total_sent=sent_count,
        total_failed=failed_count,
        failed_numbers=failed_numbers,
        message=f"Sent {sent_count} messages. {failed_count} failed.",
    )


@router.post("/whatsapp/send-bulk", response_model=WhatsAppSendResponse, dependencies=[Depends(is_admin)])
def send_bulk_whatsapp(
    request: BulkWhatsAppRequest,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school),
    current_user: User = Depends(get_current_user),
):
    """
    Send a WhatsApp message to all students in a class (or whole school).
    Uses the student's mobile_number. Skips students with no phone on record.
    """
    school_uuid = _ensure_uuid(school_id)
    if request.school_id != school_uuid:
        raise HTTPException(status_code=403, detail="Cannot send messages for another school")

    cred = _get_credential(db, school_id)

    query = tenant_aware_query(db, StudentModel, school_id)
    if request.class_id:
        query = query.filter(StudentModel.class_id == request.class_id)
    students = query.all()

    if not students:
        raise HTTPException(status_code=404, detail="No students found for the selected target")

    # Resolve the template once outside the loop
    local_template_body: Optional[str] = request.message
    meta_template_name = request.meta_template_name
    meta_template_language = request.meta_template_language or "en"

    if request.template_id:
        tmpl = tenant_aware_query(db, WhatsAppTemplateModel, school_id).filter(
            WhatsAppTemplateModel.id == request.template_id,
            WhatsAppTemplateModel.is_active == True,
        ).first()
        if not tmpl:
            raise HTTPException(status_code=404, detail="Template not found or inactive")
        local_template_body = tmpl.message_template
        if not meta_template_name and tmpl.meta_template_name:
            meta_template_name = tmpl.meta_template_name
            meta_template_language = tmpl.meta_template_language or meta_template_language

    if not meta_template_name and not local_template_body:
        raise HTTPException(status_code=400, detail="message or template_id is required")

    sent_count = 0
    failed_count = 0
    failed_numbers: List[str] = []

    for student in students:
        phone = getattr(student, "mobile_number", None)
        if not phone:
            continue

        # Substitute common student variables in the local template
        rendered = local_template_body or ""
        rendered = rendered.replace("{{student_name}}", f"{student.first_name} {student.last_name}")
        rendered = rendered.replace("{{admission_number}}", student.admission_number or "")

        wamid: Optional[str] = None
        status = "failed"
        error_msg: Optional[str] = None

        try:
            if meta_template_name:
                body_params = request.meta_template_params or None
                wamid = WhatsAppService.send_template(
                    phone_number_id=cred.phone_number_id,
                    access_token=cred.access_token,
                    to=phone,
                    template_name=meta_template_name,
                    language_code=meta_template_language,
                    body_params=body_params,
                )
            else:
                wamid = WhatsAppService.send_text(
                    phone_number_id=cred.phone_number_id,
                    access_token=cred.access_token,
                    to=phone,
                    body=rendered,
                )
            status = "sent"
            sent_count += 1
        except WhatsAppSendError as exc:
            error_msg = str(exc)
            failed_count += 1
            failed_numbers.append(phone)
            logger.warning("Bulk WhatsApp failed for student %s (%s): %s", student.id, phone, exc)
        except Exception as exc:
            error_msg = str(exc)
            failed_count += 1
            failed_numbers.append(phone)
            logger.error("Unexpected bulk send error for %s: %s", phone, exc)

        db.add(WhatsAppNotificationModel(
            school_id=request.school_id,
            recipient_phone=phone,
            recipient_name=f"{student.first_name} {student.last_name}",
            student_id=student.id,
            message=rendered,
            notification_type=request.notification_type.value,
            status=status,
            meta_message_id=wamid,
            error_message=error_msg,
            sent_by_user_id=current_user.id,
            sent_at=datetime.now(timezone.utc) if status == "sent" else None,
        ))

    db.commit()
    return WhatsAppSendResponse(
        total_sent=sent_count,
        total_failed=failed_count,
        failed_numbers=failed_numbers,
        message=f"Bulk send complete: {sent_count} sent, {failed_count} failed.",
    )


# ─────────────────────────────────────────────────────────────
# History & Stats Endpoints
# ─────────────────────────────────────────────────────────────

@router.get("/whatsapp/history", response_model=List[WhatsAppNotificationWithStudent], dependencies=[Depends(is_admin)])
def get_whatsapp_history(
    notification_type: Optional[str] = None,
    status: Optional[str] = None,
    student_id: Optional[uuid.UUID] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school),
):
    query = tenant_aware_query(db, WhatsAppNotificationModel, school_id).options(
        selectinload(WhatsAppNotificationModel.student).selectinload(StudentModel.class_)
    )
    if notification_type:
        query = query.filter(WhatsAppNotificationModel.notification_type == notification_type)
    if status:
        query = query.filter(WhatsAppNotificationModel.status == status)
    if student_id:
        query = query.filter(WhatsAppNotificationModel.student_id == student_id)

    notifications = query.order_by(WhatsAppNotificationModel.created_at.desc()).offset(offset).limit(limit).all()

    result = []
    for notif in notifications:
        d = {c.name: getattr(notif, c.name) for c in notif.__table__.columns}
        if notif.student:
            d["student_name"] = f"{notif.student.first_name} {notif.student.last_name}"
            d["admission_number"] = notif.student.admission_number
            d["class_name"] = notif.student.class_.name if notif.student.class_ else None
        else:
            d["student_name"] = None
            d["admission_number"] = None
            d["class_name"] = None
        result.append(d)
    return result


@router.get("/whatsapp/stats", dependencies=[Depends(is_admin)])
def get_whatsapp_stats(
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school),
):
    base = tenant_aware_query(db, WhatsAppNotificationModel, school_id)
    return {
        "total":     base.count(),
        "sent":      base.filter(WhatsAppNotificationModel.status == "sent").count(),
        "delivered": base.filter(WhatsAppNotificationModel.status == "delivered").count(),
        "read":      base.filter(WhatsAppNotificationModel.status == "read").count(),
        "failed":    base.filter(WhatsAppNotificationModel.status == "failed").count(),
        "pending":   base.filter(WhatsAppNotificationModel.status == "pending").count(),
    }
