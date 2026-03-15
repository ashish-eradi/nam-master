from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
import uuid

from app.api.deps import get_db, get_current_user_school
from app.models.calendar import CalendarEvent as CalendarEventModel
from app.schemas.calendar_schema import CalendarEvent, CalendarEventCreate, CalendarEventUpdate
from app.core.utils import tenant_aware_query

router = APIRouter()


@router.get("/events", response_model=List[CalendarEvent])
def get_calendar_events(
    academic_year: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Get all calendar events for a school, optionally filtered by academic year or date range."""
    query = tenant_aware_query(db, CalendarEventModel, school_id)

    if academic_year:
        query = query.filter(CalendarEventModel.academic_year == academic_year)

    if start_date:
        query = query.filter(CalendarEventModel.end_date >= start_date)

    if end_date:
        query = query.filter(CalendarEventModel.start_date <= end_date)

    events = query.order_by(CalendarEventModel.start_date).all()
    return events


@router.post("/events", response_model=CalendarEvent)
def create_calendar_event(
    event: CalendarEventCreate,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Create a new calendar event."""
    if event.school_id != school_id:
        raise HTTPException(status_code=403, detail="Cannot create event for another school")

    if event.end_date < event.start_date:
        raise HTTPException(status_code=400, detail="End date must be after start date")

    db_event = CalendarEventModel(**event.model_dump())
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event


@router.put("/events/{event_id}", response_model=CalendarEvent)
def update_calendar_event(
    event_id: str,
    event: CalendarEventUpdate,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Update a calendar event."""
    db_event = tenant_aware_query(db, CalendarEventModel, school_id).filter(
        CalendarEventModel.id == event_id
    ).first()

    if not db_event:
        raise HTTPException(status_code=404, detail="Event not found")

    update_data = event.model_dump(exclude_unset=True)

    # Validate dates if both are being updated
    start = update_data.get('start_date', db_event.start_date)
    end = update_data.get('end_date', db_event.end_date)
    if end < start:
        raise HTTPException(status_code=400, detail="End date must be after start date")

    for key, value in update_data.items():
        setattr(db_event, key, value)

    db.commit()
    db.refresh(db_event)
    return db_event


@router.delete("/events/{event_id}")
def delete_calendar_event(
    event_id: str,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Delete a calendar event."""
    db_event = tenant_aware_query(db, CalendarEventModel, school_id).filter(
        CalendarEventModel.id == event_id
    ).first()

    if not db_event:
        raise HTTPException(status_code=404, detail="Event not found")

    db.delete(db_event)
    db.commit()
    return {"message": "Event deleted successfully"}


@router.get("/events/{event_id}", response_model=CalendarEvent)
def get_calendar_event(
    event_id: str,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Get a single calendar event by ID."""
    db_event = tenant_aware_query(db, CalendarEventModel, school_id).filter(
        CalendarEventModel.id == event_id
    ).first()

    if not db_event:
        raise HTTPException(status_code=404, detail="Event not found")

    return db_event


@router.get("/holidays")
def get_holidays(
    academic_year: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Get all holidays (days when school is closed) for attendance marking."""
    query = tenant_aware_query(db, CalendarEventModel, school_id).filter(
        CalendarEventModel.is_school_closed == "yes"
    )

    if academic_year:
        query = query.filter(CalendarEventModel.academic_year == academic_year)

    if start_date:
        query = query.filter(CalendarEventModel.end_date >= start_date)

    if end_date:
        query = query.filter(CalendarEventModel.start_date <= end_date)

    holidays = query.order_by(CalendarEventModel.start_date).all()

    # Return list of dates when school is closed
    closed_dates = []
    for holiday in holidays:
        current_date = holiday.start_date
        while current_date <= holiday.end_date:
            closed_dates.append({
                "date": current_date.isoformat(),
                "title": holiday.title,
                "event_type": holiday.event_type
            })
            current_date = date.fromordinal(current_date.toordinal() + 1)

    return closed_dates
