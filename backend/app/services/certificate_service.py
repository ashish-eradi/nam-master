"""
Certificate Generation Service

Generates various types of certificates: Transfer Certificate, Bonafide, Character Certificate, etc.
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.lib.styles import getSampleStyleSheet
from io import BytesIO
from datetime import datetime
from typing import Optional
import os

class CertificateService:
    """Service for generating professional certificates"""

    # Constants for layout
    PAGE_WIDTH, PAGE_HEIGHT = A4
    MARGIN = 0.75 * inch
    LOGO_SIZE = 1 * inch

    @staticmethod
    def generate_transfer_certificate(
        student_name: str,
        father_name: str,
        mother_name: str,
        admission_number: str,
        class_name: str,
        date_of_birth: str,
        date_of_admission: str,
        date_of_leaving: str,
        reason_for_leaving: str,
        conduct: str,
        remarks: Optional[str],
        school_name: str,
        school_address: str,
        school_logo_path: Optional[str] = None,
        tc_number: Optional[str] = None
    ) -> BytesIO:
        """Generate Transfer Certificate PDF"""
        buffer = BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=A4)

        # Draw header
        y_position = CertificateService._draw_header(
            pdf, school_name, school_address, "TRANSFER CERTIFICATE", school_logo_path
        )

        # TC Number
        if tc_number:
            pdf.setFont("Helvetica", 10)
            pdf.drawString(CertificateService.MARGIN, y_position, f"TC No: {tc_number}")
            y_position -= 25

        # Certificate content
        y_position = CertificateService._draw_field(
            pdf, "Student Name", student_name, y_position
        )
        y_position = CertificateService._draw_field(
            pdf, "Father's Name", father_name, y_position
        )
        y_position = CertificateService._draw_field(
            pdf, "Mother's Name", mother_name, y_position
        )
        y_position = CertificateService._draw_field(
            pdf, "Admission Number", admission_number, y_position
        )
        y_position = CertificateService._draw_field(
            pdf, "Class", class_name, y_position
        )
        y_position = CertificateService._draw_field(
            pdf, "Date of Birth", date_of_birth, y_position
        )
        y_position = CertificateService._draw_field(
            pdf, "Date of Admission", date_of_admission, y_position
        )
        y_position = CertificateService._draw_field(
            pdf, "Date of Leaving", date_of_leaving, y_position
        )
        y_position = CertificateService._draw_field(
            pdf, "Reason for Leaving", reason_for_leaving, y_position
        )
        y_position = CertificateService._draw_field(
            pdf, "Conduct", conduct, y_position
        )

        if remarks:
            y_position = CertificateService._draw_field(
                pdf, "Remarks", remarks, y_position
            )

        # Signature
        CertificateService._draw_signature(pdf, y_position)

        pdf.save()
        buffer.seek(0)
        return buffer

    @staticmethod
    def generate_bonafide_certificate(
        student_name: str,
        father_name: str,
        admission_number: str,
        class_name: str,
        academic_year: str,
        purpose: str,
        school_name: str,
        school_address: str,
        school_logo_path: Optional[str] = None,
        certificate_number: Optional[str] = None
    ) -> BytesIO:
        """Generate Bonafide Certificate PDF"""
        buffer = BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=A4)

        # Draw header
        y_position = CertificateService._draw_header(
            pdf, school_name, school_address, "BONAFIDE CERTIFICATE", school_logo_path
        )

        # Certificate Number
        if certificate_number:
            pdf.setFont("Helvetica", 10)
            pdf.drawString(CertificateService.MARGIN, y_position, f"Certificate No: {certificate_number}")
            pdf.drawRightString(
                CertificateService.PAGE_WIDTH - CertificateService.MARGIN,
                y_position,
                f"Date: {datetime.now().strftime('%d-%b-%Y')}"
            )
            y_position -= 40

        # Certificate body
        pdf.setFont("Helvetica", 11)
        body_text = [
            f"This is to certify that {student_name}, son/daughter of {father_name},",
            f"bearing Admission Number {admission_number}, is a bonafide student of this school,",
            f"studying in {class_name} for the academic year {academic_year}.",
            "",
            f"This certificate is issued for the purpose of {purpose}."
        ]

        for line in body_text:
            pdf.drawString(CertificateService.MARGIN + 20, y_position, line)
            y_position -= 20

        y_position -= 20

        # Signature
        CertificateService._draw_signature(pdf, y_position)

        pdf.save()
        buffer.seek(0)
        return buffer

    @staticmethod
    def generate_character_certificate(
        student_name: str,
        father_name: str,
        admission_number: str,
        class_name: str,
        date_of_leaving: str,
        character_remarks: str,
        school_name: str,
        school_address: str,
        school_logo_path: Optional[str] = None,
        certificate_number: Optional[str] = None
    ) -> BytesIO:
        """Generate Character Certificate PDF"""
        buffer = BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=A4)

        # Draw header
        y_position = CertificateService._draw_header(
            pdf, school_name, school_address, "CHARACTER CERTIFICATE", school_logo_path
        )

        # Certificate Number
        if certificate_number:
            pdf.setFont("Helvetica", 10)
            pdf.drawString(CertificateService.MARGIN, y_position, f"Certificate No: {certificate_number}")
            pdf.drawRightString(
                CertificateService.PAGE_WIDTH - CertificateService.MARGIN,
                y_position,
                f"Date: {datetime.now().strftime('%d-%b-%Y')}"
            )
            y_position -= 40

        # Certificate body
        pdf.setFont("Helvetica", 11)
        body_text = [
            f"This is to certify that {student_name}, son/daughter of {father_name},",
            f"bearing Admission Number {admission_number}, was a student of this school",
            f"in {class_name} until {date_of_leaving}.",
            "",
            f"Character and Conduct: {character_remarks}"
        ]

        for line in body_text:
            pdf.drawString(CertificateService.MARGIN + 20, y_position, line)
            y_position -= 20

        y_position -= 20

        # Signature
        CertificateService._draw_signature(pdf, y_position)

        pdf.save()
        buffer.seek(0)
        return buffer

    @staticmethod
    def _draw_header(pdf, school_name, school_address, title, logo_path):
        """Draw certificate header with school info and title"""
        y_pos = CertificateService.PAGE_HEIGHT - CertificateService.MARGIN

        # Draw logo if provided
        if logo_path and os.path.exists(logo_path):
            try:
                pdf.drawImage(
                    logo_path,
                    CertificateService.MARGIN,
                    y_pos - CertificateService.LOGO_SIZE,
                    width=CertificateService.LOGO_SIZE,
                    height=CertificateService.LOGO_SIZE,
                    preserveAspectRatio=True
                )
            except Exception:
                pass

        # School name
        pdf.setFont("Helvetica-Bold", 16)
        pdf.drawCentredString(
            CertificateService.PAGE_WIDTH / 2,
            y_pos - 20,
            school_name
        )

        # School address
        pdf.setFont("Helvetica", 10)
        pdf.drawCentredString(
            CertificateService.PAGE_WIDTH / 2,
            y_pos - 40,
            school_address
        )

        # Certificate title
        pdf.setFont("Helvetica-Bold", 14)
        pdf.setFillColor(colors.HexColor("#1890ff"))
        pdf.drawCentredString(
            CertificateService.PAGE_WIDTH / 2,
            y_pos - 70,
            title
        )
        pdf.setFillColor(colors.black)

        # Draw horizontal line
        pdf.line(
            CertificateService.MARGIN,
            y_pos - 80,
            CertificateService.PAGE_WIDTH - CertificateService.MARGIN,
            y_pos - 80
        )

        return y_pos - 100

    @staticmethod
    def _draw_field(pdf, label, value, y_pos):
        """Draw a labeled field"""
        pdf.setFont("Helvetica-Bold", 10)
        pdf.drawString(CertificateService.MARGIN + 40, y_pos, f"{label}:")

        pdf.setFont("Helvetica", 10)
        pdf.drawString(CertificateService.MARGIN + 180, y_pos, str(value))

        return y_pos - 22

    @staticmethod
    def _draw_signature(pdf, y_pos):
        """Draw signature section"""
        sig_y = 2.5 * inch

        # Left - Date
        pdf.setFont("Helvetica", 10)
        pdf.drawString(CertificateService.MARGIN + 40, sig_y, "Date: _______________")

        # Right - Principal Signature
        right_x = CertificateService.PAGE_WIDTH - CertificateService.MARGIN - 150
        pdf.line(right_x, sig_y + 10, right_x + 120, sig_y + 10)
        pdf.drawString(right_x + 10, sig_y - 10, "Principal's Signature")

        # School seal
        pdf.setFont("Helvetica", 9)
        pdf.drawString(CertificateService.MARGIN + 40, sig_y - 50, "School Seal")
        pdf.circle(CertificateService.MARGIN + 90, sig_y - 45, 30, stroke=1, fill=0)

        # Footer
        pdf.setFont("Helvetica-Oblique", 8)
        pdf.setFillColor(colors.grey)
        pdf.drawCentredString(
            CertificateService.PAGE_WIDTH / 2,
            0.5 * inch,
            "This is a computer-generated certificate."
        )
