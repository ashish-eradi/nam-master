from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, or_
from app.core.database import get_db
from app.core.permissions import is_admin
from app.core.utils import tenant_aware_query
from app.api.deps import get_current_user_school
from app.models.attendance import Attendance
from app.models.grade import Grade
from app.models.finance import Payment as PaymentModel, Fund as FundModel, StudentFeeStructure as StudentFeeStructureModel, FeeInstallment as FeeInstallmentModel, Fee as FeeModel, PaymentDetail as PaymentDetailModel, Salary as SalaryModel, ClassFee as ClassFeeModel, Expenditure as ExpenditureModel
from app.models.student import Student
from app.models.user import User
from app.models.class_model import Class as ClassModel
from app.models.teacher import Teacher as TeacherModel
from app.models.parent import ParentStudentRelation, Parent as ParentModel
from app.services.pdf_service import _FNT_N, _FNT_B, _FNT_I, _RUPEE, _try_load_dejavu
from app.schemas.report_schema import (
    CollectionSummary, CollectionSummaryItem,
    DefaultersReport, DefaulterStudent,
    FundWiseCollection, FundCollectionDetail,
    ClassWiseCollection, ClassCollectionSummary,
    DailyCollection, DailyCollectionItem,
    InstallmentStatusSummary,
    DailyExpenditure, DailyExpenditureItem, GeneralExpenditureItem
)
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Optional
import uuid

router = APIRouter()

