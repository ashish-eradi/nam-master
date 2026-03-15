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
    FAILED = "failed"

# ===== SMS Template Schemas =====

class SMSTemplateCreate(BaseModel):
    school_id: UUID
    name: str = Field(..., max_length=200)
    notification_type: NotificationType
    message_template: str
    is_active: bool = True

class SMSTemplateUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=200)
    notification_type: Optional[NotificationType] = None
    message_template: Optional[str] = None
    is_active: Optional[bool] = None

class SMSTemplate(BaseModel):
    id: UUID
    school_id: UUID
    name: str
    notification_type: NotificationType
    message_template: str
    is_active: bool
    created_by_user_id: Optional[UUID]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

# ===== SMS Notification Schemas =====

class SMSRecipient(BaseModel):
    """Single recipient for SMS"""
    phone: str = Field(..., max_length=20)
    name: Optional[str] = None
    student_id: Optional[UUID] = None
    variables: Optional[dict] = {}  # For template variable substitution

class SendSMSRequest(BaseModel):
    """Request to send SMS to one or more recipients"""
    school_id: UUID
    recipients: List[SMSRecipient]
    notification_type: NotificationType
    message: Optional[str] = None  # Direct message
    template_id: Optional[UUID] = None  # Or use template

class BulkSMSRequest(BaseModel):
    """Request to send bulk SMS to a group"""
    school_id: UUID
    class_id: Optional[UUID] = None  # Send to all students in class
    notification_type: NotificationType
    message: Optional[str] = None
    template_id: Optional[UUID] = None

class SMSNotificationCreate(BaseModel):
    school_id: UUID
    recipient_phone: str = Field(..., max_length=20)
    recipient_name: Optional[str] = None
    student_id: Optional[UUID] = None
    message: str
    notification_type: NotificationType

class SMSNotification(BaseModel):
    id: UUID
    school_id: UUID
    recipient_phone: str
    recipient_name: Optional[str]
    student_id: Optional[UUID]
    message: str
    notification_type: NotificationType
    status: NotificationStatus
    error_message: Optional[str]
    sent_by_user_id: Optional[UUID]
    sent_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True

class SMSNotificationWithStudent(SMSNotification):
    """SMS notification with student details"""
    student_name: Optional[str]
    admission_number: Optional[str]
    class_name: Optional[str]

class SMSSendResponse(BaseModel):
    """Response after sending SMS"""
    total_sent: int
    total_failed: int
    failed_numbers: List[str] = []
    message: str
