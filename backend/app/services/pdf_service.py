"""
PDF Receipt Generation Service

Generates professional formatted PDF receipts for fee payments.
Includes school logo, student details, payment breakdown, and signature boxes.
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.platypus import Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet
from io import BytesIO
from datetime import datetime
from decimal import Decimal
from typing import Optional
import os
from sqlalchemy.orm import Session
from app.models.finance import Payment as PaymentModel


class PDFReceiptService:
    """Service for generating professional PDF receipts"""

    # Constants for layout
    PAGE_WIDTH, PAGE_HEIGHT = A4
    MARGIN = 0.75 * inch
    LOGO_SIZE = 1 * inch

    @staticmethod
    def generate_receipt(payment: PaymentModel, db: Session, school_logo_path: Optional[str] = None,
                         father_name: Optional[str] = None, total_outstanding: float = 0.0) -> BytesIO:
        """
        Generate a professional PDF receipt for a payment.

        Args:
            payment: Payment model instance (with loaded relationships)
            db: Database session
            school_logo_path: Optional path to school logo image
            father_name: Father's name from parent profile
            total_outstanding: Remaining outstanding balance after this payment

        Returns:
            BytesIO buffer containing the PDF
        """
        buffer = BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=A4)

        # Draw header
        y_position = PDFReceiptService._draw_header(
            pdf, payment, school_logo_path
        )

        # Draw receipt number prominently
        y_position = PDFReceiptService._draw_receipt_number(
            pdf, payment.receipt_number, y_position
        )

        # Draw student and payment details
        y_position = PDFReceiptService._draw_details_section(
            pdf, payment, y_position, father_name=father_name
        )

        # Draw payment breakdown table
        y_position = PDFReceiptService._draw_payment_table(
            pdf, payment, y_position
        )

        # Draw amount in words
        y_position = PDFReceiptService._draw_amount_in_words(
            pdf, payment.amount_paid, y_position
        )

        # Draw outstanding balance
        y_position = PDFReceiptService._draw_outstanding_balance(
            pdf, total_outstanding, y_position
        )

        # Draw footer with signature boxes
        PDFReceiptService._draw_footer(pdf, payment)

        pdf.save()
        buffer.seek(0)
        return buffer

    @staticmethod
    def _draw_header(pdf: canvas.Canvas, payment: PaymentModel, logo_path: Optional[str] = None) -> float:
        """Draw school header with logo"""
        y = PDFReceiptService.PAGE_HEIGHT - PDFReceiptService.MARGIN

        # Try to load school logo
        if logo_path and os.path.exists(logo_path):
            try:
                pdf.drawImage(
                    logo_path,
                    PDFReceiptService.MARGIN,
                    y - PDFReceiptService.LOGO_SIZE,
                    width=PDFReceiptService.LOGO_SIZE,
                    height=PDFReceiptService.LOGO_SIZE,
                    preserveAspectRatio=True
                )
                text_x = PDFReceiptService.MARGIN + PDFReceiptService.LOGO_SIZE + 0.3 * inch
            except Exception:
                text_x = PDFReceiptService.MARGIN
        else:
            text_x = PDFReceiptService.MARGIN

        # School name
        pdf.setFont("Helvetica-Bold", 20)
        school_name = getattr(payment.school, 'name', 'School Name')
        pdf.drawString(text_x, y - 0.3 * inch, school_name)

        # School address and contact
        pdf.setFont("Helvetica", 10)
        school_address = getattr(payment.school, 'address', '')
        if school_address:
            pdf.drawString(text_x, y - 0.5 * inch, school_address)

        school_phone = getattr(payment.school, 'phone', '')
        school_email = getattr(payment.school, 'email', '')
        contact_info = f"Phone: {school_phone} | Email: {school_email}" if school_phone or school_email else ''
        if contact_info:
            pdf.drawString(text_x, y - 0.65 * inch, contact_info)

        # Draw horizontal line
        y_line = y - 0.9 * inch
        pdf.line(PDFReceiptService.MARGIN, y_line, PDFReceiptService.PAGE_WIDTH - PDFReceiptService.MARGIN, y_line)

        return y_line - 0.3 * inch

    @staticmethod
    def _draw_receipt_number(pdf: canvas.Canvas, receipt_number: str, y: float) -> float:
        """Draw receipt number prominently with border"""
        # Title
        pdf.setFont("Helvetica-Bold", 16)
        pdf.drawCentredString(PDFReceiptService.PAGE_WIDTH / 2, y, "FEE RECEIPT")

        y -= 0.4 * inch

        # Receipt number with border
        pdf.setFont("Helvetica-Bold", 14)
        receipt_text = f"Receipt No: {receipt_number}"
        text_width = pdf.stringWidth(receipt_text, "Helvetica-Bold", 14)

        # Draw border around receipt number
        border_x = (PDFReceiptService.PAGE_WIDTH - text_width) / 2 - 0.2 * inch
        border_y = y - 0.25 * inch
        border_width = text_width + 0.4 * inch
        border_height = 0.35 * inch

        pdf.rect(border_x, border_y, border_width, border_height)
        pdf.drawCentredString(PDFReceiptService.PAGE_WIDTH / 2, y - 0.15 * inch, receipt_text)

        return y - 0.5 * inch

    @staticmethod
    def _draw_details_section(pdf: canvas.Canvas, payment: PaymentModel, y: float,
                              father_name: Optional[str] = None) -> float:
        """Draw student and payment details"""
        pdf.setFont("Helvetica", 11)

        # Student details
        student_name = f"{payment.student.first_name} {payment.student.last_name}"
        admission_no = payment.student.admission_number
        class_name = getattr(payment.student.class_, 'name', 'N/A') if payment.student.class_ else 'N/A'

        details = [
            ("Student Name:", student_name),
            ("Father's Name:", father_name or "N/A"),
            ("Admission No:", admission_no),
            ("Class:", class_name),
            ("Payment Date:", payment.payment_date.strftime("%d %B %Y")),
            ("Payment Mode:", payment.payment_mode.upper()),
        ]

        if payment.transaction_id:
            details.append(("Transaction ID:", payment.transaction_id))

        # Draw two columns
        col1_x = PDFReceiptService.MARGIN
        col2_x = PDFReceiptService.PAGE_WIDTH / 2

        current_y = y
        for i, (label, value) in enumerate(details):
            if i % 2 == 0:
                x = col1_x
            else:
                x = col2_x
                current_y -= 0.25 * inch

            pdf.setFont("Helvetica-Bold", 11)
            pdf.drawString(x, current_y, label)
            pdf.setFont("Helvetica", 11)
            pdf.drawString(x + 1.2 * inch, current_y, str(value))

            if i % 2 == 1 or i == len(details) - 1:
                current_y -= 0.25 * inch

        return current_y - 0.2 * inch

    @staticmethod
    def _draw_payment_table(pdf: canvas.Canvas, payment: PaymentModel, y: float) -> float:
        """Draw payment breakdown table"""
        # Table data
        data = [["S.No", "Fee Type", "Amount (₹)"]]

        total = Decimal('0')
        for i, detail in enumerate(payment.payment_details, 1):
            fee_name = detail.fee.fee_name if detail.fee else "Fee"
            amount = Decimal(str(detail.amount))
            total += amount
            data.append([str(i), fee_name, f"{amount:,.2f}"])

        # Add total row
        data.append(["", "Total", f"{total:,.2f}"])

        # Create table
        col_widths = [0.7 * inch, 3.8 * inch, 1.5 * inch]
        table = Table(data, colWidths=col_widths)

        # Style table
        style = TableStyle([
            # Header row
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4f46e5')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),

            # Data rows
            ('FONTNAME', (0, 1), (-1, -2), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -2), 10),
            ('ALIGN', (0, 1), (0, -1), 'CENTER'),
            ('ALIGN', (1, 1), (1, -1), 'LEFT'),
            ('ALIGN', (2, 1), (2, -1), 'RIGHT'),

            # Total row
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#e5e7eb')),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, -1), (-1, -1), 11),

            # Borders
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('LINEBELOW', (0, 0), (-1, 0), 2, colors.black),

            # Padding
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ])

        table.setStyle(style)

        # Draw table
        table_width = sum(col_widths)
        table_x = (PDFReceiptService.PAGE_WIDTH - table_width) / 2

        table.wrapOn(pdf, table_width, 400)
        table_height = table.wrapOn(pdf, table_width, 400)[1]
        table.drawOn(pdf, table_x, y - table_height)

        return y - table_height - 0.3 * inch

    @staticmethod
    def _draw_amount_in_words(pdf: canvas.Canvas, amount: Decimal, y: float) -> float:
        """Draw amount in words"""
        amount_words = PDFReceiptService._number_to_words(amount)

        pdf.setFont("Helvetica-Bold", 11)
        pdf.drawString(PDFReceiptService.MARGIN, y, "Amount in Words:")

        pdf.setFont("Helvetica-Oblique", 11)
        pdf.drawString(PDFReceiptService.MARGIN + 1.5 * inch, y, amount_words)

        return y - 0.5 * inch

    @staticmethod
    def _draw_outstanding_balance(pdf: canvas.Canvas, total_outstanding: float, y: float) -> float:
        """Draw outstanding balance box after this payment"""
        box_height = 0.75 * inch
        box_x = PDFReceiptService.MARGIN
        box_width = PDFReceiptService.PAGE_WIDTH - 2 * PDFReceiptService.MARGIN

        if total_outstanding > 0:
            # Orange/red background for pending dues
            pdf.setFillColorRGB(1, 0.95, 0.9)
            pdf.setStrokeColorRGB(0.85, 0.33, 0)
        else:
            # Green background for fully paid
            pdf.setFillColorRGB(0.9, 1, 0.9)
            pdf.setStrokeColorRGB(0, 0.6, 0)

        pdf.rect(box_x, y - box_height, box_width, box_height, fill=1, stroke=1)
        pdf.setFillColorRGB(0, 0, 0)
        pdf.setStrokeColorRGB(0, 0, 0)

        if total_outstanding > 0:
            pdf.setFont("Helvetica-Bold", 13)
            pdf.setFillColorRGB(0.6, 0.2, 0)
            pdf.drawCentredString(
                PDFReceiptService.PAGE_WIDTH / 2,
                y - 0.28 * inch,
                f"Outstanding Balance: \u20b9{total_outstanding:,.2f}"
            )
            pdf.setFont("Helvetica", 9)
            pdf.setFillColorRGB(0.4, 0.4, 0.4)
            pdf.drawCentredString(
                PDFReceiptService.PAGE_WIDTH / 2,
                y - 0.52 * inch,
                "Please clear the remaining dues at the earliest."
            )
        else:
            pdf.setFont("Helvetica-Bold", 13)
            pdf.setFillColorRGB(0, 0.5, 0)
            pdf.drawCentredString(
                PDFReceiptService.PAGE_WIDTH / 2,
                y - 0.38 * inch,
                "All Dues Cleared \u2013 No Outstanding Balance"
            )

        pdf.setFillColorRGB(0, 0, 0)
        return y - box_height - 0.3 * inch

    @staticmethod
    def _draw_footer(pdf: canvas.Canvas, payment: PaymentModel):
        """Draw footer with signature boxes"""
        y = 1.5 * inch

        # Received by
        received_by_name = f"{payment.received_by.full_name}" if payment.received_by else "Staff"

        pdf.setFont("Helvetica", 10)
        pdf.drawString(PDFReceiptService.MARGIN, y, f"Received by: {received_by_name}")

        # Signature box
        sig_x = PDFReceiptService.PAGE_WIDTH - PDFReceiptService.MARGIN - 2.5 * inch
        pdf.drawString(sig_x, y, "Signature: ___________________")

        # Computer generated message
        y -= 0.5 * inch
        pdf.setFont("Helvetica-Oblique", 9)
        pdf.drawCentredString(
            PDFReceiptService.PAGE_WIDTH / 2,
            y,
            "This is a computer-generated receipt and does not require a signature."
        )

        # Generation timestamp
        y -= 0.2 * inch
        pdf.setFont("Helvetica", 8)
        timestamp = datetime.now().strftime("%d %B %Y %I:%M %p")
        pdf.drawCentredString(
            PDFReceiptService.PAGE_WIDTH / 2,
            y,
            f"Generated on: {timestamp}"
        )

    @staticmethod
    def _number_to_words(amount: Decimal) -> str:
        """Convert number to words (Indian numbering system)"""
        # Simplified version - for production, use num2words library
        amount_int = int(amount)

        if amount_int == 0:
            return "Zero Rupees Only"

        # Basic implementation
        ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"]
        tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]
        teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen",
                 "Sixteen", "Seventeen", "Eighteen", "Nineteen"]

        def convert_hundreds(n):
            if n == 0:
                return ""
            elif n < 10:
                return ones[n]
            elif n < 20:
                return teens[n - 10]
            elif n < 100:
                return tens[n // 10] + (" " + ones[n % 10] if n % 10 != 0 else "")
            else:
                return ones[n // 100] + " Hundred" + (" " + convert_hundreds(n % 100) if n % 100 != 0 else "")

        # Handle lakhs, thousands, hundreds
        result = []

        if amount_int >= 10000000:  # Crores
            crores = amount_int // 10000000
            result.append(convert_hundreds(crores) + " Crore")
            amount_int %= 10000000

        if amount_int >= 100000:  # Lakhs
            lakhs = amount_int // 100000
            result.append(convert_hundreds(lakhs) + " Lakh")
            amount_int %= 100000

        if amount_int >= 1000:  # Thousands
            thousands = amount_int // 1000
            result.append(convert_hundreds(thousands) + " Thousand")
            amount_int %= 1000

        if amount_int > 0:
            result.append(convert_hundreds(amount_int))

        return " ".join(result) + " Rupees Only"

    @staticmethod
    def generate_fee_due_slip(student_data: dict, outstanding_data: dict, installments: list = None) -> BytesIO:
        """
        Generate a professional PDF fee due slip for a student.

        Args:
            student_data: Dict with student info (id, name, admission_number, class_name, father_name, etc.)
            outstanding_data: Dict with outstanding fee details (total_outstanding, by_fee list)
            installments: Optional list of overdue installments

        Returns:
            BytesIO buffer containing the PDF
        """
        buffer = BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=A4)

        # Draw header
        y_position = PDFReceiptService._draw_due_slip_header(pdf, student_data)

        # Draw title
        pdf.setFont("Helvetica-Bold", 18)
        pdf.setFillColorRGB(0.8, 0, 0)  # Red color
        pdf.drawCentredString(PDFReceiptService.PAGE_WIDTH / 2, y_position, "FEE DUE NOTICE")
        pdf.setFillColorRGB(0, 0, 0)  # Reset to black
        y_position -= 0.5 * inch

        # Draw student details
        y_position = PDFReceiptService._draw_due_slip_student_details(pdf, student_data, y_position)

        # Draw outstanding fees table
        y_position = PDFReceiptService._draw_outstanding_table(pdf, outstanding_data, y_position)

        # Draw overdue installments if any
        if installments and len(installments) > 0:
            y_position = PDFReceiptService._draw_overdue_installments(pdf, installments, y_position)

        # Draw payment instructions
        PDFReceiptService._draw_payment_instructions(pdf, outstanding_data, y_position)

        # Draw footer
        PDFReceiptService._draw_due_slip_footer(pdf)

        pdf.save()
        buffer.seek(0)
        return buffer

    @staticmethod
    def _draw_due_slip_header(pdf: canvas.Canvas, student_data: dict) -> float:
        """Draw school header for due slip"""
        y = PDFReceiptService.PAGE_HEIGHT - PDFReceiptService.MARGIN

        # School name
        pdf.setFont("Helvetica-Bold", 22)
        school_name = student_data.get('school_name', 'School Name')
        pdf.drawCentredString(PDFReceiptService.PAGE_WIDTH / 2, y, school_name)

        # School address and contact
        pdf.setFont("Helvetica", 11)
        school_address = student_data.get('school_address', '')
        if school_address:
            y -= 0.25 * inch
            pdf.drawCentredString(PDFReceiptService.PAGE_WIDTH / 2, y, school_address)

        school_contact = student_data.get('school_contact', '')
        if school_contact:
            y -= 0.2 * inch
            pdf.drawCentredString(PDFReceiptService.PAGE_WIDTH / 2, y, school_contact)

        # Draw horizontal line
        y -= 0.3 * inch
        pdf.line(PDFReceiptService.MARGIN, y, PDFReceiptService.PAGE_WIDTH - PDFReceiptService.MARGIN, y)

        # Issue date
        y -= 0.3 * inch
        pdf.setFont("Helvetica", 10)
        issue_date = datetime.now().strftime("%d %B %Y")
        pdf.drawString(PDFReceiptService.MARGIN, y, f"Issue Date: {issue_date}")
        pdf.drawRightString(PDFReceiptService.PAGE_WIDTH - PDFReceiptService.MARGIN, y, f"Academic Year: {student_data.get('academic_year', '2025-26')}")

        return y - 0.5 * inch

    @staticmethod
    def _draw_due_slip_student_details(pdf: canvas.Canvas, student_data: dict, y: float) -> float:
        """Draw student details for due slip"""
        pdf.setFont("Helvetica-Bold", 12)
        pdf.drawString(PDFReceiptService.MARGIN, y, "Student Details:")
        y -= 0.3 * inch

        pdf.setFont("Helvetica", 11)
        details = [
            ("Student Name:", student_data.get('student_name', '')),
            ("Admission Number:", student_data.get('admission_number', '')),
            ("Class:", student_data.get('class_name', '')),
            ("Father's Name:", student_data.get('father_name', '')),
        ]

        for label, value in details:
            pdf.setFont("Helvetica-Bold", 11)
            pdf.drawString(PDFReceiptService.MARGIN, y, label)
            pdf.setFont("Helvetica", 11)
            pdf.drawString(PDFReceiptService.MARGIN + 1.8 * inch, y, str(value))
            y -= 0.25 * inch

        return y - 0.2 * inch

    @staticmethod
    def _draw_outstanding_table(pdf: canvas.Canvas, outstanding_data: dict, y: float) -> float:
        """Draw outstanding fees table"""
        pdf.setFont("Helvetica-Bold", 12)
        pdf.drawString(PDFReceiptService.MARGIN, y, "Outstanding Fees:")
        y -= 0.3 * inch

        # Table data
        data = [["S.No", "Fee Type", "Total Amount", "Paid Amount", "Outstanding"]]

        by_fee = outstanding_data.get('by_fee', [])
        for i, fee in enumerate(by_fee, 1):
            data.append([
                str(i),
                fee.get('fee_name', ''),
                f"₹{fee.get('final_amount', 0):,.2f}",
                f"₹{fee.get('amount_paid', 0):,.2f}",
                f"₹{fee.get('outstanding', 0):,.2f}"
            ])

        # Add total row
        total_outstanding = outstanding_data.get('total_outstanding', 0)
        data.append(["", "TOTAL OUTSTANDING", "", "", f"₹{total_outstanding:,.2f}"])

        # Create table
        col_widths = [0.6 * inch, 2.5 * inch, 1.3 * inch, 1.3 * inch, 1.3 * inch]
        table = Table(data, colWidths=col_widths)

        # Style table
        style = TableStyle([
            # Header row
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#dc2626')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),

            # Data rows
            ('FONTNAME', (0, 1), (-1, -2), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -2), 10),
            ('ALIGN', (0, 1), (0, -1), 'CENTER'),
            ('ALIGN', (1, 1), (1, -1), 'LEFT'),
            ('ALIGN', (2, 1), (-1, -1), 'RIGHT'),

            # Total row
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#fee2e2')),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, -1), (-1, -1), 12),
            ('TEXTCOLOR', (0, -1), (-1, -1), colors.HexColor('#dc2626')),

            # Borders
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('LINEBELOW', (0, 0), (-1, 0), 2, colors.black),

            # Padding
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ])

        table.setStyle(style)

        # Draw table
        table_width = sum(col_widths)
        table_x = (PDFReceiptService.PAGE_WIDTH - table_width) / 2

        table.wrapOn(pdf, table_width, 400)
        table_height = table.wrapOn(pdf, table_width, 400)[1]
        table.drawOn(pdf, table_x, y - table_height)

        return y - table_height - 0.4 * inch

    @staticmethod
    def _draw_overdue_installments(pdf: canvas.Canvas, installments: list, y: float) -> float:
        """Draw overdue installments section"""
        pdf.setFont("Helvetica-Bold", 12)
        pdf.setFillColorRGB(0.8, 0, 0)
        pdf.drawString(PDFReceiptService.MARGIN, y, "⚠ Overdue Installments:")
        pdf.setFillColorRGB(0, 0, 0)
        y -= 0.3 * inch

        pdf.setFont("Helvetica", 10)
        for inst in installments[:5]:  # Show max 5 overdue
            fee_name = inst.get('fee_name', '')
            due_date = inst.get('due_date', '')
            amount = inst.get('amount', 0)
            days_overdue = inst.get('days_overdue', 0)

            text = f"• {fee_name} - Due: {due_date} - Amount: ₹{amount:,.2f} ({days_overdue} days overdue)"
            pdf.drawString(PDFReceiptService.MARGIN + 0.2 * inch, y, text)
            y -= 0.2 * inch

        return y - 0.2 * inch

    @staticmethod
    def _draw_payment_instructions(pdf: canvas.Canvas, outstanding_data: dict, y: float):
        """Draw payment instructions"""
        # Highlight box for payment amount
        total_outstanding = outstanding_data.get('total_outstanding', 0)

        pdf.setFillColorRGB(1, 0.95, 0.95)  # Light red background
        pdf.rect(PDFReceiptService.MARGIN, y - 0.8 * inch,
                PDFReceiptService.PAGE_WIDTH - 2 * PDFReceiptService.MARGIN,
                0.8 * inch, fill=1, stroke=1)
        pdf.setFillColorRGB(0, 0, 0)

        pdf.setFont("Helvetica-Bold", 14)
        pdf.drawCentredString(PDFReceiptService.PAGE_WIDTH / 2, y - 0.3 * inch,
                            f"Please Pay: ₹{total_outstanding:,.2f}")

        pdf.setFont("Helvetica", 10)
        pdf.drawCentredString(PDFReceiptService.PAGE_WIDTH / 2, y - 0.55 * inch,
                            "Payment is requested at the earliest to avoid any inconvenience.")

        y -= 1.2 * inch

        # Payment methods
        pdf.setFont("Helvetica-Bold", 11)
        pdf.drawString(PDFReceiptService.MARGIN, y, "Payment Methods:")
        y -= 0.25 * inch

        pdf.setFont("Helvetica", 10)
        methods = [
            "• Cash payment at school office",
            "• Bank transfer / Cheque",
            "• Online payment (UPI / Cards)",
            "• Contact school office for payment details"
        ]
        for method in methods:
            pdf.drawString(PDFReceiptService.MARGIN + 0.2 * inch, y, method)
            y -= 0.2 * inch

    @staticmethod
    def _draw_due_slip_footer(pdf: canvas.Canvas):
        """Draw footer for due slip"""
        y = 1.2 * inch

        # Important note
        pdf.setFont("Helvetica-BoldOblique", 10)
        pdf.setFillColorRGB(0.8, 0, 0)
        pdf.drawString(PDFReceiptService.MARGIN, y, "Note: This is a system-generated fee due notice.")
        pdf.setFillColorRGB(0, 0, 0)

        y -= 0.25 * inch
        pdf.setFont("Helvetica", 9)
        pdf.drawString(PDFReceiptService.MARGIN, y,
                      "For any queries regarding fees, please contact the school office.")

        # Generation timestamp
        y -= 0.3 * inch
        pdf.setFont("Helvetica", 8)
        timestamp = datetime.now().strftime("%d %B %Y %I:%M %p")
        pdf.drawCentredString(PDFReceiptService.PAGE_WIDTH / 2, y,
                            f"Generated on: {timestamp}")

        # Divider for tear-off slip
        y = 2 * inch
        pdf.setDash(2, 2)
        pdf.line(PDFReceiptService.MARGIN, y, PDFReceiptService.PAGE_WIDTH - PDFReceiptService.MARGIN, y)
        pdf.setDash()  # Reset to solid line
