"""
Report Card / Progress Card PDF Generation Service

Generates professional report cards with subject-wise marks, grades, and performance analysis.
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.platypus import Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet
from io import BytesIO
from datetime import datetime
from typing import Optional, List, Dict
import os

class ReportCardService:
    """Service for generating professional report cards / progress cards"""

    # Constants for layout
    PAGE_WIDTH, PAGE_HEIGHT = A4
    MARGIN = 0.5 * inch
    LOGO_SIZE = 0.8 * inch

    @staticmethod
    def generate_report_card(
        student_name: str,
        admission_number: str,
        class_name: str,
        father_name: Optional[str],
        exam_series_name: str,
        exam_type: str,
        academic_year: str,
        marks_data: List[Dict],  # List of {subject_name, marks_obtained, max_marks, grade, is_absent}
        total_marks_obtained: float,
        total_max_marks: float,
        percentage: float,
        overall_grade: str,
        attendance_percentage: Optional[float],
        teacher_remarks: Optional[str],
        school_name: str,
        school_logo_path: Optional[str] = None
    ) -> BytesIO:
        """
        Generate a professional report card PDF.

        Args:
            student_name: Full name of the student
            admission_number: Student's admission number
            class_name: Class name
            father_name: Father's name
            exam_series_name: Name of the exam series
            exam_type: Type of exam
            academic_year: Academic year (e.g., "2024-25")
            marks_data: List of subject marks dictionaries
            total_marks_obtained: Total marks obtained
            total_max_marks: Total maximum marks
            percentage: Overall percentage
            overall_grade: Overall grade
            attendance_percentage: Attendance percentage (optional)
            teacher_remarks: Teacher's remarks (optional)
            school_name: Name of the school
            school_logo_path: Optional path to school logo image

        Returns:
            BytesIO buffer containing the PDF
        """
        buffer = BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=A4)

        # Draw header with school info
        y_position = ReportCardService._draw_header(
            pdf, school_name, exam_series_name, academic_year, school_logo_path
        )

        # Draw student details
        y_position = ReportCardService._draw_student_details(
            pdf, student_name, admission_number, class_name, father_name, y_position
        )

        # Draw marks table
        y_position = ReportCardService._draw_marks_table(
            pdf, marks_data, y_position
        )

        # Draw summary
        y_position = ReportCardService._draw_summary(
            pdf, total_marks_obtained, total_max_marks, percentage,
            overall_grade, attendance_percentage, y_position
        )

        # Draw teacher remarks
        y_position = ReportCardService._draw_remarks(
            pdf, teacher_remarks, y_position
        )

        # Draw signature boxes
        ReportCardService._draw_signature_boxes(pdf, y_position)

        # Finalize PDF
        pdf.save()
        buffer.seek(0)
        return buffer

    @staticmethod
    def _draw_header(pdf, school_name, exam_name, academic_year, logo_path):
        """Draw school logo and report card header"""
        y_pos = ReportCardService.PAGE_HEIGHT - ReportCardService.MARGIN

        # Draw logo if provided
        if logo_path and os.path.exists(logo_path):
            try:
                pdf.drawImage(
                    logo_path,
                    ReportCardService.MARGIN,
                    y_pos - ReportCardService.LOGO_SIZE,
                    width=ReportCardService.LOGO_SIZE,
                    height=ReportCardService.LOGO_SIZE,
                    preserveAspectRatio=True
                )
            except Exception:
                pass

        # School name
        pdf.setFont("Helvetica-Bold", 18)
        pdf.drawCentredString(
            ReportCardService.PAGE_WIDTH / 2,
            y_pos - 10,
            school_name
        )

        # Academic year
        pdf.setFont("Helvetica", 11)
        pdf.drawCentredString(
            ReportCardService.PAGE_WIDTH / 2,
            y_pos - 30,
            f"Academic Year: {academic_year}"
        )

        # "PROGRESS REPORT" title
        pdf.setFont("Helvetica-Bold", 16)
        pdf.setFillColor(colors.HexColor("#1890ff"))
        pdf.drawCentredString(
            ReportCardService.PAGE_WIDTH / 2,
            y_pos - 55,
            "PROGRESS REPORT"
        )
        pdf.setFillColor(colors.black)

        # Exam name
        pdf.setFont("Helvetica-Bold", 12)
        pdf.drawCentredString(
            ReportCardService.PAGE_WIDTH / 2,
            y_pos - 75,
            exam_name
        )

        # Draw horizontal line
        pdf.line(
            ReportCardService.MARGIN,
            y_pos - 85,
            ReportCardService.PAGE_WIDTH - ReportCardService.MARGIN,
            y_pos - 85
        )

        return y_pos - 100

    @staticmethod
    def _draw_student_details(pdf, student_name, admission_number, class_name, father_name, y_pos):
        """Draw student information"""

        pdf.setFont("Helvetica-Bold", 10)
        details_x = ReportCardService.MARGIN + 20
        line_height = 18

        # Name
        pdf.drawString(details_x, y_pos, "Student Name:")
        pdf.setFont("Helvetica", 10)
        pdf.drawString(details_x + 100, y_pos, student_name)

        # Admission Number
        pdf.setFont("Helvetica-Bold", 10)
        pdf.drawString(details_x + 300, y_pos, "Admission No:")
        pdf.setFont("Helvetica", 10)
        pdf.drawString(details_x + 390, y_pos, admission_number)

        # Class
        pdf.setFont("Helvetica-Bold", 10)
        pdf.drawString(details_x, y_pos - line_height, "Class:")
        pdf.setFont("Helvetica", 10)
        pdf.drawString(details_x + 100, y_pos - line_height, class_name)

        # Father's Name
        if father_name:
            pdf.setFont("Helvetica-Bold", 10)
            pdf.drawString(details_x + 300, y_pos - line_height, "Father's Name:")
            pdf.setFont("Helvetica", 10)
            pdf.drawString(details_x + 390, y_pos - line_height, father_name)

        return y_pos - (line_height * 2) - 15

    @staticmethod
    def _draw_marks_table(pdf, marks_data, y_pos):
        """Draw subject-wise marks table"""

        pdf.setFont("Helvetica-Bold", 11)
        pdf.drawString(ReportCardService.MARGIN + 20, y_pos, "Subject-wise Performance:")
        y_pos -= 20

        # Prepare table data
        table_data = [
            ["S.No", "Subject", "Max Marks", "Marks Obtained", "Grade", "Status"]
        ]

        for idx, mark in enumerate(marks_data, 1):
            status = "Absent" if mark.get('is_absent') else "Present"
            marks_obtained = "-" if mark.get('is_absent') else str(mark.get('marks_obtained', '-'))
            grade = "-" if mark.get('is_absent') else mark.get('grade', '-')

            table_data.append([
                str(idx),
                mark.get('subject_name', 'N/A'),
                str(mark.get('max_marks', 0)),
                marks_obtained,
                grade,
                status
            ])

        # Create table
        col_widths = [0.5*inch, 2.5*inch, 1.0*inch, 1.3*inch, 0.8*inch, 0.9*inch]
        table = Table(table_data, colWidths=col_widths)
        table.setStyle(TableStyle([
            # Header row
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1890ff")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
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
            # Subject name left aligned
            ('ALIGN', (1, 1), (1, -1), 'LEFT'),
        ]))

        # Calculate table height and draw
        table_width, table_height = table.wrap(0, 0)
        table.drawOn(pdf, ReportCardService.MARGIN + 10, y_pos - table_height)

        return y_pos - table_height - 20

    @staticmethod
    def _draw_summary(pdf, total_obtained, total_max, percentage, overall_grade, attendance, y_pos):
        """Draw performance summary"""

        # Draw summary box
        box_width = ReportCardService.PAGE_WIDTH - (2 * ReportCardService.MARGIN) - 20
        box_height = 80 if attendance else 65
        box_x = ReportCardService.MARGIN + 10

        # Background box
        pdf.setFillColor(colors.HexColor("#f5f5f5"))
        pdf.rect(box_x, y_pos - box_height, box_width, box_height, fill=1, stroke=0)
        pdf.setFillColor(colors.black)

        # Header
        pdf.setFont("Helvetica-Bold", 11)
        pdf.drawString(box_x + 10, y_pos - 18, "Overall Performance Summary")

        y_offset = 38
        pdf.setFont("Helvetica", 10)

        # Total marks
        pdf.drawString(box_x + 20, y_pos - y_offset, f"Total Marks:")
        pdf.drawString(box_x + 150, y_pos - y_offset, f"{total_obtained} / {total_max}")

        y_offset += 15

        # Percentage
        pdf.drawString(box_x + 20, y_pos - y_offset, f"Percentage:")
        pdf.setFont("Helvetica-Bold", 10)
        pdf.drawString(box_x + 150, y_pos - y_offset, f"{percentage:.2f}%")
        pdf.setFont("Helvetica", 10)

        y_offset += 15

        # Overall Grade
        pdf.drawString(box_x + 20, y_pos - y_offset, f"Overall Grade:")
        pdf.setFont("Helvetica-Bold", 11)
        pdf.setFillColor(colors.HexColor("#1890ff"))
        pdf.drawString(box_x + 150, y_pos - y_offset, overall_grade)
        pdf.setFillColor(colors.black)
        pdf.setFont("Helvetica", 10)

        # Attendance if provided
        if attendance is not None:
            y_offset += 15
            pdf.drawString(box_x + 20, y_pos - y_offset, f"Attendance:")
            pdf.drawString(box_x + 150, y_pos - y_offset, f"{attendance:.1f}%")

        return y_pos - box_height - 15

    @staticmethod
    def _draw_remarks(pdf, remarks, y_pos):
        """Draw teacher remarks section"""

        if not remarks:
            remarks = "Keep up the good work!"

        pdf.setFont("Helvetica-Bold", 10)
        pdf.drawString(ReportCardService.MARGIN + 20, y_pos, "Teacher's Remarks:")
        y_pos -= 15

        # Draw remarks box
        box_width = ReportCardService.PAGE_WIDTH - (2 * ReportCardService.MARGIN) - 20
        box_height = 50
        box_x = ReportCardService.MARGIN + 10

        pdf.setStrokeColor(colors.grey)
        pdf.rect(box_x, y_pos - box_height, box_width, box_height, fill=0, stroke=1)

        # Draw remarks text
        pdf.setFont("Helvetica-Oblique", 9)
        text_width = box_width - 20

        # Wrap text
        words = remarks.split()
        lines = []
        current_line = []

        for word in words:
            current_line.append(word)
            test_line = ' '.join(current_line)
            if pdf.stringWidth(test_line, "Helvetica-Oblique", 9) > text_width:
                current_line.pop()
                lines.append(' '.join(current_line))
                current_line = [word]

        if current_line:
            lines.append(' '.join(current_line))

        # Draw lines
        text_y = y_pos - 18
        for line in lines[:3]:  # Limit to 3 lines
            pdf.drawString(box_x + 10, text_y, line)
            text_y -= 12

        return y_pos - box_height - 20

    @staticmethod
    def _draw_signature_boxes(pdf, y_pos):
        """Draw signature boxes at the bottom"""

        # Use fixed position for signatures
        sig_y = 1.8 * inch

        # Left signature box (Class Teacher)
        left_x = ReportCardService.MARGIN + 40
        pdf.line(left_x, sig_y, left_x + 1.3*inch, sig_y)
        pdf.setFont("Helvetica", 8)
        pdf.drawString(left_x + 10, sig_y - 12, "Class Teacher")

        # Middle signature box (Parent)
        mid_x = ReportCardService.PAGE_WIDTH / 2 - 0.65*inch
        pdf.line(mid_x, sig_y, mid_x + 1.3*inch, sig_y)
        pdf.drawString(mid_x + 15, sig_y - 12, "Parent/Guardian")

        # Right signature box (Principal)
        right_x = ReportCardService.PAGE_WIDTH - ReportCardService.MARGIN - 1.3*inch - 40
        pdf.line(right_x, sig_y, right_x + 1.3*inch, sig_y)
        pdf.drawString(right_x + 25, sig_y - 12, "Principal")

        # Footer note
        pdf.setFont("Helvetica-Oblique", 8)
        pdf.setFillColor(colors.grey)
        pdf.drawCentredString(
            ReportCardService.PAGE_WIDTH / 2,
            0.7 * inch,
            f"Report generated on {datetime.now().strftime('%d-%b-%Y')}"
        )

        # Grading scale note
        pdf.setFont("Helvetica", 7)
        pdf.drawString(
            ReportCardService.MARGIN + 20,
            0.5 * inch,
            "Grading Scale: A+ (90-100) | A (80-89) | B+ (70-79) | B (60-69) | C (50-59) | D (40-49) | F (<40)"
        )
