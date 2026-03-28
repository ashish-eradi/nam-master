from sqlalchemy import Column, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func

Base = declarative_base()

class BaseModel(Base):
    __abstract__ = True
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

from app.models import assessment, attendance, audit_log, calendar, communication, enums, exam, exam_series, finance, grade, hostel, library, license_key, miscellaneous, notification, parent, class_model, school, student, subject, teacher, timetable, transport, user