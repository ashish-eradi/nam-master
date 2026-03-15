from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, selectinload
from typing import Optional
import uuid
from app.core.database import get_db
from app.models.student import Student as StudentModel
from app.models.school import School as SchoolModel
from app.api.deps import get_current_user_school, get_current_user
from app.models.user import User
from app.core.utils import tenant_aware_query
from app.core.permissions import is_admin, is_admin_or_teacher

router = APIRouter()

def ensure_uuid(value):
    """Convert to UUID if string, otherwise return as-is"""
    return value if isinstance(value, uuid.UUID) else uuid.UUID(value)

# ===== Certificate Generation Endpoints =====

@router.get("/transfer-certificate/{student_id}/download", dependencies=[Depends(is_admin)])
def download_transfer_certificate(
    student_id: uuid.UUID,
    tc_number: Optional[str] = Query(None),
    date_of_leaving: Optional[str] = Query(None),
    reason_for_leaving: str = Query("On Request"),
    conduct: str = Query("Good"),
    remarks: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Generate and download Transfer Certificate for a student."""
    from app.services.certificate_service import CertificateService
    from datetime import datetime

    # Get student
    student = tenant_aware_query(db, StudentModel, school_id).options(
        selectinload(StudentModel.class_)
    ).filter(StudentModel.id == student_id).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Get school info
    school = db.query(SchoolModel).filter(SchoolModel.id == ensure_uuid(school_id)).first()
    school_name = school.name if school else "School"
    school_address = school.address if school and hasattr(school, 'address') else "Address"

    # Generate TC number if not provided
    if not tc_number:
        tc_number = f"TC-{student.admission_number}-{datetime.now().year}"

    # Use provided date or current date
    leaving_date = date_of_leaving if date_of_leaving else datetime.now().strftime("%d-%b-%Y")

    # Generate PDF
    pdf_buffer = CertificateService.generate_transfer_certificate(
        student_name=f"{student.first_name} {student.last_name}",
        father_name=student.father_name or "N/A",
        mother_name=student.mother_name or "N/A",
        admission_number=student.admission_number,
        class_name=student.class_.name if student.class_ else "N/A",
        date_of_birth=student.date_of_birth.strftime("%d-%b-%Y") if student.date_of_birth else "N/A",
        date_of_admission=student.admission_date.strftime("%d-%b-%Y") if student.admission_date else "N/A",
        date_of_leaving=leaving_date,
        reason_for_leaving=reason_for_leaving,
        conduct=conduct,
        remarks=remarks,
        school_name=school_name,
        school_address=school_address,
        school_logo_path=None,  # Can be configured later
        tc_number=tc_number
    )

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=transfer_certificate_{student.admission_number}.pdf"
        }
    )


@router.get("/bonafide-certificate/{student_id}/download", dependencies=[Depends(is_admin_or_teacher)])
def download_bonafide_certificate(
    student_id: uuid.UUID,
    purpose: str = Query(..., description="Purpose of the certificate"),
    certificate_number: Optional[str] = Query(None),
    academic_year: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Generate and download Bonafide Certificate for a student."""
    from app.services.certificate_service import CertificateService
    from datetime import datetime

    # Get student
    student = tenant_aware_query(db, StudentModel, school_id).options(
        selectinload(StudentModel.class_)
    ).filter(StudentModel.id == student_id).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Get school info
    school = db.query(SchoolModel).filter(SchoolModel.id == ensure_uuid(school_id)).first()
    school_name = school.name if school else "School"
    school_address = school.address if school and hasattr(school, 'address') else "Address"

    # Generate certificate number if not provided
    if not certificate_number:
        certificate_number = f"BC-{student.admission_number}-{datetime.now().year}"

    # Use provided academic year or generate current
    if not academic_year:
        current_year = datetime.now().year
        academic_year = f"{current_year}-{current_year + 1}"

    # Generate PDF
    pdf_buffer = CertificateService.generate_bonafide_certificate(
        student_name=f"{student.first_name} {student.last_name}",
        father_name=student.father_name or "N/A",
        admission_number=student.admission_number,
        class_name=student.class_.name if student.class_ else "N/A",
        academic_year=academic_year,
        purpose=purpose,
        school_name=school_name,
        school_address=school_address,
        school_logo_path=None,  # Can be configured later
        certificate_number=certificate_number
    )

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=bonafide_certificate_{student.admission_number}.pdf"
        }
    )


@router.get("/character-certificate/{student_id}/download", dependencies=[Depends(is_admin)])
def download_character_certificate(
    student_id: uuid.UUID,
    date_of_leaving: Optional[str] = Query(None),
    character_remarks: str = Query("Excellent"),
    certificate_number: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Generate and download Character Certificate for a student."""
    from app.services.certificate_service import CertificateService
    from datetime import datetime

    # Get student
    student = tenant_aware_query(db, StudentModel, school_id).options(
        selectinload(StudentModel.class_)
    ).filter(StudentModel.id == student_id).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Get school info
    school = db.query(SchoolModel).filter(SchoolModel.id == ensure_uuid(school_id)).first()
    school_name = school.name if school else "School"
    school_address = school.address if school and hasattr(school, 'address') else "Address"

    # Generate certificate number if not provided
    if not certificate_number:
        certificate_number = f"CC-{student.admission_number}-{datetime.now().year}"

    # Use provided date or current date
    leaving_date = date_of_leaving if date_of_leaving else datetime.now().strftime("%d-%b-%Y")

    # Generate PDF
    pdf_buffer = CertificateService.generate_character_certificate(
        student_name=f"{student.first_name} {student.last_name}",
        father_name=student.father_name or "N/A",
        admission_number=student.admission_number,
        class_name=student.class_.name if student.class_ else "N/A",
        date_of_leaving=leaving_date,
        character_remarks=character_remarks,
        school_name=school_name,
        school_address=school_address,
        school_logo_path=None,  # Can be configured later
        certificate_number=certificate_number
    )

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=character_certificate_{student.admission_number}.pdf"
        }
    )
