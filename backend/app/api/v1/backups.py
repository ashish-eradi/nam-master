from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional, Dict
from pydantic import BaseModel
import uuid

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.services.backup_service import BackupService
from app.services.audit_service import AuditService


router = APIRouter()


class CreateBackupRequest(BaseModel):
    backup_type: str = "full"
    description: Optional[str] = None


class BackupResponse(BaseModel):
    backup_id: str
    filename: str
    file_size: int
    timestamp: str
    backup_type: str
    description: Optional[str]
    status: str


class BackupListItem(BaseModel):
    backup_id: str
    filename: str
    file_size: int
    timestamp: str
    backup_type: str
    description: Optional[str]
    modified_at: str
    tables_count: int


class RestoreBackupRequest(BaseModel):
    restore_options: Optional[Dict[str, bool]] = None


@router.post("/", response_model=BackupResponse)
async def create_backup(
    request: CreateBackupRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new backup of school data.
    Only accessible by ADMIN and SUPERADMIN roles.
    """
    # Check permissions
    if current_user.role not in ["ADMIN", "SUPERADMIN"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    # Get school ID
    school_id = current_user.school_id
    if not school_id:
        raise HTTPException(status_code=400, detail="User must be associated with a school")

    try:
        backup_metadata = BackupService.create_backup(
            db=db,
            school_id=school_id,
            backup_type=request.backup_type,
            description=request.description
        )

        # Log backup creation
        if school_id:
            await AuditService.log(
                db=db,
                school_id=school_id,
                action="CREATE",
                resource_type="Backup",
                resource_id=backup_metadata["backup_id"],
                user_id=current_user.id,
                description=f"Created backup: {backup_metadata['filename']}",
                new_value={"filename": backup_metadata["filename"], "size": backup_metadata["file_size"]}
            )

        return backup_metadata

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=List[BackupListItem])
def list_backups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List all backups for the current school.
    Only accessible by ADMIN and SUPERADMIN roles.
    """
    # Check permissions
    if current_user.role not in ["ADMIN", "SUPERADMIN"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    # Get school ID
    school_id = current_user.school_id
    if not school_id:
        raise HTTPException(status_code=400, detail="User must be associated with a school")

    try:
        backups = BackupService.list_backups(school_id=school_id)
        return backups

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{backup_id}/download")
async def download_backup(
    backup_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Download a specific backup file.
    Only accessible by ADMIN and SUPERADMIN roles.
    """
    # Check permissions
    if current_user.role not in ["ADMIN", "SUPERADMIN"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    # Get school ID
    school_id = current_user.school_id
    if not school_id:
        raise HTTPException(status_code=400, detail="User must be associated with a school")

    try:
        backup_path = BackupService.get_backup(backup_id=backup_id, school_id=school_id)

        if not backup_path:
            raise HTTPException(status_code=404, detail="Backup not found")

        # Log backup download
        await AuditService.log(
            db=db,
            school_id=school_id,
            action="DOWNLOAD",
            resource_type="Backup",
            resource_id=backup_id,
            user_id=current_user.id,
            description=f"Downloaded backup: {backup_id}"
        )

        # Return file
        import os
        filename = os.path.basename(backup_path)
        return FileResponse(
            path=backup_path,
            media_type="application/json",
            filename=filename
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{backup_id}")
async def delete_backup(
    backup_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete a backup.
    Only accessible by ADMIN and SUPERADMIN roles.
    """
    # Check permissions
    if current_user.role not in ["ADMIN", "SUPERADMIN"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    # Get school ID
    school_id = current_user.school_id
    if not school_id:
        raise HTTPException(status_code=400, detail="User must be associated with a school")

    try:
        BackupService.delete_backup(backup_id=backup_id, school_id=school_id)

        # Log backup deletion
        await AuditService.log(
            db=db,
            school_id=school_id,
            action="DELETE",
            resource_type="Backup",
            resource_id=backup_id,
            user_id=current_user.id,
            description=f"Deleted backup: {backup_id}"
        )

        return {"message": "Backup deleted successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{backup_id}/restore")
async def restore_backup(
    backup_id: str,
    request: RestoreBackupRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Restore data from a backup.
    Only accessible by ADMIN and SUPERADMIN roles.
    WARNING: This operation should be used with caution!
    """
    # Check permissions
    if current_user.role not in ["ADMIN", "SUPERADMIN"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    # Get school ID
    school_id = current_user.school_id
    if not school_id:
        raise HTTPException(status_code=400, detail="User must be associated with a school")

    try:
        result = BackupService.restore_backup(
            db=db,
            backup_id=backup_id,
            school_id=school_id,
            restore_options=request.restore_options
        )

        # Log backup restore
        await AuditService.log(
            db=db,
            school_id=school_id,
            action="RESTORE",
            resource_type="Backup",
            resource_id=backup_id,
            user_id=current_user.id,
            description=f"Restored backup: {backup_id}",
            new_value=result
        )

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
