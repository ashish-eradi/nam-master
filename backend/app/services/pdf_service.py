"""
PDF Receipt Generation Service

Generates professional formatted PDF receipts for fee payments.
Supports configurable page sizes (A4, A5, Letter), multiple templates
(classic, modern, minimal), and custom primary colors.
"""

from reportlab.lib.pagesizes import A4, A5, LETTER
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.platypus import Table, TableStyle
from io import BytesIO
from datetime import datetime
from decimal import Decimal
from typing import Optional
import os
from sqlalchemy.orm import Session
from app.models.finance import Payment as PaymentModel


# ---------------------------------------------------------------------------
# Font setup — DejaVu TTF supports ₹ and full Unicode.
# Priority: (1) system fonts (Dockerfile fonts-dejavu-core), (2) /tmp cache,
# (3) download from multiple CDN mirrors with timeout.
# _RUPEE is always safe to print: '\u20b9' when DejaVu loaded, 'Rs.' otherwise.
# ---------------------------------------------------------------------------
_FNT_N  = 'Helvetica'
_FNT_B  = 'Helvetica-Bold'
_FNT_I  = 'Helvetica-Oblique'
_FNT_BI = 'Helvetica-BoldOblique'
_RUPEE  = 'Rs.'       # guaranteed fallback; updated to '\u20b9' when DejaVu loads
_DEJAVU_LOADED = False

def _try_load_dejavu() -> bool:
    """Try to register DejaVu fonts. Safe to call multiple times (no-op if already loaded)."""
    global _FNT_N, _FNT_B, _FNT_I, _FNT_BI, _RUPEE, _DEJAVU_LOADED
    if _DEJAVU_LOADED:
        return True

    import urllib.request as _ul
    _names = ['DejaVuSans', 'DejaVuSans-Bold', 'DejaVuSans-Oblique', 'DejaVuSans-BoldOblique']

    # 1. System fonts installed via apt (Dockerfile: fonts-dejavu-core)
    _sys = {n: f'/usr/share/fonts/truetype/dejavu/{n}.ttf' for n in _names}
    if all(os.path.exists(p) for p in _sys.values()):
        _paths = _sys
    else:
        _tmp = {n: f'/tmp/nam_fonts/{n}.ttf' for n in _names}
        # 2. Already downloaded in a previous call this container session
        if all(os.path.exists(p) for p in _tmp.values()):
            _paths = _tmp
        else:
            # 3. Download from multiple CDN mirrors (first one that succeeds wins)
            _paths = None
            _mirrors = [
                'https://cdn.jsdelivr.net/gh/dejavu-fonts/dejavu-fonts@version_2_37/ttf/',
                'https://raw.githubusercontent.com/dejavu-fonts/dejavu-fonts/version_2_37/ttf/',
            ]
            try:
                os.makedirs('/tmp/nam_fonts', exist_ok=True)
            except Exception:
                return False

            for _base in _mirrors:
                try:
                    for n in _names:
                        p = f'/tmp/nam_fonts/{n}.ttf'
                        if not os.path.exists(p):
                            req = _ul.Request(f'{_base}{n}.ttf')
                            with _ul.urlopen(req, timeout=10) as resp:
                                with open(p, 'wb') as fh:
                                    fh.write(resp.read())
                    if all(os.path.exists(f'/tmp/nam_fonts/{n}.ttf') for n in _names):
                        _paths = _tmp
                        break
                except Exception:
                    # Remove partial downloads before trying next mirror
                    for n in _names:
                        p = f'/tmp/nam_fonts/{n}.ttf'
                        try:
                            if os.path.exists(p):
                                os.remove(p)
                        except Exception:
                            pass
            if _paths is None:
                return False

    try:
        from reportlab.pdfbase.ttfonts import TTFont as _TTFont
        from reportlab.pdfbase import pdfmetrics as _pm
        for _n, _p in _paths.items():
            _pm.registerFont(_TTFont(_n, _p))
        _FNT_N  = 'DejaVuSans'
        _FNT_B  = 'DejaVuSans-Bold'
        _FNT_I  = 'DejaVuSans-Oblique'
        _FNT_BI = 'DejaVuSans-BoldOblique'
        _RUPEE  = '\u20b9'
        _DEJAVU_LOADED = True
        return True
    except Exception:
        return False

# Attempt at import time — succeeds immediately when system fonts are present
_try_load_dejavu()


PAGE_SIZES = {
    'A4': A4,
    'A5': A5,
    'Letter': LETTER,
}

DEFAULT_RECEIPT_SETTINGS = {
    'page_size': 'A4',
    'template': 'classic',
    'primary_color': '#4f46e5',
    'show_logo': True,
    'show_signature': True,
}

DEFAULT_FEE_DUE_SETTINGS = {
    'page_size': 'A4',
    'template': 'formal',
    'primary_color': '#dc2626',
    'show_logo': True,
}

DEFAULT_PRINT_SETTINGS = {
    'receipt': DEFAULT_RECEIPT_SETTINGS,
    'fee_due': DEFAULT_FEE_DUE_SETTINGS,
}


def _hex_to_rgb(hex_color: str):
    """Convert hex color string to (r, g, b) floats 0-1."""
    hex_color = hex_color.lstrip('#')
    if len(hex_color) != 6:
        return (0.31, 0.27, 0.9)  # default indigo
    r = int(hex_color[0:2], 16) / 255
    g = int(hex_color[2:4], 16) / 255
    b = int(hex_color[4:6], 16) / 255
    return (r, g, b)


def _build_ctx(print_settings: dict, doc_type: str) -> dict:
    """Build a rendering context dict from print settings."""
    defaults = DEFAULT_RECEIPT_SETTINGS if doc_type == 'receipt' else DEFAULT_FEE_DUE_SETTINGS
    doc_settings = print_settings.get(doc_type, defaults)

    page_size_name = doc_settings.get('page_size', 'A4')
    pagesize = PAGE_SIZES.get(page_size_name, A4)
    page_width, page_height = pagesize

    # Scale spacing for smaller pages
    is_small = page_size_name == 'A5'
    margin = 0.55 * inch if is_small else 0.75 * inch
    font_scale = 0.85 if is_small else 1.0
    spacing_scale = 0.82 if is_small else 1.0

    primary_color = doc_settings.get('primary_color', defaults['primary_color'])

    return {
        'pagesize': pagesize,
        'width': page_width,
        'height': page_height,
        'margin': margin,
        'font_scale': font_scale,
        'spacing_scale': spacing_scale,
        'template': doc_settings.get('template', defaults.get('template', 'classic')),
        'primary_color': primary_color,
        'primary_rgb': _hex_to_rgb(primary_color),
        'show_logo': doc_settings.get('show_logo', True),
        'show_signature': doc_settings.get('show_signature', True),
        'custom_template_url': doc_settings.get('custom_template_url'),
        # Base64-encoded template binary stored in DB (persists across restarts)
        'custom_template_data': doc_settings.get('custom_template_data'),
        'custom_template_ext': doc_settings.get('custom_template_ext', ''),
        # When True: skip all opaque fills so template design shows through
        'has_custom_template': bool(
            doc_settings.get('custom_template_data') or doc_settings.get('custom_template_url')
        ),
        # Custom template overlay controls (set via Print Settings UI)
        # custom_field_positions: {field_key: {x: %, y: %}} — visual field mapper output
        'custom_field_positions': doc_settings.get('custom_field_positions', {}),
        # custom_content_top: fallback % from top when no field positions set (default 30)
        'custom_content_top': doc_settings.get('custom_content_top', 30),
        # custom_show_labels: draw "Student Name:" label alongside value (default False for templates)
        'custom_show_labels': doc_settings.get('custom_show_labels', False),
    }


