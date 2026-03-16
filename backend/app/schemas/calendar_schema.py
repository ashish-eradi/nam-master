from pydantic import BaseModel
from datetime import date
from typing import Optional
from app.models.calendar import EventType


class CalendarEventBase(BaseModel):
    title: str
    description: Optional[str] = None
    event_type: EventType
    start_date: date
    end_date: date
    is_school_closed: str = "no"
    academic_year: str
    color: str = "#1890ff"


class CalendarEventCreate(CalendarEventBase):
    school_id: Optional[str] = None  # Set server-side from auth context


class CalendarEventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    event_type: Optional[EventType] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_school_closed: Optional[str] = None
    academic_year: Optional[str] = None
    color: Optional[str] = None


class CalendarEvent(CalendarEventBase):
    id: str
    school_id: str

    class Config:
        from_attributes = True
