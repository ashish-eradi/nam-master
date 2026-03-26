"""
Report Card / Progress Card PDF Generation Service

Generates professional report cards with subject-wise marks, grades, and performance analysis.
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.platypus import Table, TableStyle
from io import BytesIO
from datetime import datetime, date
from typing import Optional, List, Dict
import os


class ReportCardService:
    """Service for generating professional report cards / progress cards"""

    PAGE_WIDTH, PAGE_HEIGHT = A4
    MARGIN = 0.5 * inch
    LOGO_SIZE = 0.8 * inch

    @staticmethod
    def generate_report_card(
        student_name: str,
        admission_number: str,
        class_name: str,
        section: Optional[str],
        father_name: Optional[str],
        date_of_birth: Optional[date],
        roll_number: Optional[str],
        hall_ticket_number: Optional[str],
        exam_series_name: str,
        exam_type: str,
        academic_year: str,
        marks_data: List[Dict],
        total_marks_obtained: float,
        total_max_marks: float,
        percentage: float,
        overall_grade: str,
        working_days: Optional[int],
        present_days: Optional[int],
        attendance_percentage: Optional[float],
        teacher_remarks: Optional[str],
        school_name: str,
        school_logo_path: Optional[str] = None
    ) -> BytesIO:
        buffer = BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=A4)

        y_position = ReportCardService._draw_header(
            pdf, school_name, exam_series_name, academic_year, school_logo_path
        )
        y_position = ReportCardService._draw_student_details(
            pdf, student_name, admission_number, class_name, section,
            father_name, date_of_birth, roll_number, hall_ticket_number, y_position
        )
        y_position = ReportCardService._draw_marks_table(pdf, marks_data, y_position)
        y_position = ReportCardService._draw_summary(
            pdf, total_marks_obtained, total_max_marks, percentage,
            overall_grade, working_days, present_days, attendance_percentage, y_position
        )
        y_position = ReportCardService._draw_remarks(pdf, teacher_remarks, y_position)
        ReportCardService._draw_signature_boxes(pdf, y_position)

        pdf.save()
        buffer.seek(0)
        return buffer

    @staticmethod
    def generate_annual_report(
        student_name: str,
        admission_number: str,
        class_name: str,
        section: Optional[str],
        father_name: Optional[str],
        date_of_birth: Optional[date],
        roll_number: Optional[str],
        academic_year: str,
        exams_data: List[Dict],   # [{exam_name, marks_data, total_obtained, total_max, percentage, overall_grade}]
        monthly_attendance: List[Dict],  # [{month_name, working_days, present_days, percentage}]
        annual_working_days: int,
        annual_present_days: int,
        annual_attendance_percentage: float,
        school_name: str,
        school_logo_path: Optional[str] = None
    ) -> BytesIO:
        buffer = BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=A4)

        y_position = ReportCardService._draw_header(
            pdf, school_name, "Annual Progress Report", academic_year, school_logo_path
        )
        y_position = ReportCardService._draw_student_details(
            pdf, student_name, admission_number, class_name, section,
            father_name, date_of_birth, roll_number, None, y_position
        )

        # All exams summary table
        y_position = ReportCardService._draw_annual_exams_table(pdf, exams_data, y_position)

        # Monthly attendance table
        y_position = ReportCardService._draw_monthly_attendance_table(
            pdf, monthly_attendance, annual_working_days, annual_present_days,
            annual_attendance_percentage, y_position
        )

        ReportCardService._draw_signature_boxes(pdf, y_position)

        pdf.save()
        buffer.seek(0)
        return buffer

    @staticmethod
    def _draw_header(pdf, school_name, exam_name, academic_year, logo_path):
        y_pos = ReportCardService.PAGE_HEIGHT - ReportCardService.MARGIN

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

        pdf.setFont("Helvetica-Bold", 18)
        pdf.drawCentredString(ReportCardService.PAGE_WIDTH / 2, y_pos - 10, school_name)

        pdf.setFont("Helvetica", 11)
        pdf.drawCentredString(ReportCardService.PAGE_WIDTH / 2, y_pos - 30, f"Academic Year: {academic_year}")

        pdf.setFont("Helvetica-Bold", 16)
        pdf.setFillColor(colors.HexColor("#1890ff"))
        pdf.drawCentredString(ReportCardService.PAGE_WIDTH / 2, y_pos - 55, "PROGRESS REPORT")
        pdf.setFillColor(colors.black)

        pdf.setFont("Helvetica-Bold", 12)
        pdf.drawCentredString(ReportCardService.PAGE_WIDTH / 2, y_pos - 75, exam_name)

        pdf.line(ReportCardService.MARGIN, y_pos - 85,
                 ReportCardService.PAGE_WIDTH - ReportCardService.MARGIN, y_pos - 85)

        return y_pos - 100

    @staticmethod
    def _draw_student_details(pdf, student_name, admission_number, class_name, section,
                               father_name, dob, roll_number, hall_ticket, y_pos):
        x = ReportCardService.MARGIN + 20
        lh = 17
        col2 = x + 310

        def label(text, xp, yp):
            pdf.setFont("Helvetica-Bold", 9)
            pdf.drawString(xp, yp, text)

        def value(text, xp, yp):
            pdf.setFont("Helvetica", 9)
            pdf.drawString(xp, yp, str(text) if text else "-")

        row = y_pos
        label("Student Name:", x, row)
        value(student_name, x + 95, row)
        label("Admission No:", col2, row)
        value(admission_number, col2 + 85, row)

        row -= lh
        class_display = class_name + (f" - {section}" if section else "")
        label("Class / Section:", x, row)
        value(class_display, x + 95, row)
        label("Roll No:", col2, row)
        value(roll_number or "-", col2 + 85, row)

        row -= lh
        label("Father's Name:", x, row)
        value(father_name or "-", x + 95, row)
        label("Date of Birth:", col2, row)
        dob_str = dob.strftime("%d-%b-%Y") if dob else "-"
        value(dob_str, col2 + 85, row)

        if hall_ticket:
            row -= lh
            label("Hall Ticket No:", x, row)
            value(hall_ticket, x + 95, row)

        # Separator line
        row -= 10
        pdf.setStrokeColor(colors.HexColor("#d9d9d9"))
        pdf.line(x - 10, row, ReportCardService.PAGE_WIDTH - ReportCardService.MARGIN, row)

        return row - 10

    @staticmethod
    def _draw_marks_table(pdf, marks_data, y_pos):
        pdf.setFont("Helvetica-Bold", 10)
        pdf.drawString(ReportCardService.MARGIN + 20, y_pos, "Subject-wise Performance:")
        y_pos -= 18

        table_data = [["S.No", "Subject", "Max Marks", "Marks Obtained", "Grade", "Status"]]

        for idx, mark in enumerate(marks_data, 1):
            status = "Absent" if mark.get('is_absent') else "Present"
            marks_obtained = "-" if mark.get('is_absent') else str(mark.get('marks_obtained', '-'))
            grade = "-" if mark.get('is_absent') else mark.get('grade', '-')
            table_data.append([
                str(idx), mark.get('subject_name', 'N/A'),
                str(mark.get('max_marks', 0)), marks_obtained, grade, status
            ])

        col_widths = [0.4*inch, 2.5*inch, 1.0*inch, 1.3*inch, 0.8*inch, 0.9*inch]
        table = Table(table_data, colWidths=col_widths)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1890ff")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 7),
            ('TOPPADDING', (0, 0), (-1, 0), 7),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f5f5f5")]),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 5),
            ('TOPPADDING', (0, 1), (-1, -1), 5),
            ('ALIGN', (1, 1), (1, -1), 'LEFT'),
        ]))

        _, table_height = table.wrap(0, 0)
        table.drawOn(pdf, ReportCardService.MARGIN + 10, y_pos - table_height)

        return y_pos - table_height - 15

    @staticmethod
    def _draw_summary(pdf, total_obtained, total_max, percentage, overall_grade,
                       working_days, present_days, attendance_pct, y_pos):
        has_attendance = attendance_pct is not None
        box_height = 95 if has_attendance else 70
        box_width = ReportCardService.PAGE_WIDTH - (2 * ReportCardService.MARGIN) - 20
        box_x = ReportCardService.MARGIN + 10

        pdf.setFillColor(colors.HexColor("#f0f7ff"))
        pdf.rect(box_x, y_pos - box_height, box_width, box_height, fill=1, stroke=0)
        pdf.setFillColor(colors.black)

        pdf.setFont("Helvetica-Bold", 10)
        pdf.drawString(box_x + 10, y_pos - 16, "Overall Performance Summary")

        y_off = 33
        pdf.setFont("Helvetica", 9)
        pdf.drawString(box_x + 20, y_pos - y_off, "Total Marks:")
        pdf.drawString(box_x + 140, y_pos - y_off, f"{total_obtained} / {total_max}")

        y_off += 14
        pdf.drawString(box_x + 20, y_pos - y_off, "Percentage:")
        pdf.setFont("Helvetica-Bold", 9)
        pdf.drawString(box_x + 140, y_pos - y_off, f"{percentage:.1f}%")
        pdf.setFont("Helvetica", 9)

        y_off += 14
        pdf.drawString(box_x + 20, y_pos - y_off, "Overall Grade:")
        pdf.setFont("Helvetica-Bold", 11)
        pdf.setFillColor(colors.HexColor("#1890ff"))
        pdf.drawString(box_x + 140, y_pos - y_off, overall_grade)
        pdf.setFillColor(colors.black)
        pdf.setFont("Helvetica", 9)

        if has_attendance:
            y_off += 14
            att_text = f"{attendance_pct:.1f}%"
            if working_days is not None and present_days is not None:
                att_text += f"  ({present_days} / {working_days} days)"
            pdf.drawString(box_x + 20, y_pos - y_off, "Attendance:")
            pdf.drawString(box_x + 140, y_pos - y_off, att_text)

        return y_pos - box_height - 12

    @staticmethod
    def _draw_annual_exams_table(pdf, exams_data, y_pos):
        if not exams_data:
            return y_pos

        pdf.setFont("Helvetica-Bold", 10)
        pdf.drawString(ReportCardService.MARGIN + 20, y_pos, "Exam-wise Performance:")
        y_pos -= 18

        table_data = [["Exam", "Marks Obtained", "Max Marks", "Percentage", "Grade"]]
        for exam in exams_data:
            table_data.append([
                exam.get('exam_name', '-'),
                str(exam.get('total_obtained', 0)),
                str(exam.get('total_max', 0)),
                f"{exam.get('percentage', 0):.1f}%",
                exam.get('overall_grade', '-'),
            ])

        col_widths = [2.5*inch, 1.2*inch, 1.0*inch, 1.2*inch, 0.9*inch]
        table = Table(table_data, colWidths=col_widths)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#52c41a")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('ALIGN', (0, 1), (0, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 7),
            ('TOPPADDING', (0, 0), (-1, 0), 7),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f5f5f5")]),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 5),
            ('TOPPADDING', (0, 1), (-1, -1), 5),
        ]))

        _, table_height = table.wrap(0, 0)
        table.drawOn(pdf, ReportCardService.MARGIN + 10, y_pos - table_height)

        return y_pos - table_height - 15

    @staticmethod
    def _draw_monthly_attendance_table(pdf, monthly_data, annual_working, annual_present,
                                        annual_pct, y_pos):
        pdf.setFont("Helvetica-Bold", 10)
        pdf.drawString(ReportCardService.MARGIN + 20, y_pos, "Monthly Attendance:")
        y_pos -= 18

        table_data = [["Month", "Working Days", "Days Present", "Days Absent", "Attendance %"]]
        for row in monthly_data:
            absent = row.get('working_days', 0) - row.get('present_days', 0)
            table_data.append([
                row.get('month_name', '-'),
                str(row.get('working_days', 0)),
                str(row.get('present_days', 0)),
                str(absent),
                f"{row.get('percentage', 0):.1f}%",
            ])
        # Totals row
        annual_absent = annual_working - annual_present
        table_data.append([
            "TOTAL",
            str(annual_working),
            str(annual_present),
            str(annual_absent),
            f"{annual_pct:.1f}%",
        ])

        col_widths = [1.5*inch, 1.2*inch, 1.2*inch, 1.2*inch, 1.2*inch]
        table = Table(table_data, colWidths=col_widths)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#fa8c16")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('ALIGN', (0, 1), (0, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 7),
            ('TOPPADDING', (0, 0), (-1, 0), 7),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, colors.HexColor("#fff7e6")]),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor("#ffd591")),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 5),
            ('TOPPADDING', (0, 1), (-1, -1), 5),
        ]))

        _, table_height = table.wrap(0, 0)
        table.drawOn(pdf, ReportCardService.MARGIN + 10, y_pos - table_height)

        return y_pos - table_height - 15

    @staticmethod
    def _draw_remarks(pdf, remarks, y_pos):
        if not remarks:
            remarks = "Keep up the good work!"

        pdf.setFont("Helvetica-Bold", 10)
        pdf.drawString(ReportCardService.MARGIN + 20, y_pos, "Teacher's Remarks:")
        y_pos -= 15

        box_width = ReportCardService.PAGE_WIDTH - (2 * ReportCardService.MARGIN) - 20
        box_height = 45
        box_x = ReportCardService.MARGIN + 10

        pdf.setStrokeColor(colors.grey)
        pdf.rect(box_x, y_pos - box_height, box_width, box_height, fill=0, stroke=1)

        pdf.setFont("Helvetica-Oblique", 9)
        text_width = box_width - 20
        words = remarks.split()
        lines, current_line = [], []
        for word in words:
            current_line.append(word)
            if pdf.stringWidth(' '.join(current_line), "Helvetica-Oblique", 9) > text_width:
                current_line.pop()
                lines.append(' '.join(current_line))
                current_line = [word]
        if current_line:
            lines.append(' '.join(current_line))

        text_y = y_pos - 15
        for line in lines[:3]:
            pdf.drawString(box_x + 10, text_y, line)
            text_y -= 11

        return y_pos - box_height - 15

    @staticmethod
    def _draw_signature_boxes(pdf, y_pos):
        sig_y = max(y_pos - 30, 1.5 * inch)

        left_x = ReportCardService.MARGIN + 40
        pdf.line(left_x, sig_y, left_x + 1.3*inch, sig_y)
        pdf.setFont("Helvetica", 8)
        pdf.drawString(left_x + 10, sig_y - 12, "Class Teacher")

        mid_x = ReportCardService.PAGE_WIDTH / 2 - 0.65*inch
        pdf.line(mid_x, sig_y, mid_x + 1.3*inch, sig_y)
        pdf.drawString(mid_x + 15, sig_y - 12, "Parent/Guardian")

        right_x = ReportCardService.PAGE_WIDTH - ReportCardService.MARGIN - 1.3*inch - 40
        pdf.line(right_x, sig_y, right_x + 1.3*inch, sig_y)
        pdf.drawString(right_x + 25, sig_y - 12, "Principal")

        pdf.setFont("Helvetica-Oblique", 8)
        pdf.setFillColor(colors.grey)
        pdf.drawCentredString(
            ReportCardService.PAGE_WIDTH / 2, 0.7 * inch,
            f"Report generated on {datetime.now().strftime('%d-%b-%Y')}"
        )

        pdf.setFont("Helvetica", 7)
        pdf.drawString(
            ReportCardService.MARGIN + 20, 0.5 * inch,
            "Grading Scale: A+ (90-100) | A (80-89) | B+ (70-79) | B (60-69) | C (50-59) | D (40-49) | F (<40)"
        )
