from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from enum import Enum


class NotificationType(str, Enum):
    FEE_REMINDER = "Fee Reminder"
    ATTENDANCE_ALERT = "Attendance Alert"
    EXAM_NOTIFICATION = "Exam Notification"
    EVENT_REMINDER = "Event Reminder"
    GENERAL = "General"
    EMERGENCY = "Emergency"


class NotificationStatus(str, Enum):
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"
    FAILED = "failed"


# ===== WABA Credential Schemas =====

class WhatsAppCredentialCreate(BaseModel):
    """Payload sent by the frontend after the Embedded Signup flow completes."""
    phone_number_id: str = Field(..., max_length=50)
    waba_id: str = Field(..., max_length=50)
    access_token: str
    display_name: Optional[str] = Field(None, max_length=200)


class WhatsAppCredentialResponse(BaseModel):
    """Returned credential info — access_token is never exposed."""
    id: UUID
    school_id: UUID
    phone_number_id: str
    waba_id: str
    display_name: Optional[str]
    is_active: bool
    connected_at: Optional[datetime]

    class Config:
        from_attributes = True


# ===== WhatsApp Template Schemas =====

class WhatsAppTemplateCreate(BaseModel):
    name: str = Field(..., max_length=200)
    notification_type: NotificationType
    message_template: str
    is_active: bool = True
    # Optional Meta Cloud API binding
    meta_template_name: Optional[str] = Field(None, max_length=200,
        description="Exact template name as approved in Meta Business Manager")
    meta_template_language: Optional[str] = Field("en", max_length=20,
        description="BCP-47 language code, e.g. 'en' or 'en_US'")


class WhatsAppTemplateUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=200)
    notification_type: Optional[NotificationType] = None
    message_template: Optional[str] = None
    is_active: Optional[bool] = None
    meta_template_name: Optional[str] = Field(None, max_length=200)
    meta_template_language: Optional[str] = Field(None, max_length=20)


class WhatsAppTemplate(BaseModel):
    id: UUID
    school_id: UUID
    name: str
    notification_type: NotificationType
    message_template: str
    is_active: bool
    meta_template_name: Optional[str]
    meta_template_language: Optional[str]
    created_by_user_id: Optional[UUID]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# ===== WhatsApp Send Schemas =====

class WhatsAppRecipient(BaseModel):
    """Single recipient for a WhatsApp send."""
    phone: str = Field(..., max_length=20)
    name: Optional[str] = None
    student_id: Optional[UUID] = None
    # Named variables for local {{key}} template rendering
    variables: Optional[dict] = {}
    # Positional params for Meta-approved template {{1}}, {{2}}, …
    meta_template_params: Optional[List[str]] = []


class SendWhatsAppRequest(BaseModel):
    """Send to one or more specific recipients."""
    school_id: UUID
    recipients: List[WhatsAppRecipient]
    notification_type: NotificationType
    # Provide ONE of: message (free-form text) or template_id (local template)
    message: Optional[str] = None
    template_id: Optional[UUID] = None
    # Override template to send as Meta-approved template directly
    meta_template_name: Optional[str] = None
    meta_template_language: Optional[str] = "en"
    # Positional body params shared across all recipients (per-recipient params use WhatsAppRecipient.meta_template_params)
    meta_template_params: Optional[List[str]] = []


class BulkWhatsAppRequest(BaseModel):
    """Send to all students in a class or the whole school."""
    school_id: UUID
    class_id: Optional[UUID] = None         # Omit to target the whole school
    notification_type: NotificationType
    message: Optional[str] = None
    template_id: Optional[UUID] = None
    meta_template_name: Optional[str] = None
    meta_template_language: Optional[str] = "en"
    meta_template_params: Optional[List[str]] = []


# ===== WhatsApp Notification (log) Schemas =====

class WhatsAppNotification(BaseModel):
    id: UUID
    school_id: UUID
    recipient_phone: str
    recipient_name: Optional[str]
    student_id: Optional[UUID]
    message: str
    notification_type: NotificationType
    status: str                              # pending|sent|delivered|read|failed
    error_message: Optional[str]
    meta_message_id: Optional[str]
    sent_by_user_id: Optional[UUID]
    sent_at: Optional[datetime]
    delivered_at: Optional[datetime]
    read_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class WhatsAppNotificationWithStudent(WhatsAppNotification):
    """Notification enriched with student details (joined at query time)."""
    student_name: Optional[str]
    admission_number: Optional[str]
    class_name: Optional[str]


class WhatsAppSendResponse(BaseModel):
    """Summary returned after a send or bulk-send operation."""
    total_sent: int
    total_failed: int
    failed_numbers: List[str] = []
    message: str


# Keep SMS aliases for backward compatibility with any existing imports
SMSTemplateCreate = WhatsAppTemplateCreate
SMSTemplateUpdate = WhatsAppTemplateUpdate
SMSTemplate = WhatsAppTemplate
SMSRecipient = WhatsAppRecipient
SendSMSRequest = SendWhatsAppRequest
BulkSMSRequest = BulkWhatsAppRequest
SMSNotificationCreate = WhatsAppNotification
SMSNotification = WhatsAppNotification
SMSNotificationWithStudent = WhatsAppNotificationWithStudent
SMSSendResponse = WhatsAppSendResponse
