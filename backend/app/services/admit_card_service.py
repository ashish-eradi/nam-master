"""
Admit Card / Hall Ticket PDF Generation Service

Generates professional admit cards for students with exam schedule, photo, and instructions.
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.platypus import Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet
from io import BytesIO
from datetime import datetime
from typing import Optional
import os

class AdmitCardService:
    """Service for generating professional admit cards / hall tickets"""

    # Constants for layout
    PAGE_WIDTH, PAGE_HEIGHT = A4
    MARGIN = 0.5 * inch
    LOGO_SIZE = 0.8 * inch

    @staticmethod
    def generate_admit_card(
        student_name: str,
        admission_number: str,
        class_name: str,
        father_name: Optional[str],
        exam_series_name: str,
        exam_type: str,
        start_date: str,
        end_date: str,
        schedule_items: list,
        instructions: Optional[str],
        school_name: str,
        school_logo_path: Optional[str] = None,
        student_photo_path: Optional[str] = None
    ) -> BytesIO:
        """
        Generate a professional admit card PDF.

        Args:
            student_name: Full name of the student
            admission_number: Student's admission number
            class_name: Class name
            father_name: Father's name
            exam_series_name: Name of the exam series
            exam_type: Type of exam
            start_date: Exam start date (formatted string)
            end_date: Exam end date (formatted string)
            schedule_items: List of exam schedule dictionaries with keys:
                - subject_name: str
                - exam_date: str (formatted)
                - start_time: str
                - duration_minutes: int
                - max_marks: float
                - room_number: str (optional)
            instructions: General instructions for the exam
            school_name: Name of the school
            school_logo_path: Optional path to school logo image
            student_photo_path: Optional path to student photo

        Returns:
            BytesIO buffer containing the PDF
        """
        buffer = BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=A4)

        # Draw header with school info
        y_position = AdmitCardService._draw_header(
            pdf, school_name, exam_series_name, exam_type, school_logo_path
        )

        # Draw student details and photo
        y_position = AdmitCardService._draw_student_details(
            pdf, student_name, admission_number, class_name,
            father_name, student_photo_path, y_position
        )

        # Draw exam schedule table
        y_position = AdmitCardService._draw_schedule_table(
            pdf, schedule_items, y_position
        )

        # Draw instructions
        y_position = AdmitCardService._draw_instructions(
            pdf, instructions, y_position
        )

        # Draw signature boxes
        AdmitCardService._draw_signature_boxes(pdf, y_position)

        # Finalize PDF
        pdf.save()
        buffer.seek(0)
        return buffer

    @staticmethod
    def _draw_header(pdf, school_name, exam_name, exam_type, logo_path):
        """Draw school logo and exam header"""
        y_pos = AdmitCardService.PAGE_HEIGHT - AdmitCardService.MARGIN

        # Draw logo if provided
        if logo_path and os.path.exists(logo_path):
            try:
                pdf.drawImage(
                    logo_path,
                    AdmitCardService.MARGIN,
                    y_pos - AdmitCardService.LOGO_SIZE,
                    width=AdmitCardService.LOGO_SIZE,
                    height=AdmitCardService.LOGO_SIZE,
                    preserveAspectRatio=True
                )
            except Exception:
                pass

        # School name
        pdf.setFont("Helvetica-Bold", 18)
        pdf.drawCentredString(
            AdmitCardService.PAGE_WIDTH / 2,
            y_pos - 10,
            school_name
        )

        # Exam name
        pdf.setFont("Helvetica-Bold", 14)
        pdf.drawCentredString(
            AdmitCardService.PAGE_WIDTH / 2,
            y_pos - 35,
            f"{exam_name}"
        )

        # "ADMIT CARD" title
        pdf.setFont("Helvetica-Bold", 16)
        pdf.setFillColor(colors.HexColor("#1890ff"))
        pdf.drawCentredString(
            AdmitCardService.PAGE_WIDTH / 2,
            y_pos - 60,
            "ADMIT CARD"
        )
        pdf.setFillColor(colors.black)

        # Draw horizontal line
        pdf.line(
            AdmitCardService.MARGIN,
            y_pos - 70,
            AdmitCardService.PAGE_WIDTH - AdmitCardService.MARGIN,
            y_pos - 70
        )

        return y_pos - 85

    @staticmethod
    def _draw_student_details(pdf, student_name, admission_number, class_name,
                              father_name, photo_path, y_pos):
        """Draw student information with photo"""

        photo_size = 1.2 * inch
        photo_x = AdmitCardService.PAGE_WIDTH - AdmitCardService.MARGIN - photo_size - 10

        # Draw student photo if provided
        if photo_path and os.path.exists(photo_path):
            try:
                pdf.drawImage(
                    photo_path,
                    photo_x,
                    y_pos - photo_size,
                    width=photo_size,
                    height=photo_size,
                    preserveAspectRatio=True
                )
                # Photo border
                pdf.rect(photo_x, y_pos - photo_size, photo_size, photo_size)
            except Exception:
                pass

        # Student details (left side)
        pdf.setFont("Helvetica-Bold", 11)
        details_x = AdmitCardService.MARGIN + 10
        line_height = 20

        # Name
        pdf.drawString(details_x, y_pos, "Student Name:")
        pdf.setFont("Helvetica", 11)
        pdf.drawString(details_x + 120, y_pos, student_name)

        # Admission Number
        pdf.setFont("Helvetica-Bold", 11)
        pdf.drawString(details_x, y_pos - line_height, "Admission Number:")
        pdf.setFont("Helvetica", 11)
        pdf.drawString(details_x + 120, y_pos - line_height, admission_number)

        # Class
        pdf.setFont("Helvetica-Bold", 11)
        pdf.drawString(details_x, y_pos - (line_height * 2), "Class:")
        pdf.setFont("Helvetica", 11)
        pdf.drawString(details_x + 120, y_pos - (line_height * 2), class_name)

        # Father's Name
        if father_name:
            pdf.setFont("Helvetica-Bold", 11)
            pdf.drawString(details_x, y_pos - (line_height * 3), "Father's Name:")
            pdf.setFont("Helvetica", 11)
            pdf.drawString(details_x + 120, y_pos - (line_height * 3), father_name)
            return y_pos - (line_height * 3) - 30

        return y_pos - (line_height * 2) - 30

    @staticmethod
    def _draw_schedule_table(pdf, schedule_items, y_pos):
        """Draw exam schedule as a table"""

        pdf.setFont("Helvetica-Bold", 12)
        pdf.drawString(AdmitCardService.MARGIN + 10, y_pos, "Examination Schedule:")
        y_pos -= 20

        # Prepare table data
        table_data = [
            ["Date", "Subject", "Time", "Duration", "Max Marks", "Room"]
        ]

        for item in schedule_items:
            duration_text = f"{item.get('duration_minutes', 0)} min"
            table_data.append([
                item.get('exam_date', 'N/A'),
                item.get('subject_name', 'N/A'),
                item.get('start_time', 'N/A'),
                duration_text,
                str(item.get('max_marks', 'N/A')),
                item.get('room_number', '-')
            ])

        # Create table
        table = Table(table_data, colWidths=[1.0*inch, 2.0*inch, 0.9*inch, 0.9*inch, 0.9*inch, 0.8*inch])
        table.setStyle(TableStyle([
            # Header row
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1890ff")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('TOPPADDING', (0, 0), (-1, 0), 8),
            # Data rows
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0f0f0")]),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
            ('TOPPADDING', (0, 1), (-1, -1), 6),
        ]))

        # Calculate table height and draw
        table_width, table_height = table.wrap(0, 0)
        table.drawOn(pdf, AdmitCardService.MARGIN, y_pos - table_height)

        return y_pos - table_height - 20

    @staticmethod
    def _draw_instructions(pdf, instructions, y_pos):
        """Draw exam instructions"""

        if not instructions:
            instructions = "Please bring this admit card on the day of examination. " \
                          "Candidates must reach the examination center 15 minutes before the exam start time."

        pdf.setFont("Helvetica-Bold", 11)
        pdf.drawString(AdmitCardService.MARGIN + 10, y_pos, "Instructions:")
        y_pos -= 15

        # Wrap text
        pdf.setFont("Helvetica", 9)
        text_width = AdmitCardService.PAGE_WIDTH - (2 * AdmitCardService.MARGIN) - 20

        # Split instructions into lines
        words = instructions.split()
        lines = []
        current_line = []

        for word in words:
            current_line.append(word)
            test_line = ' '.join(current_line)
            if pdf.stringWidth(test_line, "Helvetica", 9) > text_width:
                current_line.pop()
                lines.append(' '.join(current_line))
                current_line = [word]

        if current_line:
            lines.append(' '.join(current_line))

        # Draw lines
        for line in lines[:10]:  # Limit to 10 lines
            pdf.drawString(AdmitCardService.MARGIN + 10, y_pos, line)
            y_pos -= 12

        return y_pos - 10

    @staticmethod
    def _draw_signature_boxes(pdf, y_pos):
        """Draw signature boxes at the bottom"""

        # Use fixed position for signatures
        sig_y = 1.5 * inch

        # Left signature box (Student)
        left_x = AdmitCardService.MARGIN + 20
        pdf.line(left_x, sig_y, left_x + 1.5*inch, sig_y)
        pdf.setFont("Helvetica", 9)
        pdf.drawString(left_x + 10, sig_y - 15, "Student's Signature")

        # Right signature box (Principal)
        right_x = AdmitCardService.PAGE_WIDTH - AdmitCardService.MARGIN - 1.5*inch - 20
        pdf.line(right_x, sig_y, right_x + 1.5*inch, sig_y)
        pdf.drawString(right_x + 15, sig_y - 15, "Principal's Seal")

        # Footer note
        pdf.setFont("Helvetica-Oblique", 8)
        pdf.setFillColor(colors.grey)
        pdf.drawCentredString(
            AdmitCardService.PAGE_WIDTH / 2,
            0.5 * inch,
            "This is a system-generated admit card. No signature is required."
        )
