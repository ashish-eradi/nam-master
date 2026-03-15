import uuid
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.permissions import is_superadmin, is_admin_or_superadmin
from app.api.deps import get_current_user
from app.models.user import User
from app.models.license_key import LicenseKey
from app.models.school import School
from app.schemas.license_key import (
    LicenseGenerate,
    LicenseActivate,
    LicenseKeyGenerated,
    LicenseResponse,
    LicenseStatus,
)
from app.services import license_service

router = APIRouter()


# --- SuperAdmin endpoints ---

@router.post("/generate", response_model=LicenseKeyGenerated)
def generate_license(
    payload: LicenseGenerate,
    db: Session = Depends(get_db),
    current_user: User = Depends(is_superadmin),
):
    """Generate a new license key for a school (SuperAdmin only)."""
    key_string, expires_at, school_name = license_service.generate_license_key(
        db=db,
        school_id=payload.school_id,
        validity_days=payload.validity_days,
        issued_by_user_id=current_user.id,
        notes=payload.notes,
    )
    return LicenseKeyGenerated(
        license_key=key_string,
        expires_at=expires_at,
        school_name=school_name,
    )


@router.get("/", response_model=List[LicenseResponse])
def list_licenses(
    db: Session = Depends(get_db),
    current_user: User = Depends(is_superadmin),
):
    """List all license keys with school info (SuperAdmin only)."""
    licenses = (
        db.query(LicenseKey)
        .join(School, LicenseKey.school_id == School.id)
        .order_by(LicenseKey.created_at.desc())
        .all()
    )
    result = []
    for lic in licenses:
        result.append(
            LicenseResponse(
                id=lic.id,
                school_id=lic.school_id,
                school_name=lic.school.name,
                issued_at=lic.issued_at,
                expires_at=lic.expires_at,
                is_revoked=lic.is_revoked,
                notes=lic.notes,
            )
        )
    return result


@router.get("/school/{school_id}", response_model=LicenseStatus)
def get_school_license_status(
    school_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(is_superadmin),
):
    """Get license status for a specific school (SuperAdmin only)."""
    status = license_service.get_license_status(db, school_id)
    return LicenseStatus(**status)


@router.post("/{license_id}/revoke")
def revoke_license(
    license_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(is_superadmin),
):
    """Revoke a license key (SuperAdmin only)."""
    license_service.revoke_license(db, license_id)
    return {"detail": "License key revoked successfully"}


# --- Public offline endpoint (no auth) for Electron launcher ---

@router.get("/offline-status")
def get_offline_license_status(db: Session = Depends(get_db)):
    """
    Public endpoint for the Electron desktop launcher.
    Returns license status for the first (and only) school in the offline deployment.
    No authentication required — only the local machine can reach this endpoint.
    """
    school = db.query(School).first()
    if not school:
        return {"is_licensed": False, "license_expires_at": None, "days_remaining": None, "is_expired": False, "school_name": None}
    status = license_service.get_license_status(db, school.id)
    status["school_name"] = school.name
    return status


# --- School Admin endpoints ---

@router.post("/activate", response_model=LicenseStatus)
def activate_license(
    payload: LicenseActivate,
    db: Session = Depends(get_db),
    current_user: User = Depends(is_admin_or_superadmin),
):
    """Activate a license key for the current user's school."""
    school_id = current_user.school_id
    if not school_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="User is not associated with a school")
    result = license_service.activate_license(db, school_id, payload.license_key)
    return LicenseStatus(**result)


@router.get("/status", response_model=LicenseStatus)
def get_license_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get current license status for the logged-in user's school."""
    school_id = current_user.school_id
    if not school_id:
        return LicenseStatus(
            is_licensed=False,
            license_expires_at=None,
            days_remaining=None,
            is_expired=False,
        )
    status = license_service.get_license_status(db, school_id)
    return LicenseStatus(**status)
