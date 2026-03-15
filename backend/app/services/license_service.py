import uuid
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import jwt, JWTError
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.core.config import settings
from app.models.license_key import LicenseKey
from app.models.school import School


LICENSE_SECRET = settings.LICENSE_SECRET_KEY
LICENSE_ALGORITHM = "HS256"


def generate_license_key(
    db: Session,
    school_id: uuid.UUID,
    validity_days: int,
    issued_by_user_id: uuid.UUID,
    notes: Optional[str] = None,
) -> tuple[str, datetime, str]:
    """Generate a JWT license key for a school. Returns (key_string, expires_at, school_name)."""
    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=validity_days)

    claims = {
        "school_id": str(school_id),
        "iat": now,
        "exp": expires_at,
        "type": "license",
    }

    key_string = jwt.encode(claims, LICENSE_SECRET, algorithm=LICENSE_ALGORITHM)
    key_hash = hashlib.sha256(key_string.encode()).hexdigest()

    license_record = LicenseKey(
        id=uuid.uuid4(),
        school_id=school_id,
        key_hash=key_hash,
        expires_at=expires_at,
        issued_by=issued_by_user_id,
        notes=notes,
    )
    db.add(license_record)
    db.commit()
    db.refresh(license_record)

    return key_string, expires_at, school.name


def validate_license_key(key_string: str) -> dict:
    """Decode and validate a JWT license key. Returns decoded claims or raises HTTPException."""
    try:
        payload = jwt.decode(key_string, LICENSE_SECRET, algorithms=[LICENSE_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired license key")

    if payload.get("type") != "license":
        raise HTTPException(status_code=400, detail="Invalid license key type")

    return payload


def activate_license(db: Session, school_id: uuid.UUID, key_string: str) -> dict:
    """Validate key, match school, update school license fields. Returns license status dict."""
    payload = validate_license_key(key_string)

    key_school_id = payload.get("school_id")
    if str(school_id) != key_school_id:
        raise HTTPException(status_code=400, detail="License key does not match this school")

    key_hash = hashlib.sha256(key_string.encode()).hexdigest()

    # Check if this key has been revoked
    license_record = db.query(LicenseKey).filter(LicenseKey.key_hash == key_hash).first()
    if license_record and license_record.is_revoked:
        raise HTTPException(status_code=400, detail="This license key has been revoked")

    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    now = datetime.now(timezone.utc)
    expires_at = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)

    school.license_expires_at = expires_at
    school.license_activated_at = now
    db.commit()
    db.refresh(school)

    days_remaining = max(0, (expires_at - now).days)

    return {
        "is_licensed": True,
        "license_expires_at": expires_at,
        "days_remaining": days_remaining,
        "is_expired": False,
    }


def check_license_valid(db: Session, school_id: uuid.UUID) -> bool:
    """Check if a school's license is currently valid."""
    school = db.query(School).filter(School.id == school_id).first()
    if not school or not school.license_expires_at:
        return True  # No license requirement if not set
    return school.license_expires_at > datetime.now(timezone.utc)


def get_license_status(db: Session, school_id: uuid.UUID) -> dict:
    """Get the current license status for a school."""
    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    now = datetime.now(timezone.utc)

    if not school.license_expires_at:
        return {
            "is_licensed": False,
            "license_expires_at": None,
            "days_remaining": None,
            "is_expired": False,
        }

    is_expired = school.license_expires_at < now
    days_remaining = max(0, (school.license_expires_at - now).days) if not is_expired else 0

    return {
        "is_licensed": True,
        "license_expires_at": school.license_expires_at,
        "days_remaining": days_remaining,
        "is_expired": is_expired,
    }


def revoke_license(db: Session, license_id: uuid.UUID) -> LicenseKey:
    """Revoke a license key by ID."""
    license_record = db.query(LicenseKey).filter(LicenseKey.id == license_id).first()
    if not license_record:
        raise HTTPException(status_code=404, detail="License key not found")

    license_record.is_revoked = True
    license_record.revoked_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(license_record)

    return license_record
