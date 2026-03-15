from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import shutil
import uuid
from pathlib import Path
from datetime import datetime, timezone

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.student import Student
from app.models.teacher import Teacher

router = APIRouter()

# Create uploads directory if it doesn't exist
UPLOAD_DIR = Path("/app/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {
    "images": {".jpg", ".jpeg", ".png", ".gif", ".webp"},
    "documents": {".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"}
}

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


def validate_file(file: UploadFile, file_type: str = "images") -> None:
    """Validate file extension and size"""
    file_ext = Path(file.filename).suffix.lower()

    if file_ext not in ALLOWED_EXTENSIONS[file_type]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS[file_type])}"
        )


def save_upload_file(upload_file: UploadFile, subfolder: str) -> str:
    """Save uploaded file and return relative path"""
    # Generate unique filename
    file_ext = Path(upload_file.filename).suffix
    unique_filename = f"{uuid.uuid4()}{file_ext}"

    # Create subfolder
    save_dir = UPLOAD_DIR / subfolder
    save_dir.mkdir(parents=True, exist_ok=True)

    # Save file
    file_path = save_dir / unique_filename
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(upload_file.file, buffer)

    # Return relative path
    return f"/uploads/{subfolder}/{unique_filename}"


@router.post("/student-photo/{student_id}")
async def upload_student_photo(
    student_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload student photo"""
    # Validate file
    validate_file(file, "images")

    # Get student
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Check permissions
    if current_user.role not in ["SUPERADMIN", "ADMIN"]:
        if not (current_user.school_id == student.school_id):
            raise HTTPException(status_code=403, detail="Not authorized")

    # Delete old photo if exists
    if student.photo_url and student.photo_url.startswith("/uploads/"):
        old_path = UPLOAD_DIR / student.photo_url.replace("/uploads/", "")
        if old_path.exists():
            old_path.unlink()

    # Save new photo
    photo_url = save_upload_file(file, f"students/{student_id}")

    # Update database
    student.photo_url = photo_url
    db.commit()

    return {"photo_url": photo_url, "message": "Photo uploaded successfully"}


@router.post("/student-document/{student_id}")
async def upload_student_document(
    student_id: str,
    document_type: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload student document (birth certificate, ID proof, etc.)"""
    # Validate file
    validate_file(file, "documents")

    # Get student
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Check permissions
    if current_user.role not in ["SUPERADMIN", "ADMIN"]:
        if not (current_user.school_id == student.school_id):
            raise HTTPException(status_code=403, detail="Not authorized")

    # Save document
    doc_url = save_upload_file(file, f"students/{student_id}/documents")

    # Update documents JSON
    if student.documents is None:
        student.documents = {}

    student.documents[document_type] = {
        "url": doc_url,
        "filename": file.filename,
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    }

    db.commit()

    return {"document_url": doc_url, "message": f"{document_type} uploaded successfully"}


@router.post("/teacher-photo/{teacher_id}")
async def upload_teacher_photo(
    teacher_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload teacher/staff photo"""
    # Validate file
    validate_file(file, "images")

    # Get teacher
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    # Check permissions
    if current_user.role not in ["SUPERADMIN", "ADMIN"]:
        if not (current_user.school_id == teacher.school_id):
            raise HTTPException(status_code=403, detail="Not authorized")

    # Delete old photo if exists
    if teacher.photo_url and teacher.photo_url.startswith("/uploads/"):
        old_path = UPLOAD_DIR / teacher.photo_url.replace("/uploads/", "")
        if old_path.exists():
            old_path.unlink()

    # Save new photo
    photo_url = save_upload_file(file, f"teachers/{teacher_id}")

    # Update database
    teacher.photo_url = photo_url
    db.commit()

    return {"photo_url": photo_url, "message": "Photo uploaded successfully"}


@router.post("/teacher-document/{teacher_id}")
async def upload_teacher_document(
    teacher_id: str,
    document_type: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload teacher/staff document (resume, certificates, etc.)"""
    # Validate file
    validate_file(file, "documents")

    # Get teacher
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    # Check permissions
    if current_user.role not in ["SUPERADMIN", "ADMIN"]:
        if not (current_user.school_id == teacher.school_id):
            raise HTTPException(status_code=403, detail="Not authorized")

    # Save document
    doc_url = save_upload_file(file, f"teachers/{teacher_id}/documents")

    # Update documents JSON
    if teacher.documents is None:
        teacher.documents = {}

    teacher.documents[document_type] = {
        "url": doc_url,
        "filename": file.filename,
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    }

    db.commit()

    return {"document_url": doc_url, "message": f"{document_type} uploaded successfully"}


@router.delete("/student-document/{student_id}/{document_type}")
async def delete_student_document(
    student_id: str,
    document_type: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a student document"""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if student.documents and document_type in student.documents:
        doc_url = student.documents[document_type]["url"]
        # Delete file
        if doc_url.startswith("/uploads/"):
            file_path = UPLOAD_DIR / doc_url.replace("/uploads/", "")
            if file_path.exists():
                file_path.unlink()

        # Remove from database
        del student.documents[document_type]
        db.commit()

        return {"message": f"{document_type} deleted successfully"}

    raise HTTPException(status_code=404, detail="Document not found")


@router.delete("/teacher-document/{teacher_id}/{document_type}")
async def delete_teacher_document(
    teacher_id: str,
    document_type: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a teacher document"""
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    if teacher.documents and document_type in teacher.documents:
        doc_url = teacher.documents[document_type]["url"]
        # Delete file
        if doc_url.startswith("/uploads/"):
            file_path = UPLOAD_DIR / doc_url.replace("/uploads/", "")
            if file_path.exists():
                file_path.unlink()

        # Remove from database
        del teacher.documents[document_type]
        db.commit()

        return {"message": f"{document_type} deleted successfully"}

    raise HTTPException(status_code=404, detail="Document not found")


@router.get("/file/{file_type}/{entity_id}/{filename}")
async def get_file(
    file_type: str,  # students or teachers
    entity_id: str,
    filename: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Serve uploaded files"""
    file_path = UPLOAD_DIR / file_type / entity_id / filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(file_path)
