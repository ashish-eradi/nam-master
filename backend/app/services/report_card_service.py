"""
Report Card / Progress Card PDF Generation Service

Generates professional report cards with subject-wise marks, grades, and performance analysis.
"""

from reportlab.lib.pagesizes import A4, letter
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.platypus import Table, TableStyle
from io import BytesIO
from datetime import datetime, date
from typing import Optional, List, Dict
import os

DEFAULT_REPORT_CARD_SETTINGS = {
    'page_size': 'A4',
    'primary_color': '#1890ff',
    'show_logo': True,
    'show_hall_ticket': False,
    'show_signature': True,
}

_PAGE_SIZES = {
    'A4': A4,
    'Letter': letter,
}


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
        school_logo_path: Optional[str] = None,
        print_settings: Optional[Dict] = None,
    ) -> BytesIO:
        settings = {**DEFAULT_REPORT_CARD_SETTINGS, **(print_settings or {})}
        pagesize = _PAGE_SIZES.get(settings.get('page_size', 'A4'), A4)
        primary_color = settings.get('primary_color', DEFAULT_REPORT_CARD_SETTINGS['primary_color'])
        show_logo = settings.get('show_logo', True)
        show_hall_ticket = settings.get('show_hall_ticket', False)
        show_signature = settings.get('show_signature', True)

        buffer = BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=pagesize)

        page_w, page_h = pagesize
        pdf_tpl_bytes = None

        if settings.get('custom_template_data'):
            # Custom template mode: draw background + fields at stored positions
            dob_str = date_of_birth.strftime("%d-%b-%Y") if date_of_birth else None
            student_data = {
                'student_name': student_name,
                'father_name': father_name,
                'admission_number': admission_number,
                'class_section': class_name + (f" - {section}" if section else ""),
                'roll_number': roll_number,
                'dob_str': dob_str,
                'hall_ticket': hall_ticket_number if show_hall_ticket else None,
                'exam_name': exam_series_name,
                'academic_year': academic_year,
            }
            summary_data = {
                'total_obtained': total_marks_obtained,
                'total_max': total_max_marks,
                'percentage': percentage,
                'overall_grade': overall_grade,
                'attendance_pct': attendance_percentage,
                'present_days': present_days,
                'working_days': working_days,
            }
            pdf_tpl_bytes = ReportCardService._draw_custom_template_content(
                pdf, settings, page_w, page_h, student_data, marks_data, summary_data
            )
        else:
            # Standard structured mode
            y_position = ReportCardService._draw_header(
                pdf, school_name, exam_series_name, academic_year,
                school_logo_path if show_logo else None,
                primary_color, page_w, page_h
            )
            y_position = ReportCardService._draw_student_details(
                pdf, student_name, admission_number, class_name, section,
                father_name, date_of_birth, roll_number,
                hall_ticket_number if show_hall_ticket else None,
                y_position, page_w
            )
            y_position = ReportCardService._draw_marks_table(pdf, marks_data, y_position, primary_color, page_w)
            y_position = ReportCardService._draw_summary(
                pdf, total_marks_obtained, total_max_marks, percentage,
                overall_grade, working_days, present_days, attendance_percentage, y_position, page_w
            )
            y_position = ReportCardService._draw_remarks(pdf, teacher_remarks, y_position, page_w)
            if show_signature:
                ReportCardService._draw_signature_boxes(pdf, y_position, page_w)

        pdf.save()
        buffer.seek(0)
        if pdf_tpl_bytes:
            buffer = ReportCardService._merge_pdf_template(buffer, pdf_tpl_bytes)
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
        school_logo_path: Optional[str] = None,
        print_settings: Optional[Dict] = None,
    ) -> BytesIO:
        settings = {**DEFAULT_REPORT_CARD_SETTINGS, **(print_settings or {})}
        pagesize = _PAGE_SIZES.get(settings.get('page_size', 'A4'), A4)
        primary_color = settings.get('primary_color', DEFAULT_REPORT_CARD_SETTINGS['primary_color'])
        show_logo = settings.get('show_logo', True)
        show_signature = settings.get('show_signature', True)

        buffer = BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=pagesize)
        page_w, page_h = pagesize
        pdf_tpl_bytes = None

        if settings.get('custom_template_data'):
            # Custom template mode for annual report
            dob_str = date_of_birth.strftime("%d-%b-%Y") if date_of_birth else None
            student_data = {
                'student_name': student_name,
                'father_name': father_name,
                'admission_number': admission_number,
                'class_section': class_name + (f" - {section}" if section else ""),
                'roll_number': roll_number,
                'dob_str': dob_str,
                'hall_ticket': None,
                'exam_name': "Annual Progress Report",
                'academic_year': academic_year,
            }
            # Build a flat marks_data list from all exams for the marks_table position
            flat_marks = []
            for exam in exams_data:
                flat_marks.append({
                    'subject_name': exam.get('exam_name', '-'),
                    'max_marks': exam.get('total_max', 0),
                    'marks_obtained': exam.get('total_obtained', 0),
                    'grade': exam.get('overall_grade', '-'),
                    'is_absent': False,
                })
            summary_data = {
                'total_obtained': annual_present_days,
                'total_max': annual_working_days,
                'percentage': annual_attendance_percentage,
                'overall_grade': '-',
                'attendance_pct': annual_attendance_percentage,
                'present_days': annual_present_days,
                'working_days': annual_working_days,
            }
            pdf_tpl_bytes = ReportCardService._draw_custom_template_content(
                pdf, settings, page_w, page_h, student_data, flat_marks, summary_data
            )
        else:
            y_position = ReportCardService._draw_header(
                pdf, school_name, "Annual Progress Report", academic_year,
                school_logo_path if show_logo else None,
                primary_color, page_w, page_h
            )
            y_position = ReportCardService._draw_student_details(
                pdf, student_name, admission_number, class_name, section,
                father_name, date_of_birth, roll_number, None, y_position, page_w
            )

            # All exams summary table
            y_position = ReportCardService._draw_annual_exams_table(pdf, exams_data, y_position, primary_color, page_w)

            # Monthly attendance table
            y_position = ReportCardService._draw_monthly_attendance_table(
                pdf, monthly_attendance, annual_working_days, annual_present_days,
                annual_attendance_percentage, y_position, primary_color, page_w
            )

            if show_signature:
                ReportCardService._draw_signature_boxes(pdf, y_position, page_w)

        pdf.save()
        buffer.seek(0)
        if pdf_tpl_bytes:
            buffer = ReportCardService._merge_pdf_template(buffer, pdf_tpl_bytes)
        return buffer

    @staticmethod
    def _draw_at_pos(pdf, W, H, positions, key, value, show_label=False, label='', bold=False, font_size=10):
        """Draw a field value at stored (x%, y%) position. No-op if key not placed."""
        pos = positions.get(key)
        if pos is None:
            return
        x = W * pos['x'] / 100
        y = H * (1.0 - pos['y'] / 100)
        if show_label and label:
            pdf.setFont("Helvetica-Bold", font_size)
            pdf.drawString(x, y, label)
            lw = pdf.stringWidth(label, "Helvetica-Bold", font_size) + 4
            pdf.setFont("Helvetica", font_size)
            pdf.drawString(x + lw, y, value)
        else:
            pdf.setFont("Helvetica-Bold" if bold else "Helvetica", font_size)
            pdf.drawString(x, y, value)

    @staticmethod
    def _draw_custom_template_content(pdf, settings, page_w, page_h,
                                       student_data, marks_data, summary_data):
        """Draw content on custom template background. Returns pdf_tpl_bytes if PDF template."""
        import base64
        from reportlab.lib.utils import ImageReader

        b64 = settings.get('custom_template_data')
        ext = settings.get('custom_template_ext', '.png').lower()
        positions = settings.get('custom_field_positions') or {}
        show_labels = settings.get('custom_show_labels', False)
        primary_color = settings.get('primary_color', '#1890ff')
        pdf_tpl_bytes = None

        if b64:
            try:
                file_bytes = base64.b64decode(b64)
                if ext in ('.png', '.jpg', '.jpeg'):
                    pdf.drawImage(ImageReader(BytesIO(file_bytes)), 0, 0,
                                  width=page_w, height=page_h, preserveAspectRatio=False)
                elif ext == '.pdf':
                    pdf_tpl_bytes = file_bytes
            except Exception:
                pass

        D = ReportCardService._draw_at_pos
        sl = show_labels
        W, H = page_w, page_h

        # Student detail fields
        D(pdf, W, H, positions, 'student_name',  student_data['student_name'],                 sl, 'Student Name:', bold=True)
        D(pdf, W, H, positions, 'father_name',   student_data.get('father_name') or '-',       sl, "Father's Name:")
        D(pdf, W, H, positions, 'admission_no',  student_data['admission_number'],              sl, 'Admission No:')
        D(pdf, W, H, positions, 'class_section', student_data['class_section'],                sl, 'Class:')
        D(pdf, W, H, positions, 'roll_no',       student_data.get('roll_number') or '-',       sl, 'Roll No:')
        D(pdf, W, H, positions, 'dob',           student_data.get('dob_str') or '-',           sl, 'Date of Birth:')
        D(pdf, W, H, positions, 'hall_ticket',   student_data.get('hall_ticket') or '-',       sl, 'Hall Ticket:')
        D(pdf, W, H, positions, 'exam_name',     student_data.get('exam_name') or '',          sl, 'Exam:')
        D(pdf, W, H, positions, 'academic_year', student_data.get('academic_year') or '',      sl, 'Academic Year:')

        # Summary fields
        pct_str = f"{summary_data['percentage']:.1f}%"
        D(pdf, W, H, positions, 'percentage',    pct_str,                                      sl, 'Percentage:', bold=True)
        D(pdf, W, H, positions, 'overall_grade', summary_data['overall_grade'],                sl, 'Grade:', bold=True)
        D(pdf, W, H, positions, 'total_marks',
          f"{summary_data['total_obtained']} / {summary_data['total_max']}",                   sl, 'Total Marks:')

        if summary_data.get('attendance_pct') is not None:
            att_str = f"{summary_data['attendance_pct']:.1f}%"
            if summary_data.get('present_days') is not None:
                att_str += f"  ({summary_data['present_days']} / {summary_data['working_days']} days)"
            D(pdf, W, H, positions, 'attendance', att_str, sl, 'Attendance:')

        # Marks table
        if 'marks_table' in positions:
            pos = positions['marks_table']
            tx = W * pos['x'] / 100
            ty = H * (1.0 - pos['y'] / 100)
            td = [["Subject", "Max", "Obtained", "Grade"]]
            for mk in marks_data:
                td.append([
                    mk.get('subject_name', ''),
                    str(mk.get('max_marks', 0)),
                    '-' if mk.get('is_absent') else str(mk.get('marks_obtained', '-')),
                    '-' if mk.get('is_absent') else mk.get('grade', '-'),
                ])
            cw = [2.4*inch, 0.8*inch, 1.0*inch, 0.8*inch]
            tbl = Table(td, colWidths=cw)
            tbl.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor(primary_color)),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('ALIGN', (0, 1), (0, -1), 'LEFT'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')]),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
            ]))
            _, th = tbl.wrap(0, 0)
            tbl.drawOn(pdf, tx, ty - th)

        return pdf_tpl_bytes

    @staticmethod
    def _merge_pdf_template(content_buffer: BytesIO, template_bytes: bytes) -> BytesIO:
        """Overlay ReportLab content on top of a PDF template background page."""
        try:
            from PyPDF2 import PdfReader, PdfWriter
            tpl_reader = PdfReader(BytesIO(template_bytes))
            content_reader = PdfReader(content_buffer)
            if not tpl_reader.pages or not content_reader.pages:
                content_buffer.seek(0)
                return content_buffer
            tpl_page = tpl_reader.pages[0]
            tpl_page.merge_page(content_reader.pages[0])
            writer = PdfWriter()
            writer.add_page(tpl_page)
            out = BytesIO()
            writer.write(out)
            out.seek(0)
            return out
        except Exception:
            content_buffer.seek(0)
            return content_buffer

    @staticmethod
    def _draw_header(pdf, school_name, exam_name, academic_year, logo_path,
                     primary_color='#1890ff', page_w=None, page_h=None):
        pw = page_w or ReportCardService.PAGE_WIDTH
        ph = page_h or ReportCardService.PAGE_HEIGHT
        margin = ReportCardService.MARGIN
        y_pos = ph - margin

        if logo_path and os.path.exists(logo_path):
            try:
                pdf.drawImage(
                    logo_path, margin, y_pos - ReportCardService.LOGO_SIZE,
                    width=ReportCardService.LOGO_SIZE, height=ReportCardService.LOGO_SIZE,
                    preserveAspectRatio=True
                )
            except Exception:
                pass

        pdf.setFont("Helvetica-Bold", 18)
        pdf.drawCentredString(pw / 2, y_pos - 10, school_name)

        pdf.setFont("Helvetica", 11)
        pdf.drawCentredString(pw / 2, y_pos - 30, f"Academic Year: {academic_year}")

        pdf.setFont("Helvetica-Bold", 16)
        pdf.setFillColor(colors.HexColor(primary_color))
        pdf.drawCentredString(pw / 2, y_pos - 55, "PROGRESS REPORT")
        pdf.setFillColor(colors.black)

        pdf.setFont("Helvetica-Bold", 12)
        pdf.drawCentredString(pw / 2, y_pos - 75, exam_name)

        pdf.line(margin, y_pos - 85, pw - margin, y_pos - 85)

        return y_pos - 100

    @staticmethod
    def _draw_student_details(pdf, student_name, admission_number, class_name, section,
                               father_name, dob, roll_number, hall_ticket, y_pos,
                               page_w=None):
        pw = page_w or ReportCardService.PAGE_WIDTH
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
        pdf.line(x - 10, row, pw - ReportCardService.MARGIN, row)

        return row - 10

    @staticmethod
    def _draw_marks_table(pdf, marks_data, y_pos, primary_color='#1890ff', page_w=None):
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
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor(primary_color)),
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
                       working_days, present_days, attendance_pct, y_pos,
                       page_w=None):
        pw = page_w or ReportCardService.PAGE_WIDTH
        has_attendance = attendance_pct is not None
        box_height = 95 if has_attendance else 70
        box_width = pw - (2 * ReportCardService.MARGIN) - 20
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
    def _draw_annual_exams_table(pdf, exams_data, y_pos, primary_color='#1890ff', page_w=None):
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
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor(primary_color)),
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
                                        annual_pct, y_pos, primary_color='#1890ff', page_w=None):
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
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor(primary_color)),
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
    def _draw_remarks(pdf, remarks, y_pos, page_w=None):
        pw = page_w or ReportCardService.PAGE_WIDTH
        if not remarks:
            remarks = "Keep up the good work!"

        pdf.setFont("Helvetica-Bold", 10)
        pdf.drawString(ReportCardService.MARGIN + 20, y_pos, "Teacher's Remarks:")
        y_pos -= 15

        box_width = pw - (2 * ReportCardService.MARGIN) - 20
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
    def _draw_signature_boxes(pdf, y_pos, page_w=None):
        pw = page_w or ReportCardService.PAGE_WIDTH
        sig_y = max(y_pos - 30, 1.5 * inch)

        left_x = ReportCardService.MARGIN + 40
        pdf.line(left_x, sig_y, left_x + 1.3*inch, sig_y)
        pdf.setFont("Helvetica", 8)
        pdf.drawString(left_x + 10, sig_y - 12, "Class Teacher")

        mid_x = pw / 2 - 0.65*inch
        pdf.line(mid_x, sig_y, mid_x + 1.3*inch, sig_y)
        pdf.drawString(mid_x + 15, sig_y - 12, "Parent/Guardian")

        right_x = pw - ReportCardService.MARGIN - 1.3*inch - 40
        pdf.line(right_x, sig_y, right_x + 1.3*inch, sig_y)
        pdf.drawString(right_x + 25, sig_y - 12, "Principal")

        pdf.setFont("Helvetica-Oblique", 8)
        pdf.setFillColor(colors.grey)
        pdf.drawCentredString(
            pw / 2, 0.7 * inch,
            f"Report generated on {datetime.now().strftime('%d-%b-%Y')}"
        )

        pdf.setFont("Helvetica", 7)
        pdf.drawString(
            ReportCardService.MARGIN + 20, 0.5 * inch,
            "Grading Scale: A+ (90-100) | A (80-89) | B+ (70-79) | B (60-69) | C (50-59) | D (40-49) | F (<40)"
        )
