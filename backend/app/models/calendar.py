from sqlalchemy import Column, String, Date, Enum as SQLEnum, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base
import uuid
import enum


class EventType(str, enum.Enum):
    HOLIDAY = "holiday"
    EXAM = "exam"
    EVENT = "event"
    MEETING = "meeting"
    WORKSHOP = "workshop"
    SPORTS = "sports"
    OTHER = "other"


class CalendarEvent(Base):
    __tablename__ = "calendar_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    event_type = Column(SQLEnum(EventType), nullable=False, default=EventType.EVENT)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    is_school_closed = Column(String, default="no")  # "yes" or "no"
    academic_year = Column(String, nullable=False)
    color = Column(String, default="#1890ff")  # Hex color for calendar display

    # Relationships
    school = relationship("School", back_populates="calendar_events")
