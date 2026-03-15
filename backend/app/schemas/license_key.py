from pydantic import BaseModel
import uuid
from typing import Optional
from datetime import datetime


class LicenseGenerate(BaseModel):
    school_id: uuid.UUID
    validity_days: int
    notes: Optional[str] = None


class LicenseActivate(BaseModel):
    license_key: str


class LicenseResponse(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    school_name: str
    issued_at: datetime
    expires_at: datetime
    is_revoked: bool
    notes: Optional[str] = None

    class Config:
        orm_mode = True


class LicenseKeyGenerated(BaseModel):
    license_key: str
    expires_at: datetime
    school_name: str


class LicenseStatus(BaseModel):
    is_licensed: bool
    license_expires_at: Optional[datetime] = None
    days_remaining: Optional[int] = None
    is_expired: bool
