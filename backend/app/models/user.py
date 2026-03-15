import uuid
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.enums import Role

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    full_name = Column(String(100), nullable=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(Role), nullable=False)
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=True)
    last_login = Column(DateTime)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    school = relationship("School", back_populates="users")
    class_in_charge = relationship("Class", back_populates="class_teacher")
    # student = relationship("Student", back_populates="user")  # Removed - students no longer have user accounts
    teacher = relationship("Teacher", back_populates="user")
    parent = relationship("Parent", back_populates="user")
    marked_attendance = relationship("Attendance", back_populates="marked_by")
    entered_grades = relationship("Grade", back_populates="entered_by")
    received_payments = relationship("Payment", back_populates="received_by")
    approved_concessions = relationship("Concession", back_populates="approved_by")
    created_exams = relationship("Exam", back_populates="created_by")
    issued_book_transactions = relationship("BookTransaction", back_populates="issued_by")
    created_announcements = relationship("Announcement", back_populates="created_by")
    sent_messages = relationship("Message", foreign_keys="[Message.sender_id]", back_populates="sender")
    received_messages = relationship("Message", foreign_keys="[Message.recipient_id]", back_populates="recipient")