def _fs(base: float, ctx: dict) -> float:
    """Scale a font size."""
    return base * ctx['font_scale']


def _sp(base: float, ctx: dict) -> float:
    """Scale a spacing value."""
    return base * ctx['spacing_scale']


class PDFReceiptService:
    """Service for generating professional PDF receipts"""

    @staticmethod
    def generate_receipt(payment: PaymentModel, db: Session,
                         school_logo_path: Optional[str] = None,
                         father_name: Optional[str] = None,
                         total_outstanding: float = 0.0,
                         print_settings: Optional[dict] = None) -> BytesIO:
        """Generate a professional PDF receipt for a payment."""
        _try_load_dejavu()  # retry font load if startup attempt failed
        ctx = _build_ctx(print_settings or {}, 'receipt')

        buffer = BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=ctx['pagesize'])

        if ctx.get('has_custom_template'):
            # Custom template mode: draw template background, then overlay only raw data
            PDFReceiptService._apply_custom_template(pdf, ctx.get('custom_template_url', ''), ctx)
            PDFReceiptService._draw_simple_receipt_data(pdf, payment, ctx, father_name, total_outstanding)
        else:
            # Standard mode: full structured layout
            y = PDFReceiptService._draw_receipt_header(pdf, payment, ctx, school_logo_path)
            y = PDFReceiptService._draw_receipt_number(pdf, payment.receipt_number, y, ctx)
            y = PDFReceiptService._draw_details_section(pdf, payment, y, ctx, father_name=father_name)
            y = PDFReceiptService._draw_payment_table(pdf, payment, y, ctx)
            y = PDFReceiptService._draw_amount_in_words(pdf, payment.amount_paid, y, ctx)
            y = PDFReceiptService._draw_outstanding_balance(pdf, total_outstanding, y, ctx)
            PDFReceiptService._draw_footer(pdf, payment, ctx)

        pdf.save()
        buffer.seek(0)

        # Post-process: merge content on top of PDF template background
        pdf_tpl_bytes = ctx.get('_pdf_tpl_bytes')
        if pdf_tpl_bytes:
            buffer = PDFReceiptService._merge_pdf_template_bytes(buffer, pdf_tpl_bytes)

        return buffer

    # ------------------------------------------------------------------ #
    # Receipt internal draw methods                                         #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _get_template_bytes(ctx: dict) -> Optional[bytes]:
        """Resolve template binary from DB base64 (primary) or file path (fallback)."""
        import base64
        # Primary: base64 stored in DB — always available regardless of filesystem
        b64 = ctx.get('custom_template_data')
        if b64:
            try:
                return base64.b64decode(b64)
            except Exception:
                pass
        # Fallback: file on disk (works in local Docker, may be absent on Render restart)
        url = ctx.get('custom_template_url')
        if url:
            for base in ('/app', ''):
                fs_path = base + url
                if os.path.exists(fs_path):
                    try:
                        with open(fs_path, 'rb') as f:
                            return f.read()
                    except Exception:
                        pass
        return None

    @staticmethod
    def _apply_custom_template(pdf: canvas.Canvas, template_url: str, ctx: dict) -> float:
        """Draw template as full-page background (PNG/JPG) or schedule PDF merge.
        Returns the y start position for content."""
        W, H, margin = ctx['width'], ctx['height'], ctx['margin']
        ext = (ctx.get('custom_template_ext') or os.path.splitext(template_url)[1]).lower()
        file_bytes = PDFReceiptService._get_template_bytes(ctx)

        if file_bytes is None:
            return H - margin

        if ext in ('.png', '.jpg', '.jpeg'):
            from reportlab.lib.utils import ImageReader
            try:
                pdf.drawImage(ImageReader(BytesIO(file_bytes)), 0, 0,
                              width=W, height=H, preserveAspectRatio=False)
            except Exception:
                pass
            return H - margin
        elif ext == '.pdf':
            # Store bytes in ctx; merged into final PDF after canvas.save()
            ctx['_pdf_tpl_bytes'] = file_bytes
            return H - margin

        return H - margin

    @staticmethod
    def _draw_at_pos(pdf: canvas.Canvas, ctx: dict, positions: dict, key: str, value: str,
                     label: str = '', show_label: bool = False, bold: bool = False):
        """Draw a single field value at its stored (x%, y%) position. No-op if key not in positions."""
        pos = positions.get(key)
        if pos is None:
            return
        W, H = ctx['width'], ctx['height']
        x = W * pos['x'] / 100
        y = H * (1.0 - pos['y'] / 100)
        fs = _fs(10, ctx)
        if show_label and label:
            pdf.setFont(_FNT_B, fs)
            pdf.drawString(x, y, label)
            pdf.setFont(_FNT_N, fs)
            label_w = pdf.stringWidth(label, _FNT_B, fs) + _sp(0.12 * inch, ctx)
            pdf.drawString(x + label_w, y, value)
        else:
            pdf.setFont(_FNT_B if bold else _FNT_N, fs)
            pdf.drawString(x, y, value)

    @staticmethod
    def _draw_simple_receipt_data(pdf: canvas.Canvas, payment: PaymentModel,
                                   ctx: dict, father_name: Optional[str] = None,
                                   total_outstanding: float = 0.0):
        """Draw only raw data values for custom template mode.
        If custom_field_positions is set: draw each value at its exact placed position.
        Otherwise fall back to the column-layout starting at custom_content_top%."""
        W, margin = ctx['width'], ctx['margin']
        H = ctx['height']

        student_name = f"{payment.student.first_name} {payment.student.last_name}"
        admission_no = payment.student.admission_number
        class_name   = getattr(payment.student.class_, 'name', 'N/A') if payment.student.class_ else 'N/A'
        show_labels  = ctx.get('custom_show_labels', False)

        # ── Branch 1: visual field positions set by user ─────────────────────
        field_positions = ctx.get('custom_field_positions') or {}
        if field_positions:
            _d = PDFReceiptService._draw_at_pos
            sl = show_labels
            _d(pdf, ctx, field_positions, 'receipt_no',  payment.receipt_number, 'Receipt No:', sl, bold=True)
            _d(pdf, ctx, field_positions, 'date',        payment.payment_date.strftime("%d %B %Y"), 'Date:', sl)
            _d(pdf, ctx, field_positions, 'student_name', student_name, 'Student Name:', sl)
            _d(pdf, ctx, field_positions, 'father_name',  father_name or 'N/A', "Father's Name:", sl)
            _d(pdf, ctx, field_positions, 'admission_no', admission_no, 'Admission No:', sl)
            _d(pdf, ctx, field_positions, 'class',        class_name, 'Class:', sl)
            _d(pdf, ctx, field_positions, 'payment_mode', payment.payment_mode.upper(), 'Mode:', sl)
            _d(pdf, ctx, field_positions, 'total',        f"{_RUPEE}{payment.amount_paid:,.2f}", 'Total:', sl, bold=True)
            if total_outstanding > 0:
                _d(pdf, ctx, field_positions, 'outstanding', f"{_RUPEE}{total_outstanding:,.2f}", 'Outstanding:', sl, bold=True)
            else:
                _d(pdf, ctx, field_positions, 'outstanding', 'Nil', 'Outstanding:', sl)

            # Fee table: draw a list starting at the placed position
            fee_pos = field_positions.get('fee_table')
            if fee_pos:
                fx = W * fee_pos['x'] / 100
                fy = H * (1.0 - fee_pos['y'] / 100)
                line_h = _sp(0.22 * inch, ctx)
                table_w = min(W - fx - margin, W * 0.55)
                for detail in payment.payment_details:
                    fee_name = detail.fee.fee_name if detail.fee else 'Fee'
                    amount = Decimal(str(detail.amount))
                    pdf.setFont(_FNT_N, _fs(9, ctx))
                    pdf.drawString(fx, fy, fee_name)
                    pdf.drawRightString(fx + table_w, fy, f"{_RUPEE}{amount:,.2f}")
                    fy -= line_h
            return  # field positions handled — done

        # ── Branch 2: no positions — column layout starting at custom_content_top% ─
        # Content start: configurable % from top (default 30%)
        content_top_pct = ctx.get('custom_content_top', 30)
        y = H * (1.0 - content_top_pct / 100.0)

        fs_label = _fs(10, ctx)
        fs_value = _fs(10, ctx)
        line_gap = _sp(0.26 * inch, ctx)
        label_w  = _sp(1.3 * inch, ctx)
        col2_x   = W / 2

        # Receipt No + Date on same line
        receipt_no  = payment.receipt_number
        date_str    = payment.payment_date.strftime("%d %B %Y")
        pdf.setFont(_FNT_B, _fs(11, ctx))
        if show_labels:
            pdf.drawString(margin, y, f"Receipt No: {receipt_no}")
            pdf.drawRightString(W - margin, y, f"Date: {date_str}")
        else:
            pdf.drawString(margin, y, receipt_no)
            pdf.drawRightString(W - margin, y, date_str)
        y -= line_gap * 1.2

        # Student details as two-column key–value pairs
        rows = [
            ("Student Name:", student_name),
            ("Admission No:", admission_no),
            ("Father's Name:", father_name or "N/A"),
            ("Class:", class_name),
            ("Payment Mode:", payment.payment_mode.upper()),
        ]
        if payment.transaction_id:
            rows.append(("Transaction ID:", payment.transaction_id))

        for i, (lbl, val) in enumerate(rows):
            x = margin if i % 2 == 0 else col2_x
            if show_labels:
                pdf.setFont(_FNT_B, fs_label)
                pdf.drawString(x, y, lbl)
                pdf.setFont(_FNT_N, fs_value)
                pdf.drawString(x + label_w, y, str(val))
            else:
                pdf.setFont(_FNT_N, fs_value)
                pdf.drawString(x, y, str(val))
            if i % 2 == 1 or i == len(rows) - 1:
                y -= line_gap

        y -= line_gap * 0.5

        # Fee breakdown — plain list, right-aligned amounts
        if show_labels:
            pdf.setFont(_FNT_B, _fs(10, ctx))
            pdf.drawString(margin, y, "Fee Details:")
            y -= line_gap

        total = Decimal('0')
        for detail in payment.payment_details:
            fee_name = detail.fee.fee_name if detail.fee else "Fee"
            amount   = Decimal(str(detail.amount))
            total   += amount
            pdf.setFont(_FNT_N, _fs(9, ctx))
            if show_labels:
                pdf.drawString(margin + _sp(0.15 * inch, ctx), y, f"\u2022  {fee_name}")
            else:
                pdf.drawString(margin, y, fee_name)
            pdf.drawRightString(W - margin, y, f"{_RUPEE}{amount:,.2f}")
            y -= line_gap * 0.9

        # Divider line + total
        y -= _sp(0.06 * inch, ctx)
        pdf.setLineWidth(0.5)
        pdf.line(margin, y, W - margin, y)
        y -= _sp(0.12 * inch, ctx)
        pdf.setFont(_FNT_B, _fs(11, ctx))
        if show_labels:
            pdf.drawString(margin, y, "Total Paid:")
        pdf.drawRightString(W - margin, y, f"{_RUPEE}{total:,.2f}")
        y -= line_gap * 1.3

        # Outstanding balance — plain text, no box
        if total_outstanding > 0:
            pdf.setFillColorRGB(0.6, 0.2, 0)
            pdf.setFont(_FNT_B, _fs(10, ctx))
            if show_labels:
                pdf.drawString(margin, y, f"Outstanding Balance: {_RUPEE}{total_outstanding:,.2f}")
                pdf.setFont(_FNT_N, _fs(8, ctx))
                pdf.drawString(margin, y - _sp(0.18 * inch, ctx),
                               "Please clear remaining dues at the earliest.")
            else:
                pdf.drawString(margin, y, f"{_RUPEE}{total_outstanding:,.2f}")
        else:
            pdf.setFillColorRGB(0, 0.5, 0)
            pdf.setFont(_FNT_N, _fs(10, ctx))
            if show_labels:
                pdf.drawString(margin, y, "All Dues Cleared — No Outstanding Balance")
        pdf.setFillColorRGB(0, 0, 0)

    @staticmethod
    def _merge_pdf_template_bytes(content_buffer: BytesIO, template_bytes: bytes) -> BytesIO:
        """Overlay ReportLab-generated content on top of a PDF template background."""
        try:
            from PyPDF2 import PdfReader, PdfWriter
            template_reader = PdfReader(BytesIO(template_bytes))
            content_reader = PdfReader(content_buffer)
            if not template_reader.pages or not content_reader.pages:
                content_buffer.seek(0)
                return content_buffer
            template_page = template_reader.pages[0]
            content_page = content_reader.pages[0]
            template_page.merge_page(content_page)
            writer = PdfWriter()
            writer.add_page(template_page)
            output = BytesIO()
            writer.write(output)
            output.seek(0)
            return output
        except Exception:
            content_buffer.seek(0)
            return content_buffer

    @staticmethod
    def _draw_receipt_header(pdf: canvas.Canvas, payment: PaymentModel,
                              ctx: dict, logo_path: Optional[str] = None) -> float:
        W, margin = ctx['width'], ctx['margin']
        template = ctx['template']
        y = ctx['height'] - margin

        school_name = getattr(payment.school, 'name', 'School Name')
        school_address = getattr(payment.school, 'address', '')
        school_phone = getattr(payment.school, 'phone', '')
        school_email = getattr(payment.school, 'email', '')
        contact_info = f"Phone: {school_phone} | Email: {school_email}" if school_phone or school_email else ''

        if template == 'modern':
            # Full-width colored band header
            band_height = _sp(1.1 * inch, ctx)
            r, g, b = ctx['primary_rgb']
            pdf.setFillColorRGB(r, g, b)
            pdf.rect(0, y - band_height, W, band_height, fill=1, stroke=0)
            pdf.setFillColorRGB(1, 1, 1)
            pdf.setFont(_FNT_B, _fs(18, ctx))
            pdf.drawCentredString(W / 2, y - _sp(0.35 * inch, ctx), school_name)
            if school_address or contact_info:
                pdf.setFont(_FNT_N, _fs(9, ctx))
                info_parts = [p for p in [school_address, contact_info] if p]
                pdf.drawCentredString(W / 2, y - _sp(0.6 * inch, ctx), '  |  '.join(info_parts))
            pdf.setFillColorRGB(0, 0, 0)
            return y - band_height - _sp(0.2 * inch, ctx)

        elif template == 'minimal':
            # Simple bordered header
            pdf.setFont(_FNT_B, _fs(18, ctx))
            pdf.drawCentredString(W / 2, y - _sp(0.3 * inch, ctx), school_name)
            if school_address:
                pdf.setFont(_FNT_N, _fs(10, ctx))
                pdf.drawCentredString(W / 2, y - _sp(0.55 * inch, ctx), school_address)
            if contact_info:
                pdf.setFont(_FNT_N, _fs(9, ctx))
                pdf.drawCentredString(W / 2, y - _sp(0.73 * inch, ctx), contact_info)
            y_line = y - _sp(0.9 * inch, ctx)
            pdf.setLineWidth(1.5)
            pdf.line(margin, y_line, W - margin, y_line)
            pdf.setLineWidth(0.5)
            pdf.line(margin, y_line - 3, W - margin, y_line - 3)
            pdf.setLineWidth(1)
            return y_line - _sp(0.25 * inch, ctx)

        else:  # classic
            logo_size = _sp(0.9 * inch, ctx)
            text_x = margin
            if ctx['show_logo'] and logo_path and os.path.exists(logo_path):
                try:
                    pdf.drawImage(logo_path, margin, y - logo_size,
                                  width=logo_size, height=logo_size, preserveAspectRatio=True)
                    text_x = margin + logo_size + _sp(0.25 * inch, ctx)
                except Exception:
                    pass

            pdf.setFont(_FNT_B, _fs(18, ctx))
            pdf.drawString(text_x, y - _sp(0.3 * inch, ctx), school_name)
            pdf.setFont(_FNT_N, _fs(10, ctx))
            if school_address:
                pdf.drawString(text_x, y - _sp(0.5 * inch, ctx), school_address)
            if contact_info:
                pdf.drawString(text_x, y - _sp(0.65 * inch, ctx), contact_info)
            y_line = y - _sp(0.9 * inch, ctx)
            pdf.line(margin, y_line, W - margin, y_line)
            return y_line - _sp(0.25 * inch, ctx)

    @staticmethod
    def _draw_receipt_number(pdf: canvas.Canvas, receipt_number: str, y: float, ctx: dict) -> float:
        W = ctx['width']
        pdf.setFont(_FNT_B, _fs(15, ctx))
        pdf.drawCentredString(W / 2, y, "FEE RECEIPT")
        y -= _sp(0.38 * inch, ctx)

        pdf.setFont(_FNT_B, _fs(13, ctx))
        receipt_text = f"Receipt No: {receipt_number}"
        text_width = pdf.stringWidth(receipt_text, _FNT_B, _fs(13, ctx))
        border_x = (W - text_width) / 2 - _sp(0.2 * inch, ctx)
        border_y = y - _sp(0.22 * inch, ctx)
        border_w = text_width + _sp(0.4 * inch, ctx)
        border_h = _sp(0.33 * inch, ctx)

        if not ctx.get('has_custom_template') and ctx['template'] != 'minimal':
            r, g, b = ctx['primary_rgb']
            pdf.setFillColorRGB(r * 0.15 + 0.85, g * 0.15 + 0.85, b * 0.15 + 0.85)
            pdf.rect(border_x, border_y, border_w, border_h, fill=1, stroke=1)
            pdf.setFillColorRGB(0, 0, 0)
        else:
            pdf.rect(border_x, border_y, border_w, border_h, fill=0, stroke=1)

        pdf.drawCentredString(W / 2, y - _sp(0.13 * inch, ctx), receipt_text)
        return y - _sp(0.48 * inch, ctx)

    @staticmethod
    def _draw_details_section(pdf: canvas.Canvas, payment: PaymentModel, y: float,
                               ctx: dict, father_name: Optional[str] = None) -> float:
        W, margin = ctx['width'], ctx['margin']
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

        col1_x = margin
        col2_x = W / 2
        current_y = y
        fs = _fs(10, ctx)
        label_width = _sp(1.1 * inch, ctx)

        for i, (label, value) in enumerate(details):
            x = col1_x if i % 2 == 0 else col2_x
            if i % 2 == 1:
                current_y -= _sp(0.23 * inch, ctx)
            pdf.setFont(_FNT_B, fs)
            pdf.drawString(x, current_y, label)
            pdf.setFont(_FNT_N, fs)
            pdf.drawString(x + label_width, current_y, str(value))
            if i % 2 == 1 or i == len(details) - 1:
                current_y -= _sp(0.23 * inch, ctx)

        return current_y - _sp(0.15 * inch, ctx)

    @staticmethod
    def _draw_payment_table(pdf: canvas.Canvas, payment: PaymentModel, y: float, ctx: dict) -> float:
        W, margin = ctx['width'], ctx['margin']
        data = [["S.No", "Fee Type", f"Amount ({_RUPEE})"]]
        total = Decimal('0')
        for i, detail in enumerate(payment.payment_details, 1):
            fee_name = detail.fee.fee_name if detail.fee else "Fee"
            amount = Decimal(str(detail.amount))
            total += amount
            data.append([str(i), fee_name, f"{amount:,.2f}"])
        data.append(["", "Total", f"{total:,.2f}"])

        usable = W - 2 * margin
        col_widths = [usable * 0.11, usable * 0.62, usable * 0.27]
        table = Table(data, colWidths=col_widths)

        r, g, b = ctx['primary_rgb']
        header_bg = colors.Color(r, g, b)

        if ctx['template'] == 'minimal':
            header_bg = colors.black
        elif ctx['template'] == 'modern':
            header_bg = colors.Color(r * 0.85, g * 0.85, b * 0.85)

        no_fill = ctx.get('has_custom_template', False)
        style_cmds = [
            ('FONTNAME', (0, 0), (-1, 0), _FNT_B),
            ('FONTSIZE', (0, 0), (-1, 0), _fs(11, ctx)),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTNAME', (0, 1), (-1, -2), _FNT_N),
            ('FONTSIZE', (0, 1), (-1, -2), _fs(9, ctx)),
            ('ALIGN', (0, 1), (0, -1), 'CENTER'),
            ('ALIGN', (1, 1), (1, -1), 'LEFT'),
            ('ALIGN', (2, 1), (2, -1), 'RIGHT'),
            ('FONTNAME', (0, -1), (-1, -1), _FNT_B),
            ('FONTSIZE', (0, -1), (-1, -1), _fs(10, ctx)),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('LINEBELOW', (0, 0), (-1, 0), 2, colors.black),
            ('TOPPADDING', (0, 0), (-1, -1), _sp(6, ctx)),
            ('BOTTOMPADDING', (0, 0), (-1, -1), _sp(6, ctx)),
        ]
        if not no_fill:
            style_cmds += [
                ('BACKGROUND', (0, 0), (-1, 0), header_bg),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#e5e7eb')),
            ]
        style = TableStyle(style_cmds)
        table.setStyle(style)
        table_x = margin
        table.wrapOn(pdf, sum(col_widths), 400)
        table_height = table.wrapOn(pdf, sum(col_widths), 400)[1]
        table.drawOn(pdf, table_x, y - table_height)
        return y - table_height - _sp(0.25 * inch, ctx)

    @staticmethod
    def _draw_amount_in_words(pdf: canvas.Canvas, amount: Decimal, y: float, ctx: dict) -> float:
        margin = ctx['margin']
        amount_words = PDFReceiptService._number_to_words(amount)
        fs = _fs(10, ctx)
        pdf.setFont(_FNT_B, fs)
        pdf.drawString(margin, y, "Amount in Words:")
        pdf.setFont(_FNT_I, fs)
        pdf.drawString(margin + _sp(1.45 * inch, ctx), y, amount_words)
        return y - _sp(0.45 * inch, ctx)

    @staticmethod
    def _draw_outstanding_balance(pdf: canvas.Canvas, total_outstanding: float, y: float, ctx: dict) -> float:
        W, margin = ctx['width'], ctx['margin']
        box_h = _sp(0.68 * inch, ctx)
        box_x = margin
        box_w = W - 2 * margin

        no_fill = ctx.get('has_custom_template', False)
        if total_outstanding > 0:
            pdf.setStrokeColorRGB(0.85, 0.33, 0)
            if not no_fill:
                pdf.setFillColorRGB(1, 0.95, 0.9)
        else:
            pdf.setStrokeColorRGB(0, 0.6, 0)
            if not no_fill:
                pdf.setFillColorRGB(0.9, 1, 0.9)

        pdf.rect(box_x, y - box_h, box_w, box_h, fill=0 if no_fill else 1, stroke=1)
        pdf.setFillColorRGB(0, 0, 0)
        pdf.setStrokeColorRGB(0, 0, 0)

        if total_outstanding > 0:
            pdf.setFont(_FNT_B, _fs(12, ctx))
            pdf.setFillColorRGB(0.6, 0.2, 0)
            pdf.drawCentredString(W / 2, y - _sp(0.25 * inch, ctx),
                                  f"Outstanding Balance: {_RUPEE}{total_outstanding:,.2f}")
            pdf.setFont(_FNT_N, _fs(8, ctx))
            pdf.setFillColorRGB(0.4, 0.4, 0.4)
            pdf.drawCentredString(W / 2, y - _sp(0.48 * inch, ctx),
                                  "Please clear the remaining dues at the earliest.")
        else:
            pdf.setFont(_FNT_B, _fs(12, ctx))
            pdf.setFillColorRGB(0, 0.5, 0)
            pdf.drawCentredString(W / 2, y - _sp(0.35 * inch, ctx),
                                  "All Dues Cleared \u2013 No Outstanding Balance")

        pdf.setFillColorRGB(0, 0, 0)
        return y - box_h - _sp(0.25 * inch, ctx)

    @staticmethod
    def _draw_footer(pdf: canvas.Canvas, payment: PaymentModel, ctx: dict):
        W, margin = ctx['width'], ctx['margin']
        y = _sp(1.4 * inch, ctx)
        received_by_name = payment.received_by.full_name if payment.received_by else "Staff"

        if ctx['show_signature']:
            pdf.setFont(_FNT_N, _fs(10, ctx))
            pdf.drawString(margin, y, f"Received by: {received_by_name}")
            pdf.drawString(W - margin - _sp(2.5 * inch, ctx), y, "Signature: ___________________")

        y -= _sp(0.45 * inch, ctx)
        pdf.setFont(_FNT_I, _fs(8, ctx))
        pdf.drawCentredString(W / 2, y,
                              "This is a computer-generated receipt and does not require a signature.")
        y -= _sp(0.18 * inch, ctx)
        pdf.setFont(_FNT_N, _fs(7, ctx))
        timestamp = datetime.now().strftime("%d %B %Y %I:%M %p")
        pdf.drawCentredString(W / 2, y, f"Generated on: {timestamp}")

    # ------------------------------------------------------------------ #
    # Fee Due Slip                                                          #
    # ------------------------------------------------------------------ #

    @staticmethod
    def generate_fee_due_slip(student_data: dict, outstanding_data: dict,
                               installments: list = None,
                               print_settings: Optional[dict] = None) -> BytesIO:
        """Generate a professional PDF fee due slip for a student."""
        _try_load_dejavu()  # retry font load if startup attempt failed
        ctx = _build_ctx(print_settings or {}, 'fee_due')

        buffer = BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=ctx['pagesize'])

        if ctx.get('has_custom_template'):
            # Custom template mode: draw template background, then overlay only raw data
            PDFReceiptService._apply_custom_template(pdf, ctx.get('custom_template_url', ''), ctx)
            PDFReceiptService._draw_simple_fee_due_data(pdf, student_data, outstanding_data,
                                                         installments, ctx)
        else:
            # Standard mode: full structured layout
            y = PDFReceiptService._draw_due_slip_header(pdf, student_data, ctx)
            pdf.setFont(_FNT_B, _fs(17, ctx))
            r, g, b = ctx['primary_rgb']
            pdf.setFillColorRGB(r, g, b)
            pdf.drawCentredString(ctx['width'] / 2, y, "FEE DUE NOTICE")
            pdf.setFillColorRGB(0, 0, 0)
            y -= _sp(0.45 * inch, ctx)
            y = PDFReceiptService._draw_due_slip_student_details(pdf, student_data, y, ctx)
            y = PDFReceiptService._draw_outstanding_table(pdf, outstanding_data, y, ctx)
            if installments and len(installments) > 0:
                y = PDFReceiptService._draw_overdue_installments(pdf, installments, y, ctx)
            PDFReceiptService._draw_payment_instructions(pdf, outstanding_data, y, ctx)
            PDFReceiptService._draw_due_slip_footer(pdf, ctx)

        pdf.save()
        buffer.seek(0)

        # Post-process: merge content on top of PDF template background
        pdf_tpl_bytes = ctx.get('_pdf_tpl_bytes')
        if pdf_tpl_bytes:
            buffer = PDFReceiptService._merge_pdf_template_bytes(buffer, pdf_tpl_bytes)

        return buffer

    @staticmethod
    def _draw_simple_fee_due_data(pdf: canvas.Canvas, student_data: dict,
                                   outstanding_data: dict, installments: list, ctx: dict):
        """Draw only raw fee-due data for custom template mode — no boxes, no fills."""
        W, margin = ctx['width'], ctx['margin']
        H = ctx['height']
        show_labels = ctx.get('custom_show_labels', False)

        # ── Branch 1: visual field positions set by user ─────────────────────
        field_positions = ctx.get('custom_field_positions') or {}
        if field_positions:
            _d = PDFReceiptService._draw_at_pos
            sl = show_labels
            issue_date = datetime.now().strftime("%d %B %Y")
            _d(pdf, ctx, field_positions, 'issue_date',        issue_date, 'Issue Date:', sl)
            _d(pdf, ctx, field_positions, 'academic_year',     str(student_data.get('academic_year', '')), 'Academic Year:', sl)
            _d(pdf, ctx, field_positions, 'student_name',      student_data.get('student_name', ''), 'Student Name:', sl)
            _d(pdf, ctx, field_positions, 'admission_no',      student_data.get('admission_number', ''), 'Admission No:', sl)
            _d(pdf, ctx, field_positions, 'class_name',        student_data.get('class_name', ''), 'Class:', sl)
            _d(pdf, ctx, field_positions, 'father_name',       student_data.get('father_name', ''), "Father's Name:", sl)
            total_outstanding = outstanding_data.get('total_outstanding', 0)
            _d(pdf, ctx, field_positions, 'total_outstanding', f"{_RUPEE}{total_outstanding:,.2f}", 'Total Outstanding:', sl, bold=True)

            # Outstanding fees list
            ot_pos = field_positions.get('outstanding_table')
            if ot_pos:
                fx = W * ot_pos['x'] / 100
                fy = H * (1.0 - ot_pos['y'] / 100)
                line_h = _sp(0.22 * inch, ctx)
                table_w = min(W - fx - margin, W * 0.55)
                for fee in outstanding_data.get('by_fee', []):
                    fee_name    = fee.get('fee_name', '')
                    outstanding = fee.get('outstanding', 0)
                    pdf.setFont(_FNT_N, _fs(9, ctx))
                    pdf.drawString(fx, fy, fee_name)
                    pdf.drawRightString(fx + table_w, fy, f"{_RUPEE}{outstanding:,.2f}")
                    fy -= line_h
            return  # field positions handled — done

        # ── Branch 2: no positions — column layout starting at custom_content_top% ─
        content_top_pct = ctx.get('custom_content_top', 30)
        y = H * (1.0 - content_top_pct / 100.0)

        line_gap = _sp(0.26 * inch, ctx)
        label_w  = _sp(1.5 * inch, ctx)
        col2_x   = W / 2

        # Issue date + academic year
        issue_date = datetime.now().strftime("%d %B %Y")
        pdf.setFont(_FNT_B, _fs(11, ctx))
        if show_labels:
            pdf.drawString(margin, y, f"Issue Date: {issue_date}")
            pdf.drawRightString(W - margin, y, f"Academic Year: {student_data.get('academic_year', '')}")
        else:
            pdf.drawString(margin, y, issue_date)
            pdf.drawRightString(W - margin, y, str(student_data.get('academic_year', '')))
        y -= line_gap * 1.3

        # Student details — two-column
        rows = [
            ("Student Name:", student_data.get('student_name', '')),
            ("Admission No:", student_data.get('admission_number', '')),
            ("Class:", student_data.get('class_name', '')),
            ("Father's Name:", student_data.get('father_name', '')),
        ]
        fs = _fs(10, ctx)
        for i, (lbl, val) in enumerate(rows):
            x = margin if i % 2 == 0 else col2_x
            if show_labels:
                pdf.setFont(_FNT_B, fs)
                pdf.drawString(x, y, lbl)
                pdf.setFont(_FNT_N, fs)
                pdf.drawString(x + label_w, y, str(val))
            else:
                pdf.setFont(_FNT_N, fs)
                pdf.drawString(x, y, str(val))
            if i % 2 == 1 or i == len(rows) - 1:
                y -= line_gap

        y -= line_gap * 0.5

        # Outstanding fee list — plain text
        if show_labels:
            pdf.setFont(_FNT_B, _fs(10, ctx))
            pdf.drawString(margin, y, "Outstanding Fees:")
            y -= line_gap

        by_fee = outstanding_data.get('by_fee', [])
        for fee in by_fee:
            fee_name    = fee.get('fee_name', '')
            outstanding = fee.get('outstanding', 0)
            pdf.setFont(_FNT_N, _fs(9, ctx))
            if show_labels:
                pdf.drawString(margin + _sp(0.15 * inch, ctx), y, f"\u2022  {fee_name}")
            else:
                pdf.drawString(margin, y, fee_name)
            pdf.drawRightString(W - margin, y, f"{_RUPEE}{outstanding:,.2f}")
            y -= line_gap * 0.9

        # Total outstanding
        total_outstanding = outstanding_data.get('total_outstanding', 0)
        y -= _sp(0.06 * inch, ctx)
        pdf.setLineWidth(0.5)
        pdf.line(margin, y, W - margin, y)
        y -= _sp(0.12 * inch, ctx)
        pdf.setFont(_FNT_B, _fs(11, ctx))
        pdf.setFillColorRGB(0.6, 0.2, 0)
        if show_labels:
            pdf.drawString(margin, y, f"Total Outstanding: {_RUPEE}{total_outstanding:,.2f}")
        else:
            pdf.drawString(margin, y, f"{_RUPEE}{total_outstanding:,.2f}")
        pdf.setFillColorRGB(0, 0, 0)

        # Overdue installments (if any)
        if installments:
            y -= line_gap * 1.5
            pdf.setFont(_FNT_B, _fs(10, ctx))
            pdf.drawString(margin, y, "Overdue Installments:")
            y -= line_gap
            pdf.setFont(_FNT_N, _fs(9, ctx))
            for inst in installments[:5]:
                fee_name    = inst.get('fee_name', '')
                due_date    = inst.get('due_date', '')
                amount      = inst.get('amount', 0)
                days_ov     = inst.get('days_overdue', 0)
                pdf.drawString(margin + _sp(0.15 * inch, ctx), y,
                               f"\u2022  {fee_name} — Due: {due_date} — {_RUPEE}{amount:,.2f} ({days_ov} days overdue)")
                y -= line_gap * 0.9

    @staticmethod
    def _draw_due_slip_header(pdf: canvas.Canvas, student_data: dict, ctx: dict) -> float:
        W, margin = ctx['width'], ctx['margin']
        template = ctx['template']
        y = ctx['height'] - margin

        school_name = student_data.get('school_name', 'School Name')
        school_address = student_data.get('school_address', '')
        school_contact = student_data.get('school_contact', '')

        if template == 'simple':
            pdf.setFont(_FNT_B, _fs(17, ctx))
            pdf.drawString(margin, y, school_name)
            pdf.setFont(_FNT_N, _fs(9, ctx))
            if school_address:
                pdf.drawString(margin, y - _sp(0.22 * inch, ctx), school_address)
            if school_contact:
                pdf.drawString(margin, y - _sp(0.38 * inch, ctx), school_contact)
            y_line = y - _sp(0.55 * inch, ctx)
            pdf.line(margin, y_line, W - margin, y_line)
        else:  # formal (default)
            pdf.setFont(_FNT_B, _fs(20, ctx))
            pdf.drawCentredString(W / 2, y, school_name)
            pdf.setFont(_FNT_N, _fs(10, ctx))
            if school_address:
                y -= _sp(0.23 * inch, ctx)
                pdf.drawCentredString(W / 2, y, school_address)
            if school_contact:
                y -= _sp(0.18 * inch, ctx)
                pdf.drawCentredString(W / 2, y, school_contact)
            y_line = y - _sp(0.28 * inch, ctx)
            pdf.line(margin, y_line, W - margin, y_line)

        y = y_line - _sp(0.28 * inch, ctx)
        pdf.setFont(_FNT_N, _fs(9, ctx))
        issue_date = datetime.now().strftime("%d %B %Y")
        pdf.drawString(margin, y, f"Issue Date: {issue_date}")
        pdf.drawRightString(W - margin, y, f"Academic Year: {student_data.get('academic_year', '')}")
        return y - _sp(0.42 * inch, ctx)

    @staticmethod
    def _draw_due_slip_student_details(pdf: canvas.Canvas, student_data: dict, y: float, ctx: dict) -> float:
        margin = ctx['margin']
        fs = _fs(10, ctx)
        pdf.setFont(_FNT_B, _fs(11, ctx))
        pdf.drawString(margin, y, "Student Details:")
        y -= _sp(0.28 * inch, ctx)

        details = [
            ("Student Name:", student_data.get('student_name', '')),
            ("Admission Number:", student_data.get('admission_number', '')),
            ("Class:", student_data.get('class_name', '')),
            ("Father's Name:", student_data.get('father_name', '')),
        ]
        label_width = _sp(1.7 * inch, ctx)
        for label, value in details:
            pdf.setFont(_FNT_B, fs)
            pdf.drawString(margin, y, label)
            pdf.setFont(_FNT_N, fs)
            pdf.drawString(margin + label_width, y, str(value))
            y -= _sp(0.23 * inch, ctx)

        return y - _sp(0.15 * inch, ctx)

    @staticmethod
    def _draw_outstanding_table(pdf: canvas.Canvas, outstanding_data: dict, y: float, ctx: dict) -> float:
        W, margin = ctx['width'], ctx['margin']
        pdf.setFont(_FNT_B, _fs(11, ctx))
        pdf.drawString(margin, y, "Outstanding Fees:")
        y -= _sp(0.28 * inch, ctx)

        data = [["S.No", "Fee Type", "Total", "Paid", "Outstanding"]]
        by_fee = outstanding_data.get('by_fee', [])
        for i, fee in enumerate(by_fee, 1):
            data.append([
                str(i),
                fee.get('fee_name', ''),
                f"{_RUPEE}{fee.get('final_amount', 0):,.2f}",
                f"{_RUPEE}{fee.get('amount_paid', 0):,.2f}",
                f"{_RUPEE}{fee.get('outstanding', 0):,.2f}",
            ])
        total_outstanding = outstanding_data.get('total_outstanding', 0)
        data.append(["", "TOTAL OUTSTANDING", "", "", f"{_RUPEE}{total_outstanding:,.2f}"])

        usable = W - 2 * margin
        col_widths = [usable * 0.09, usable * 0.37, usable * 0.18, usable * 0.18, usable * 0.18]
        table = Table(data, colWidths=col_widths)

        r, g, b = ctx['primary_rgb']
        header_bg = colors.Color(r, g, b)
        total_bg = colors.Color(min(1, r + 0.85 * (1 - r)), min(1, g + 0.85 * (1 - g)), min(1, b + 0.85 * (1 - b)))

        no_fill = ctx.get('has_custom_template', False)
        due_style_cmds = [
            ('FONTNAME', (0, 0), (-1, 0), _FNT_B),
            ('FONTSIZE', (0, 0), (-1, 0), _fs(10, ctx)),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTNAME', (0, 1), (-1, -2), _FNT_N),
            ('FONTSIZE', (0, 1), (-1, -2), _fs(9, ctx)),
            ('ALIGN', (0, 1), (0, -1), 'CENTER'),
            ('ALIGN', (1, 1), (1, -1), 'LEFT'),
            ('ALIGN', (2, 1), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, -1), (-1, -1), _FNT_B),
            ('FONTSIZE', (0, -1), (-1, -1), _fs(10, ctx)),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('LINEBELOW', (0, 0), (-1, 0), 2, colors.black),
            ('TOPPADDING', (0, 0), (-1, -1), _sp(6, ctx)),
            ('BOTTOMPADDING', (0, 0), (-1, -1), _sp(6, ctx)),
        ]
        if not no_fill:
            due_style_cmds += [
                ('BACKGROUND', (0, 0), (-1, 0), header_bg),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('BACKGROUND', (0, -1), (-1, -1), total_bg),
                ('TEXTCOLOR', (0, -1), (-1, -1), colors.Color(r * 0.7, g * 0.7, b * 0.7)),
            ]
        style = TableStyle(due_style_cmds)
        table.setStyle(style)
        table_x = margin
        table.wrapOn(pdf, sum(col_widths), 400)
        table_height = table.wrapOn(pdf, sum(col_widths), 400)[1]
        table.drawOn(pdf, table_x, y - table_height)
        return y - table_height - _sp(0.35 * inch, ctx)

    @staticmethod
    def _draw_overdue_installments(pdf: canvas.Canvas, installments: list, y: float, ctx: dict) -> float:
        margin = ctx['margin']
        r, g, b = ctx['primary_rgb']
        pdf.setFont(_FNT_B, _fs(11, ctx))
        pdf.setFillColorRGB(r, g, b)
        pdf.drawString(margin, y, "\u26a0 Overdue Installments:")
        pdf.setFillColorRGB(0, 0, 0)
        y -= _sp(0.28 * inch, ctx)

        pdf.setFont(_FNT_N, _fs(9, ctx))
        for inst in installments[:5]:
            fee_name = inst.get('fee_name', '')
            due_date = inst.get('due_date', '')
            amount = inst.get('amount', 0)
            days_overdue = inst.get('days_overdue', 0)
            text = f"\u2022 {fee_name} \u2013 Due: {due_date} \u2013 {_RUPEE}{amount:,.2f} ({days_overdue} days overdue)"
            pdf.drawString(margin + _sp(0.15 * inch, ctx), y, text)
            y -= _sp(0.18 * inch, ctx)

        return y - _sp(0.15 * inch, ctx)

    @staticmethod
    def _draw_payment_instructions(pdf: canvas.Canvas, outstanding_data: dict, y: float, ctx: dict):
        W, margin = ctx['width'], ctx['margin']
        total_outstanding = outstanding_data.get('total_outstanding', 0)
        r, g, b = ctx['primary_rgb']
        box_bg = colors.Color(min(1, r + 0.92 * (1 - r)), min(1, g + 0.92 * (1 - g)), min(1, b + 0.92 * (1 - b)))

        box_h = _sp(0.75 * inch, ctx)
        no_fill = ctx.get('has_custom_template', False)
        if not no_fill:
            pdf.setFillColor(box_bg)
        pdf.rect(margin, y - box_h, W - 2 * margin, box_h, fill=0 if no_fill else 1, stroke=1)
        pdf.setFillColorRGB(0, 0, 0)

        pdf.setFont(_FNT_B, _fs(13, ctx))
        pdf.drawCentredString(W / 2, y - _sp(0.28 * inch, ctx),
                              f"Please Pay: {_RUPEE}{total_outstanding:,.2f}")
        pdf.setFont(_FNT_N, _fs(9, ctx))
        pdf.drawCentredString(W / 2, y - _sp(0.52 * inch, ctx),
                              "Payment is requested at the earliest to avoid any inconvenience.")

        y -= box_h + _sp(0.2 * inch, ctx)
        pdf.setFont(_FNT_B, _fs(10, ctx))
        pdf.drawString(margin, y, "Payment Methods:")
        y -= _sp(0.22 * inch, ctx)
        pdf.setFont(_FNT_N, _fs(9, ctx))
        for method in ["\u2022 Cash payment at school office",
                       "\u2022 Bank transfer / Cheque",
                       "\u2022 Online payment (UPI / Cards)"]:
            pdf.drawString(margin + _sp(0.15 * inch, ctx), y, method)
            y -= _sp(0.18 * inch, ctx)

    @staticmethod
    def _draw_due_slip_footer(pdf: canvas.Canvas, ctx: dict):
        W, margin = ctx['width'], ctx['margin']
        y = _sp(1.1 * inch, ctx)
        r, g, b = ctx['primary_rgb']
        pdf.setFont(_FNT_BI, _fs(9, ctx))
        pdf.setFillColorRGB(r, g, b)
        pdf.drawString(margin, y, "Note: This is a system-generated fee due notice.")
        pdf.setFillColorRGB(0, 0, 0)
        y -= _sp(0.22 * inch, ctx)
        pdf.setFont(_FNT_N, _fs(8, ctx))
        pdf.drawString(margin, y, "For any queries regarding fees, please contact the school office.")
        y -= _sp(0.25 * inch, ctx)
        pdf.setFont(_FNT_N, _fs(7, ctx))
        timestamp = datetime.now().strftime("%d %B %Y %I:%M %p")
        pdf.drawCentredString(W / 2, y, f"Generated on: {timestamp}")

        # Tear-off line
        y = _sp(1.85 * inch, ctx)
        pdf.setDash(2, 2)
        pdf.line(margin, y, W - margin, y)
        pdf.setDash()

    # ------------------------------------------------------------------ #
    # Utilities                                                             #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _number_to_words(amount: Decimal) -> str:
        """Convert number to words (Indian numbering system)"""
        amount_int = int(amount)
        if amount_int == 0:
            return "Zero Rupees Only"

        ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"]
        teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen",
                 "Sixteen", "Seventeen", "Eighteen", "Nineteen"]
        tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

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

        result = []
        if amount_int >= 10000000:
            result.append(convert_hundreds(amount_int // 10000000) + " Crore")
            amount_int %= 10000000
        if amount_int >= 100000:
            result.append(convert_hundreds(amount_int // 100000) + " Lakh")
            amount_int %= 100000
        if amount_int >= 1000:
            result.append(convert_hundreds(amount_int // 1000) + " Thousand")
            amount_int %= 1000
        if amount_int > 0:
            result.append(convert_hundreds(amount_int))

        return " ".join(result) + " Rupees Only"
