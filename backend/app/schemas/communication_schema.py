from pydantic import BaseModel
import uuid
from typing import Optional, List
from datetime import datetime

class AnnouncementBase(BaseModel):
    title: str
    content: str
    school_id: uuid.UUID
    target_roles: Optional[List[str]] = None
    target_classes: Optional[List[uuid.UUID]] = None
    is_high_priority: Optional[bool] = False

class AnnouncementCreate(AnnouncementBase):
    pass

class AnnouncementUpdate(AnnouncementBase):
    pass

class Announcement(AnnouncementBase):
    id: uuid.UUID
    school_id: uuid.UUID
    created_by_user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

class MessageBase(BaseModel):
    recipient_id: uuid.UUID
    subject: Optional[str] = None
    content: str

class MessageCreate(MessageBase):
    pass

class MessageUpdate(BaseModel):
    is_read: bool

class Message(MessageBase):
    id: uuid.UUID
    sender_id: uuid.UUID
    is_read: bool
    created_at: datetime

    class Config:
        orm_mode = True