@router.get("/admin-dashboard", dependencies=[Depends(is_admin)])
def get_admin_dashboard(db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    total_students = tenant_aware_query(db, Student, school_id).count()
    total_teachers = tenant_aware_query(db, User, school_id).filter(User.role == "TEACHER").count()
    total_classes = tenant_aware_query(db, ClassModel, school_id).count()
    return {"total_students": total_students, "total_teachers": total_teachers, "total_classes": total_classes}

@router.get("/attendance", dependencies=[Depends(is_admin)])
def get_attendance_report(db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    rows = tenant_aware_query(db, Attendance, school_id).options(
        joinedload(Attendance.student),
        joinedload(Attendance.class_),
        joinedload(Attendance.subject),
    ).order_by(Attendance.date.desc()).all()
    return [
        {
            "date": str(r.date),
            "student_name": f"{r.student.first_name} {r.student.last_name}" if r.student else "",
            "admission_number": r.student.admission_number if r.student else "",
            "class": r.class_.name if r.class_ else "",
            "subject": r.subject.name if r.subject else "",
            "status": r.status,
            "remarks": r.remarks or "",
        }
        for r in rows
    ]

@router.get("/grades", dependencies=[Depends(is_admin)])
def get_grades_report(db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    rows = tenant_aware_query(db, Grade, school_id).options(
        joinedload(Grade.student),
        joinedload(Grade.subject),
        joinedload(Grade.assessment),
    ).order_by(Grade.date.desc()).all()
    return [
        {
            "date": str(r.date) if r.date else "",
            "student_name": f"{r.student.first_name} {r.student.last_name}" if r.student else "",
            "admission_number": r.student.admission_number if r.student else "",
            "subject": r.subject.name if r.subject else "",
            "assessment": r.assessment.name if r.assessment else "",
            "exam_type": r.exam_type or "",
            "score": float(r.score_achieved),
            "grade": r.grade_letter or "",
            "academic_year": r.academic_year or "",
            "remarks": r.remarks or "",
        }
        for r in rows
    ]

@router.get("/financial", dependencies=[Depends(is_admin)])
def get_financial_report(db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    rows = tenant_aware_query(db, PaymentModel, school_id).options(
        joinedload(PaymentModel.student),
        joinedload(PaymentModel.fund),
    ).order_by(PaymentModel.payment_date.desc()).all()
    return [
        {
            "date": str(r.payment_date),
            "receipt_number": r.receipt_number,
            "student_name": f"{r.student.first_name} {r.student.last_name}" if r.student else "",
            "admission_number": r.student.admission_number if r.student else "",
            "fund": r.fund.name if r.fund else "",
            "amount_paid": float(r.amount_paid),
            "payment_mode": r.payment_mode or "",
            "remarks": r.remarks or "",
        }
        for r in rows
    ]

@router.get("/students", dependencies=[Depends(is_admin)])
def get_student_report(db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    from app.models.parent import Parent as ParentModel, ParentStudentRelation as PSRModel
    rows = tenant_aware_query(db, Student, school_id).options(
        joinedload(Student.class_),
    ).order_by(Student.first_name).all()
    result = []
    for s in rows:
        psr = db.query(PSRModel).join(ParentModel, PSRModel.parent_id == ParentModel.id).filter(
            PSRModel.student_id == s.id
        ).first()
        parent = psr.parent if psr else None
        result.append({
            "admission_number": s.admission_number,
            "name": f"{s.first_name} {s.last_name}",
            "class": s.class_.name if s.class_ else "",
            "gender": s.gender.value if s.gender else "",
            "date_of_birth": str(s.date_of_birth) if s.date_of_birth else "",
            "blood_group": s.blood_group or "",
            "status": s.status.value if s.status else "",
            "academic_year": s.academic_year or "",
            "father_name": parent.father_name if parent else "",
            "father_phone": parent.father_phone if parent else "",
            "mother_name": parent.mother_name if parent else "",
            "mother_phone": parent.mother_phone if parent else "",
            "address": s.address or "",
            "admission_date": str(s.admission_date) if s.admission_date else "",
        })
    return result


# --- Financial Reports ---

@router.get("/finance/collection-summary", response_model=CollectionSummary, dependencies=[Depends(is_admin)])
def get_collection_summary(
    academic_year: str = Query(..., description="Academic year (e.g., 2024-25)"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Get comprehensive collection summary by fund for an academic year."""
    # Default date range to academic year dates if not provided
    if not start_date:
        start_date = date(int(academic_year.split('-')[0]), 4, 1)
    if not end_date:
        end_date = date.today()

    # Get all funds for the school
    funds = tenant_aware_query(db, FundModel, school_id).all()

    fund_summaries = []
    total_expected = Decimal('0')
    total_collected = Decimal('0')
    total_outstanding = Decimal('0')

    for fund in funds:
        # Get fee structures for this fund's fees
        fee_structures = db.query(StudentFeeStructureModel).join(
            ClassFeeModel, StudentFeeStructureModel.class_fee_id == ClassFeeModel.id
        ).join(
            FeeModel, ClassFeeModel.fee_id == FeeModel.id
        ).filter(
            FeeModel.fund_id == fund.id,
            StudentFeeStructureModel.academic_year == academic_year
        ).all()

        fund_expected = sum(Decimal(str(fs.final_amount)) for fs in fee_structures)
        fund_paid = sum(Decimal(str(fs.amount_paid)) for fs in fee_structures)
        fund_outstanding = sum(Decimal(str(fs.outstanding_amount)) for fs in fee_structures)

        if fund_expected > 0:
            fund_percentage = float((fund_paid / fund_expected) * 100)
        else:
            fund_percentage = 0.0

        fund_summaries.append(CollectionSummaryItem(
            fund_name=fund.name,
            expected_amount=float(fund_expected),
            collected_amount=float(fund_paid),
            outstanding_amount=float(fund_outstanding),
            collection_percentage=round(fund_percentage, 2)
        ))

        total_expected += fund_expected
        total_collected += fund_paid
        total_outstanding += fund_outstanding

    overall_percentage = float((total_collected / total_expected) * 100) if total_expected > 0 else 0.0

    return CollectionSummary(
        academic_year=academic_year,
        start_date=start_date,
        end_date=end_date,
        total_expected=float(total_expected),
        total_collected=float(total_collected),
        total_outstanding=float(total_outstanding),
        overall_percentage=round(overall_percentage, 2),
        by_fund=fund_summaries
    )


@router.get("/finance/defaulters", response_model=DefaultersReport, dependencies=[Depends(is_admin)])
def get_defaulters_report(
    academic_year: str = Query(..., description="Academic year (e.g., 2024-25)"),
    min_outstanding: float = Query(0, description="Minimum outstanding amount"),
    include_overdue_only: bool = Query(True, description="Include only students with overdue installments"),
    include_transport_fees: bool = Query(True, description="Include transport fees in outstanding calculation"),
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Get list of students with outstanding fees (defaulters)."""
    from app.models.transport import StudentRouteFeeStructure as StudentRouteFeeStructureModel

    as_of_date = date.today()

    # Query students with outstanding school fees
    students_with_outstanding = db.query(
        Student.id,
        Student.admission_number,
        Student.first_name,
        Student.last_name,
        ClassModel.name.label('class_name'),
        ClassModel.section.label('section'),
        func.sum(StudentFeeStructureModel.final_amount).label('school_fee_total'),
        func.sum(StudentFeeStructureModel.amount_paid).label('school_fee_paid'),
        func.sum(StudentFeeStructureModel.outstanding_amount).label('school_fee_outstanding')
    ).join(
        StudentFeeStructureModel, Student.id == StudentFeeStructureModel.student_id
    ).join(
        ClassModel, Student.class_id == ClassModel.id
    ).filter(
        Student.school_id == school_id,
        StudentFeeStructureModel.academic_year == academic_year,
        StudentFeeStructureModel.outstanding_amount > 0
    ).group_by(
        Student.id,
        Student.admission_number,
        Student.first_name,
        Student.last_name,
        ClassModel.name,
        ClassModel.section
    ).all()

    # If including transport fees, also query transport outstanding
    students_with_transport = {}
    students_route_names = {}
    if include_transport_fees:
        from app.models.transport import Route as RouteModel, StudentRoute as StudentRouteModel
        transport_query = db.query(
            Student.id,
            func.sum(StudentRouteFeeStructureModel.outstanding_amount).label('transport_outstanding')
        ).join(
            StudentRouteFeeStructureModel, Student.id == StudentRouteFeeStructureModel.student_id
        ).filter(
            Student.school_id == school_id,
            StudentRouteFeeStructureModel.academic_year == academic_year,
            StudentRouteFeeStructureModel.outstanding_amount > 0
        ).group_by(Student.id).all()

        students_with_transport = {str(row.id): float(row.transport_outstanding) for row in transport_query}

        # Fetch route names for transport students
        route_name_query = db.query(
            Student.id,
            RouteModel.route_name,
            RouteModel.route_number
        ).join(
            StudentRouteModel, Student.id == StudentRouteModel.student_id
        ).join(
            RouteModel, StudentRouteModel.route_id == RouteModel.id
        ).filter(
            Student.school_id == school_id,
            StudentRouteModel.academic_year == academic_year
        ).all()

        students_route_names = {
            str(row.id): f"{row.route_name}" + (f" ({row.route_number})" if row.route_number else "")
            for row in route_name_query
        }

    # Combine school fees and transport fees
    combined_students = {}
    for student_data in students_with_outstanding:
        student_id = str(student_data.id)
        school_outstanding = float(student_data.school_fee_outstanding)
        school_paid = float(student_data.school_fee_paid)
        school_total = float(student_data.school_fee_total)
        transport_outstanding = students_with_transport.get(student_id, 0.0)
        total_outstanding = school_outstanding + transport_outstanding

        combined_students[student_id] = {
            'data': student_data,
            'total_fees': school_total,
            'total_paid': school_paid,
            'total_outstanding': total_outstanding,
            'transport_outstanding': transport_outstanding
        }

    # Add students who only have transport outstanding
    if include_transport_fees:
        for student_id, transport_out in students_with_transport.items():
            if student_id not in combined_students:
                student = db.query(Student).options(joinedload(Student.class_)).filter(Student.id == student_id).first()
                if student:
                    combined_students[student_id] = {
                        'data': type('obj', (object,), {
                            'id': student.id,
                            'admission_number': student.admission_number,
                            'first_name': student.first_name,
                            'last_name': student.last_name,
                            'class_name': student.class_.name if student.class_ else 'N/A',
                            'section': student.class_.section if student.class_ else None,
                            'school_fee_outstanding': 0
                        })(),
                        'total_outstanding': transport_out,
                        'transport_outstanding': transport_out
                    }

    defaulters = []
    total_outstanding_sum = Decimal('0')

    for student_id, student_info in combined_students.items():
        student_data = student_info['data']
        total_outstanding = student_info['total_outstanding']

        # Apply minimum outstanding filter
        if total_outstanding < min_outstanding:
            continue

        # Get overdue installments count and oldest due date
        # Only count installments from fee structures that still have outstanding balance
        # Include 'overdue' status in addition to 'pending' and 'partial'
        overdue_installments = db.query(FeeInstallmentModel).join(
            StudentFeeStructureModel, FeeInstallmentModel.student_fee_structure_id == StudentFeeStructureModel.id
        ).filter(
            StudentFeeStructureModel.student_id == student_data.id,
            StudentFeeStructureModel.academic_year == academic_year,
            StudentFeeStructureModel.outstanding_amount > 0,
            FeeInstallmentModel.due_date < as_of_date,
            FeeInstallmentModel.status.in_(['pending', 'partial', 'overdue'])
        ).all()

        overdue_count = len(overdue_installments)
        oldest_due_date = min([inst.due_date for inst in overdue_installments]) if overdue_installments else None

        # Skip if include_overdue_only is True and no overdue installments
        if include_overdue_only and overdue_count == 0:
            continue

        # Get parent contact information
        from app.models.parent import Parent as ParentModel, ParentStudentRelation as ParentStudentRelationModel
        from sqlalchemy.orm import joinedload as _joinedload
        parent_relation = db.query(ParentStudentRelationModel).options(
            _joinedload(ParentStudentRelationModel.parent)
        ).filter(
            ParentStudentRelationModel.student_id == student_data.id
        ).first()

        contact_phone = None
        parent_phone = None
        father_name = None
        if parent_relation and parent_relation.parent:
            contact_phone = parent_relation.parent.father_phone
            parent_phone = parent_relation.parent.mother_phone or parent_relation.parent.father_phone
            father_name = parent_relation.parent.father_name

        student_name = f"{student_data.first_name} {student_data.last_name}"
        outstanding = Decimal(str(total_outstanding))
        transport_out = student_info.get('transport_outstanding', 0)
        school_out = float(outstanding) - float(transport_out)

        defaulters.append(DefaulterStudent(
            student_id=str(student_data.id),
            admission_number=student_data.admission_number,
            student_name=student_name,
            class_name=student_data.class_name,
            section=getattr(student_data, 'section', None),
            total_fees=student_info.get('total_fees', 0),
            total_paid=student_info.get('total_paid', 0),
            total_outstanding=float(outstanding),
            overdue_installments=overdue_count,
            oldest_due_date=oldest_due_date,
            contact_phone=contact_phone,
            parent_phone=parent_phone,
            father_name=father_name,
            route_name=students_route_names.get(student_id),
            transport_outstanding=float(transport_out),
            school_outstanding=school_out
        ))

        total_outstanding_sum += outstanding

    # Sort by outstanding amount (highest first)
    defaulters.sort(key=lambda x: x.total_outstanding, reverse=True)

    return DefaultersReport(
        academic_year=academic_year,
        as_of_date=as_of_date,
        total_defaulters=len(defaulters),
        total_outstanding=float(total_outstanding_sum),
        students=defaulters
    )


@router.get("/finance/fund-wise-collection", response_model=FundWiseCollection, dependencies=[Depends(is_admin)])
def get_fund_wise_collection(
    fund_id: uuid.UUID = Query(..., description="Fund ID"),
    start_date: date = Query(..., description="Start date"),
    end_date: date = Query(..., description="End date"),
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Get detailed collection report for a specific fund."""
    # Get fund
    fund = db.query(FundModel).filter(
        FundModel.id == fund_id,
        FundModel.school_id == school_id
    ).first()

    if not fund:
        raise HTTPException(status_code=404, detail="Fund not found")

    # Get all payments for this fund in date range
    payments = db.query(PaymentModel).options(
        joinedload(PaymentModel.student).joinedload(Student.class_)
    ).filter(
        PaymentModel.fund_id == fund_id,
        PaymentModel.payment_date >= start_date,
        PaymentModel.payment_date <= end_date,
        PaymentModel.school_id == school_id
    ).order_by(PaymentModel.payment_date.desc()).all()

    # Calculate totals
    total_collected = sum(Decimal(str(p.amount_paid)) for p in payments)
    payment_count = len(payments)

    # Group by payment mode
    by_mode = {}
    for payment in payments:
        mode = payment.payment_mode
        if mode not in by_mode:
            by_mode[mode] = 0
        by_mode[mode] += float(payment.amount_paid)

    # Create payment details list
    payment_details = []
    for payment in payments:
        student_name = f"{payment.student.first_name} {payment.student.last_name}"
        payment_details.append(FundCollectionDetail(
            payment_date=payment.payment_date,
            receipt_number=payment.receipt_number,
            student_name=student_name,
            admission_number=payment.student.admission_number,
            amount=float(payment.amount_paid),
            payment_mode=payment.payment_mode
        ))

    return FundWiseCollection(
        fund_id=str(fund.id),
        fund_name=fund.name,
        start_date=start_date,
        end_date=end_date,
        total_collected=float(total_collected),
        payment_count=payment_count,
        by_mode=by_mode,
        payments=payment_details
    )


@router.get("/finance/class-wise-collection", response_model=ClassWiseCollection, dependencies=[Depends(is_admin)])
def get_class_wise_collection(
    academic_year: str = Query(..., description="Academic year (e.g., 2024-25)"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Get collection summary by class."""
    # Default date range
    if not start_date:
        start_date = date(int(academic_year.split('-')[0]), 4, 1)
    if not end_date:
        end_date = date.today()

    # Get all classes for the school
    classes = tenant_aware_query(db, ClassModel, school_id).all()

    class_summaries = []

    for class_obj in classes:
        # Get students in this class
        students = tenant_aware_query(db, Student, school_id).filter(
            Student.class_id == class_obj.id
        ).all()

        total_students = len(students)

        # Get fee structures for students in this class
        fee_structures = db.query(StudentFeeStructureModel).filter(
            StudentFeeStructureModel.student_id.in_([s.id for s in students]),
            StudentFeeStructureModel.academic_year == academic_year
        ).all()

        expected_amount = sum(Decimal(str(fs.final_amount)) for fs in fee_structures)
        collected_amount = sum(Decimal(str(fs.amount_paid)) for fs in fee_structures)
        outstanding_amount = sum(Decimal(str(fs.outstanding_amount)) for fs in fee_structures)

        students_with_dues = sum(1 for fs in fee_structures if Decimal(str(fs.outstanding_amount)) > 0)

        collection_percentage = float((collected_amount / expected_amount) * 100) if expected_amount > 0 else 0.0

        class_summaries.append(ClassCollectionSummary(
            class_id=str(class_obj.id),
            class_name=class_obj.name,
            total_students=total_students,
            expected_amount=float(expected_amount),
            collected_amount=float(collected_amount),
            outstanding_amount=float(outstanding_amount),
            collection_percentage=round(collection_percentage, 2),
            students_with_dues=students_with_dues
        ))

    return ClassWiseCollection(
        academic_year=academic_year,
        start_date=start_date,
        end_date=end_date,
        classes=class_summaries
    )


@router.get("/finance/daily-collection", response_model=DailyCollection, dependencies=[Depends(is_admin)])
def get_daily_collection(
    collection_date: date = Query(..., description="Date for collection report"),
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Get collection summary for a specific date."""
    # Get all payments for the date
    payments = db.query(PaymentModel).options(
        joinedload(PaymentModel.fund)
    ).filter(
        PaymentModel.payment_date == collection_date,
        PaymentModel.school_id == school_id
    ).all()

    total_amount = sum(Decimal(str(p.amount_paid)) for p in payments)
    total_payments = len(payments)

    # Group by fund
    by_fund_dict = {}
    for payment in payments:
        fund_name = payment.fund.name if payment.fund else 'Unknown'
        if fund_name not in by_fund_dict:
            by_fund_dict[fund_name] = {'amount': Decimal('0'), 'count': 0}
        by_fund_dict[fund_name]['amount'] += Decimal(str(payment.amount_paid))
        by_fund_dict[fund_name]['count'] += 1

    by_fund = [
        DailyCollectionItem(
            fund_name=fund_name,
            amount=float(data['amount']),
            payment_count=data['count']
        )
        for fund_name, data in by_fund_dict.items()
    ]

    # Group by payment mode
    by_mode = {}
    for payment in payments:
        mode = payment.payment_mode
        if mode not in by_mode:
            by_mode[mode] = 0
        by_mode[mode] += float(payment.amount_paid)

    return DailyCollection(
        date=collection_date,
        total_amount=float(total_amount),
        total_payments=total_payments,
        by_fund=by_fund,
        by_mode=by_mode
    )


@router.get("/finance/daily-collection/download", dependencies=[Depends(is_admin)])
def download_daily_collection_pdf(
    collection_date: date = Query(..., description="Date for collection report"),
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Download daily collection report as PDF."""
    _try_load_dejavu()  # ensure DejaVu fonts are loaded for ₹ symbol
    from fastapi.responses import StreamingResponse
    from io import BytesIO
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import inch
    from reportlab.lib import colors
    from reportlab.pdfgen import canvas
    from reportlab.platypus import Table, TableStyle
    from app.models.school import School as SchoolModel

    school = db.query(SchoolModel).filter(SchoolModel.id == school_id).first()
    school_name = school.name if school else "School"
    school_address = getattr(school, 'address', '') or ''

    from sqlalchemy.orm import selectinload
    payments = db.query(PaymentModel).options(
        joinedload(PaymentModel.fund),
        joinedload(PaymentModel.student).joinedload(Student.class_),
        joinedload(PaymentModel.student).selectinload(Student.parents).joinedload(ParentStudentRelation.parent),
    ).filter(
        PaymentModel.payment_date == collection_date,
        PaymentModel.school_id == school_id
    ).order_by(PaymentModel.created_at).all()

    total_amount = sum(float(p.amount_paid) for p in payments)

    # Group by fund
    by_fund: dict = {}
    for p in payments:
        fname = p.fund.name if p.fund else 'Unknown'
        if fname not in by_fund:
            by_fund[fname] = {'amount': 0.0, 'count': 0}
        by_fund[fname]['amount'] += float(p.amount_paid)
        by_fund[fname]['count'] += 1

    # Group by mode
    by_mode: dict = {}
    for p in payments:
        mode = p.payment_mode or 'Unknown'
        by_mode[mode] = by_mode.get(mode, 0.0) + float(p.amount_paid)

    # Build PDF
    buffer = BytesIO()
    W, H = A4
    pdf = canvas.Canvas(buffer, pagesize=A4)
    margin = 0.65 * inch

    # Header
    y = H - margin
    pdf.setFont(_FNT_B, 18)
    pdf.drawCentredString(W / 2, y, school_name)
    if school_address:
        pdf.setFont(_FNT_N, 10)
        y -= 0.22 * inch
        pdf.drawCentredString(W / 2, y, school_address)
    y -= 0.2 * inch
    pdf.line(margin, y, W - margin, y)

    y -= 0.3 * inch
    pdf.setFont(_FNT_B, 14)
    pdf.drawCentredString(W / 2, y, "Daily Collection Report")

    y -= 0.22 * inch
    pdf.setFont(_FNT_N, 11)
    pdf.drawCentredString(W / 2, y, f"Date: {collection_date.strftime('%d %B %Y')}")

    y -= 0.3 * inch
    pdf.line(margin, y, W - margin, y)

    # Summary boxes
    y -= 0.45 * inch
    box_w = (W - 2 * margin - 0.2 * inch) / 2
    for i, (label, value) in enumerate([
        ("Total Collection", f"{_RUPEE}{total_amount:,.2f}"),
        ("Total Payments", str(len(payments))),
    ]):
        bx = margin + i * (box_w + 0.2 * inch)
        pdf.setFillColorRGB(0.94, 0.97, 1)
        pdf.setStrokeColorRGB(0.31, 0.27, 0.9)
        pdf.rect(bx, y - 0.55 * inch, box_w, 0.6 * inch, fill=1, stroke=1)
        pdf.setFillColorRGB(0, 0, 0)
        pdf.setFont(_FNT_N, 9)
        pdf.drawString(bx + 0.12 * inch, y - 0.22 * inch, label)
        pdf.setFont(_FNT_B, 14)
        pdf.drawString(bx + 0.12 * inch, y - 0.47 * inch, value)

    y -= 0.85 * inch

    def draw_table(title, data, col_names, col_widths, header_fs=10, body_fs=9):
        nonlocal y
        pdf.setFont(_FNT_B, 11)
        pdf.drawString(margin, y, title)
        y -= 0.22 * inch
        table = Table([col_names] + data, colWidths=col_widths)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4f46e5')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), _FNT_B),
            ('FONTSIZE', (0, 0), (-1, 0), header_fs),
            ('FONTNAME', (0, 1), (-1, -1), _FNT_N),
            ('FONTSIZE', (0, 1), (-1, -1), body_fs),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('ALIGN', (1, 1), (-1, -1), 'RIGHT'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5ff')]),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        table.wrapOn(pdf, sum(col_widths), 400)
        th = table.wrapOn(pdf, sum(col_widths), 400)[1]
        table.drawOn(pdf, margin, y - th)
        y -= th + 0.3 * inch

    # By Fund table
    fund_rows = [[name, f"{_RUPEE}{d['amount']:,.2f}", str(d['count'])]
                 for name, d in by_fund.items()]
    fund_col_w = [W - 2 * margin - 2.8 * inch, 1.6 * inch, 1.2 * inch]
    draw_table("Collection by Fund", fund_rows, ["Fund", "Amount", "Payments"], fund_col_w)

    # By Mode table
    mode_rows = [[mode, f"{_RUPEE}{amt:,.2f}"] for mode, amt in by_mode.items()]
    mode_col_w = [W - 2 * margin - 1.6 * inch, 1.6 * inch]
    draw_table("Collection by Payment Mode", mode_rows, ["Payment Mode", "Amount"], mode_col_w)

    # Individual payments table
    if payments:
        pay_rows = []
        for i, p in enumerate(payments, 1):
            s = p.student
            student_name = f"{s.first_name} {s.last_name}" if s else "N/A"
            adm_no = s.admission_number if s else "-"
            roll_no = (s.roll_number or "-") if s else "-"
            cls = s.class_ if s else None
            class_sec = f"{cls.name} {cls.section}" if cls else "-"
            # get father name from primary parent or first parent
            father_name = "-"
            if s and s.parents:
                rel = next((r for r in s.parents if r.primary_contact), s.parents[0]) if s.parents else None
                if rel and rel.parent:
                    father_name = rel.parent.father_name or "-"
            pay_rows.append([
                str(i),
                p.receipt_number or "-",
                adm_no,
                student_name,
                father_name,
                class_sec,
                roll_no,
                p.payment_mode or "-",
                f"{_RUPEE}{float(p.amount_paid):,.2f}",
            ])
        usable = W - 2 * margin
        pay_col_w = [
            usable * 0.04,   # #
            usable * 0.11,   # Receipt No.
            usable * 0.09,   # Adm. No.
            usable * 0.18,   # Student Name
            usable * 0.16,   # Father Name
            usable * 0.11,   # Class/Sec
            usable * 0.07,   # Roll No.
            usable * 0.12,   # Mode
            usable * 0.12,   # Amount
        ]
        draw_table("Payment Details", pay_rows,
                   ["#", "Receipt No.", "Adm. No.", "Student Name", "Father Name", "Class/Sec", "Roll No.", "Mode", "Amount"],
                   pay_col_w, header_fs=8, body_fs=7.5)

    # Footer
    pdf.setFont(_FNT_I, 8)
    pdf.setFillColorRGB(0.5, 0.5, 0.5)
    pdf.drawCentredString(W / 2, margin * 0.6,
                          f"Generated on {datetime.now().strftime('%d %B %Y %I:%M %p')}")

    pdf.save()
    buffer.seek(0)
    filename = f"daily_collection_{collection_date.strftime('%Y%m%d')}.pdf"
    return StreamingResponse(buffer, media_type="application/pdf",
                             headers={"Content-Disposition": f"attachment; filename={filename}"})


@router.get("/finance/installment-status", response_model=InstallmentStatusSummary, dependencies=[Depends(is_admin)])
def get_installment_status(
    academic_year: str = Query(..., description="Academic year (e.g., 2024-25)"),
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Get summary of installment status for an academic year."""
    as_of_date = date.today()

    # Get all fee structures for the academic year
    fee_structures = db.query(StudentFeeStructureModel).join(
        Student, StudentFeeStructureModel.student_id == Student.id
    ).filter(
        Student.school_id == school_id,
        StudentFeeStructureModel.academic_year == academic_year
    ).all()

    # Get all installments for these fee structures
    fee_structure_ids = [fs.id for fs in fee_structures]
    installments = db.query(FeeInstallmentModel).filter(
        FeeInstallmentModel.student_fee_structure_id.in_(fee_structure_ids)
    ).all()

    total_installments = len(installments)
    paid_count = sum(1 for inst in installments if inst.status == 'paid')
    partially_paid_count = sum(1 for inst in installments if inst.status == 'partial')
    pending_count = sum(1 for inst in installments if inst.status == 'pending')
    overdue_count = sum(1 for inst in installments if inst.status in ['pending', 'partial'] and inst.due_date < as_of_date)

    total_expected = sum(Decimal(str(fs.final_amount)) for fs in fee_structures)
    total_collected = sum(Decimal(str(fs.amount_paid)) for fs in fee_structures)
    total_outstanding = sum(Decimal(str(fs.outstanding_amount)) for fs in fee_structures)

    return InstallmentStatusSummary(
        academic_year=academic_year,
        total_installments=total_installments,
        paid_count=paid_count,
        partially_paid_count=partially_paid_count,
        pending_count=pending_count,
        overdue_count=overdue_count,
        total_expected=float(total_expected),
        total_collected=float(total_collected),
        total_outstanding=float(total_outstanding)
    )


@router.get("/finance/daily-expenditure", response_model=DailyExpenditure, dependencies=[Depends(is_admin)])
def get_daily_expenditure(
    expenditure_date: date = Query(..., description="Date for expenditure report"),
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Get expenditure summary for a specific date (salaries paid on that date)."""
    # Get all salaries paid on the specified date
    salaries = db.query(SalaryModel).options(
        joinedload(SalaryModel.teacher).joinedload(TeacherModel.user)
    ).filter(
        SalaryModel.payment_date == expenditure_date,
        SalaryModel.school_id == school_id
    ).all()

    # Also get general expenditures for this date
    general_expenses = db.query(ExpenditureModel).filter(
        ExpenditureModel.date == expenditure_date,
        ExpenditureModel.school_id == school_id
    ).all()

    salary_total = sum(Decimal(str(s.net_salary or 0)) for s in salaries)
    expense_total = sum(Decimal(str(e.amount or 0)) for e in general_expenses)
    total_amount = salary_total + expense_total
    total_payments = len(salaries) + len(general_expenses)

    # Group by payment mode (salaries + expenses combined)
    by_mode: dict = {}
    for salary in salaries:
        mode = salary.payment_mode or 'Unknown'
        by_mode[mode] = by_mode.get(mode, 0) + float(salary.net_salary or 0)
    for expense in general_expenses:
        mode = expense.payment_mode or 'Unknown'
        by_mode[mode] = by_mode.get(mode, 0) + float(expense.amount or 0)

    # Group expenses by category
    by_category: dict = {}
    for expense in general_expenses:
        cat = expense.category or 'Miscellaneous'
        by_category[cat] = by_category.get(cat, 0) + float(expense.amount or 0)

    # Create salary details list
    salary_details = []
    for salary in salaries:
        teacher = salary.teacher
        teacher_name = teacher.user.full_name if teacher and teacher.user else "Unknown"
        employee_id = teacher.employee_id if teacher else None
        salary_details.append(DailyExpenditureItem(
            teacher_name=teacher_name,
            employee_id=employee_id,
            amount=float(salary.net_salary or 0),
            payment_mode=salary.payment_mode or 'Unknown',
            month=salary.month or 'N/A'
        ))

    expense_details = [
        GeneralExpenditureItem(
            id=str(e.id),
            category=e.category,
            description=e.description,
            amount=float(e.amount),
            payment_mode=e.payment_mode or 'Cash',
            notes=e.notes
        )
        for e in general_expenses
    ]

    return DailyExpenditure(
        date=expenditure_date,
        total_amount=float(total_amount),
        total_payments=total_payments,
        salaries=salary_details,
        expenses=expense_details,
        by_mode=by_mode,
        by_category=by_category
    )


# ===== Annual Report =====

def _calc_grade(pct: float) -> str:
    if pct >= 90: return "A+"
    if pct >= 80: return "A"
    if pct >= 70: return "B+"
    if pct >= 60: return "B"
    if pct >= 50: return "C"
    if pct >= 40: return "D"
    return "F"


@router.get("/annual-report/student/{student_id}", dependencies=[Depends(is_admin)])
def get_student_annual_report(
    student_id: uuid.UUID,
    academic_year: str = Query(...),
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Get annual report data for a student (all exams + full-year attendance)."""
    from app.models.exam_series import (
        ExamSeries as ExamSeriesModel,
        ExamTimetable as ExamTimetableModel,
        ExamScheduleItem as ExamScheduleItemModel,
        StudentExamMarks as StudentExamMarksModel,
    )
    from app.models.parent import ParentStudentRelation as PSR, Parent as ParentModel
    from sqlalchemy.orm import selectinload as _sl

    student = tenant_aware_query(db, Student, school_id).options(
        _sl(Student.class_)
    ).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Get all exam series for the academic year
    exam_series_list = tenant_aware_query(db, ExamSeriesModel, school_id).filter(
        ExamSeriesModel.academic_year == academic_year
    ).order_by(ExamSeriesModel.start_date).all()

    exams_data = []
    for es in exam_series_list:
        timetable = db.query(ExamTimetableModel).filter(
            ExamTimetableModel.exam_series_id == es.id,
            ExamTimetableModel.class_id == student.class_id
        ).first()
        if not timetable:
            continue
        schedule_items = db.query(ExamScheduleItemModel).options(
            _sl(ExamScheduleItemModel.subject)
        ).filter(ExamScheduleItemModel.exam_timetable_id == timetable.id).all()
        if not schedule_items:
            continue
        marks = db.query(StudentExamMarksModel).filter(
            StudentExamMarksModel.student_id == student_id,
            StudentExamMarksModel.exam_schedule_item_id.in_([i.id for i in schedule_items])
        ).all()
        total_obtained = 0.0
        total_max = 0.0
        for item in schedule_items:
            total_max += float(item.max_marks)
            m = next((x for x in marks if x.exam_schedule_item_id == item.id), None)
            if m and not m.is_absent and m.marks_obtained:
                total_obtained += float(m.marks_obtained)
        pct = (total_obtained / total_max * 100) if total_max > 0 else 0
        exams_data.append({
            "exam_name": es.name,
            "exam_type": es.exam_type,
            "total_obtained": round(total_obtained, 2),
            "total_max": round(total_max, 2),
            "percentage": round(pct, 2),
            "overall_grade": _calc_grade(pct)
        })

    # Monthly attendance for the academic year
    try:
        start_yr = int(academic_year.split("-")[0])
        acad_start = date(start_yr, 4, 1)
        acad_end = date(start_yr + 1, 3, 31)
    except Exception:
        acad_start = date.today().replace(month=4, day=1)
        acad_end = date.today()

    att_records = db.query(Attendance).filter(
        Attendance.student_id == student_id,
        Attendance.date >= acad_start,
        Attendance.date <= acad_end
    ).all()

    # Class working days per month
    class_att = db.query(Attendance).filter(
        Attendance.class_id == student.class_id,
        Attendance.date >= acad_start,
        Attendance.date <= acad_end
    ).all()

    from collections import defaultdict
    working_by_month = defaultdict(set)
    for r in class_att:
        working_by_month[r.date.strftime("%Y-%m")].add(r.date)

    present_by_month = defaultdict(int)
    for r in att_records:
        if r.status in ("P", "L", "HL"):
            present_by_month[r.date.strftime("%Y-%m")] += 1

    import calendar
    monthly_attendance = []
    cur = acad_start.replace(day=1)
    while cur <= acad_end:
        key = cur.strftime("%Y-%m")
        wd = len(working_by_month.get(key, set()))
        pd = present_by_month.get(key, 0)
        pct = (pd / wd * 100) if wd > 0 else 0
        if wd > 0:
            monthly_attendance.append({
                "month_name": cur.strftime("%B %Y"),
                "working_days": wd,
                "present_days": pd,
                "percentage": round(pct, 1)
            })
        # Advance month
        if cur.month == 12:
            cur = cur.replace(year=cur.year + 1, month=1)
        else:
            cur = cur.replace(month=cur.month + 1)

    annual_wd = sum(len(v) for v in working_by_month.values())
    annual_pd = sum(present_by_month.values())
    annual_pct = (annual_pd / annual_wd * 100) if annual_wd > 0 else 0

    # Father name
    father_name = None
    p_rel = db.query(PSR).options(joinedload(PSR.parent)).filter(
        PSR.student_id == student_id
    ).first()
    if p_rel and p_rel.parent:
        father_name = p_rel.parent.father_name

    return {
        "student_id": str(student_id),
        "student_name": f"{student.first_name} {student.last_name}",
        "admission_number": student.admission_number,
        "roll_number": student.roll_number,
        "class_name": student.class_.name if student.class_ else "-",
        "section": getattr(student.class_, "section", None),
        "date_of_birth": str(student.date_of_birth) if student.date_of_birth else None,
        "father_name": father_name,
        "academic_year": academic_year,
        "exams": exams_data,
        "monthly_attendance": monthly_attendance,
        "annual_working_days": annual_wd,
        "annual_present_days": annual_pd,
        "annual_attendance_percentage": round(annual_pct, 1),
    }


@router.get("/annual-report/student/{student_id}/download", dependencies=[Depends(is_admin)])
def download_student_annual_report(
    student_id: uuid.UUID,
    academic_year: str = Query(...),
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Download annual report PDF for a student."""
    from fastapi.responses import StreamingResponse as _SR
    from app.models.school import School as SchoolModel
    from app.services.report_card_service import ReportCardService

    data = get_student_annual_report(student_id, academic_year, db, school_id)

    school = db.query(SchoolModel).filter(
        SchoolModel.id == uuid.UUID(school_id) if not isinstance(school_id, uuid.UUID) else school_id
    ).first()
    school_name = school.name if school else "School"
    rc_print_settings = (school.settings or {}).get('print', {}).get('report_card', {}) if school else {}

    dob = None
    if data.get("date_of_birth"):
        try:
            from datetime import date as _date
            dob = _date.fromisoformat(data["date_of_birth"])
        except Exception:
            pass

    try:
        pdf_buffer = ReportCardService.generate_annual_report(
            student_name=data["student_name"],
            admission_number=data["admission_number"],
            class_name=data["class_name"],
            section=data.get("section"),
            father_name=data.get("father_name"),
            date_of_birth=dob,
            roll_number=data.get("roll_number"),
            academic_year=academic_year,
            exams_data=data["exams"],
            monthly_attendance=data["monthly_attendance"],
            annual_working_days=data["annual_working_days"],
            annual_present_days=data["annual_present_days"],
            annual_attendance_percentage=data["annual_attendance_percentage"],
            school_name=school_name,
            print_settings=rc_print_settings,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")
    return _SR(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=annual_report_{data['admission_number']}_{academic_year}.pdf"}
    )


@router.get("/annual-report/class/{class_id}/download-all", dependencies=[Depends(is_admin)])
def download_class_annual_reports(
    class_id: uuid.UUID,
    academic_year: str = Query(...),
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Download annual reports for all students in a class as merged PDF."""
    from fastapi.responses import StreamingResponse as _SR
    from app.models.school import School as SchoolModel
    from app.services.report_card_service import ReportCardService
    from app.models.student import Student as StudentModel
    from sqlalchemy.orm import selectinload as _sl
    from PyPDF2 import PdfMerger
    from io import BytesIO

    students = tenant_aware_query(db, StudentModel, school_id).options(
        _sl(StudentModel.class_)
    ).filter(StudentModel.class_id == class_id).order_by(StudentModel.admission_number).all()

    if not students:
        raise HTTPException(status_code=404, detail="No students found in this class")

    school = db.query(SchoolModel).filter(SchoolModel.id == uuid.UUID(str(school_id))).first()
    school_name = school.name if school else "School"
    rc_print_settings = (school.settings or {}).get('print', {}).get('report_card', {}) if school else {}
    class_obj = students[0].class_ if students else None
    class_name = class_obj.name if class_obj else "class"
    section = getattr(class_obj, "section", None)

    merger = PdfMerger()
    generated_count = 0
    last_error = None
    for student in students:
        try:
            data = get_student_annual_report(student.id, academic_year, db, school_id)
            dob = None
            if data.get("date_of_birth"):
                try:
                    from datetime import date as _date
                    dob = _date.fromisoformat(data["date_of_birth"])
                except Exception:
                    pass
            buf = ReportCardService.generate_annual_report(
                student_name=data["student_name"],
                admission_number=data["admission_number"],
                class_name=class_name,
                section=section,
                father_name=data.get("father_name"),
                date_of_birth=dob,
                roll_number=data.get("roll_number"),
                academic_year=academic_year,
                exams_data=data["exams"],
                monthly_attendance=data["monthly_attendance"],
                annual_working_days=data["annual_working_days"],
                annual_present_days=data["annual_present_days"],
                annual_attendance_percentage=data["annual_attendance_percentage"],
                school_name=school_name,
                print_settings=rc_print_settings,
            )
            merger.append(buf)
            generated_count += 1
        except Exception as e:
            last_error = str(e)
            continue

    if generated_count == 0:
        detail = f"No annual reports could be generated. Last error: {last_error}" if last_error else "No annual reports could be generated"
        raise HTTPException(status_code=500, detail=detail)

    merged_buffer = BytesIO()
    merger.write(merged_buffer)
    merger.close()
    merged_buffer.seek(0)
    return _SR(
        merged_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=annual_reports_{class_name}_{academic_year}.pdf"}
    )