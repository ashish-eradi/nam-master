import uuid
from sqlalchemy import Column, String, ForeignKey, Text, DateTime, Boolean, Enum, Index
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum


class NotificationType(str, enum.Enum):
    FEE_REMINDER = "Fee Reminder"
    ATTENDANCE_ALERT = "Attendance Alert"
    EXAM_NOTIFICATION = "Exam Notification"
    EVENT_REMINDER = "Event Reminder"
    GENERAL = "General"
    EMERGENCY = "Emergency"


class NotificationStatus(str, enum.Enum):
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"
    FAILED = "failed"


class WhatsAppCredential(Base):
    """
    Per-school WhatsApp Business Account (WABA) credentials.
    Populated via the Embedded Signup flow; one record per school.
    """
    __tablename__ = "whatsapp_credentials"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.id"), nullable=False, unique=True)
    # Meta WABA identifiers
    phone_number_id = Column(String(50), nullable=False)    # Sending phone number ID
    waba_id = Column(String(50), nullable=False)            # WhatsApp Business Account ID
    # System user token — keep this secret; encrypt at rest in production
    access_token = Column(Text, nullable=False)
    display_name = Column(String(200))                      # Business display name shown to recipients
    is_active = Column(Boolean, default=True)
    connected_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    school = relationship("School", back_populates="whatsapp_credential")


class SMSTemplate(Base):
    """
    WhatsApp / SMS message templates for different notification types.
    If meta_template_name is set the message is sent as a Meta-approved template;
    otherwise the message_template body is rendered locally and sent as plain text.
    """
    __tablename__ = "sms_templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.id"), nullable=False)
    name = Column(String(200), nullable=False)
    notification_type = Column(String(50), nullable=False)
    message_template = Column(Text, nullable=False)         # Use {{variable}} for local placeholders
    is_active = Column(Boolean, default=True)
    # Meta Cloud API template fields
    meta_template_name = Column(String(200), nullable=True)      # Exact name in Meta Business Manager
    meta_template_language = Column(String(20), nullable=True, default="en")  # e.g. "en", "en_US"
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    school = relationship("School", back_populates="sms_templates")
    created_by = relationship("User", foreign_keys=[created_by_user_id])


class SMSNotification(Base):
    """
    Log of every WhatsApp message sent by a school.
    meta_message_id is the wamid returned by Meta and used to match
    incoming webhook delivery-status events.
    """
    __tablename__ = "sms_notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.id"), nullable=False)
    recipient_phone = Column(String(20), nullable=False)
    recipient_name = Column(String(200))
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=True)
    message = Column(Text, nullable=False)
    notification_type = Column(String(50), nullable=False)
    # Status lifecycle: pending → sent → delivered → read  (or → failed)
    status = Column(String(20), default="pending")
    error_message = Column(Text)
    # Meta Cloud API tracking
    meta_message_id = Column(String(100), nullable=True, index=True)   # wamid from Meta
    sent_at = Column(DateTime(timezone=True))
    delivered_at = Column(DateTime(timezone=True))
    read_at = Column(DateTime(timezone=True))
    sent_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    school = relationship("School", back_populates="sms_notifications")
    student = relationship("Student", back_populates="sms_notifications")
    sent_by = relationship("User", foreign_keys=[sent_by_user_id])


# Performance index: look up notifications by school ordered by date (history endpoint)
Index("ix_sms_notifications_school_created", SMSNotification.school_id, SMSNotification.created_at)
