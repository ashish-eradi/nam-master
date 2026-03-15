import uuid
from sqlalchemy import Column, String, ForeignKey, DateTime, JSON, Text
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base
from sqlalchemy.sql import func

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)  # CREATE, UPDATE, DELETE, LOGIN, LOGOUT, etc.
    resource_type = Column(String(100), nullable=False)  # Student, Fee, Payment, etc.
    resource_id = Column(String(100), nullable=True)  # ID of the affected resource
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(Text, nullable=True)
    old_value = Column(JSON, nullable=True)  # Previous state
    new_value = Column(JSON, nullable=True)  # New state
    description = Column(Text, nullable=True)
    status = Column(String(20), default="SUCCESS")  # SUCCESS, FAILED
    created_at = Column(DateTime(timezone=True), server_default=func.now())
