from pydantic import BaseModel
import uuid
from typing import Optional

class SchoolBase(BaseModel):
    name: str
    code: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    principal_name: Optional[str] = None


class SchoolCreate(SchoolBase):
    pass

class SchoolUpdate(SchoolBase):
    sms_api_key: Optional[str] = None
    is_offline: Optional[bool] = None

class School(SchoolBase):
    id: uuid.UUID
    is_active: bool
    is_offline: bool = False
    currency: str
    sms_api_key: Optional[str] = None
    logo_url: Optional[str] = None
    license_expires_at: Optional[str] = None

    class Config:
        orm_mode = True
