import uuid
from sqlalchemy import Column, String, ForeignKey, Text, DateTime, Boolean, Enum
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
    FAILED = "failed"

class SMSTemplate(Base):
    """SMS templates for different notification types"""
    __tablename__ = "sms_templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.id"), nullable=False)
    name = Column(String(200), nullable=False)
    notification_type = Column(String(50), nullable=False)
    message_template = Column(Text, nullable=False)  # Use {{variable}} for placeholders
    is_active = Column(Boolean, default=True)
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    school = relationship("School", back_populates="sms_templates")
    created_by = relationship("User", foreign_keys=[created_by_user_id])


class SMSNotification(Base):
    """Record of sent SMS notifications"""
    __tablename__ = "sms_notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.id"), nullable=False)
    recipient_phone = Column(String(20), nullable=False)
    recipient_name = Column(String(200))
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=True)  # Optional link to student
    message = Column(Text, nullable=False)
    notification_type = Column(String(50), nullable=False)
    status = Column(String(20), default="pending")  # pending, sent, failed
    error_message = Column(Text)
    sent_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    sent_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    school = relationship("School", back_populates="sms_notifications")
    student = relationship("Student", back_populates="sms_notifications")
    sent_by = relationship("User", foreign_keys=[sent_by_user_id])
