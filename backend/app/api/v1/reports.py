from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, or_
from app.core.database import get_db
from app.core.permissions import is_admin
from app.core.utils import tenant_aware_query
from app.api.deps import get_current_user_school
from app.models.attendance import Attendance
from app.models.grade import Grade
from app.models.finance import Payment as PaymentModel, Fund as FundModel, StudentFeeStructure as StudentFeeStructureModel, FeeInstallment as FeeInstallmentModel, Fee as FeeModel, PaymentDetail as PaymentDetailModel, Salary as SalaryModel, ClassFee as ClassFeeModel
from app.models.student import Student
from app.models.user import User
from app.models.class_model import Class as ClassModel
from app.models.teacher import Teacher as TeacherModel
from app.schemas.report_schema import (
    CollectionSummary, CollectionSummaryItem,
    DefaultersReport, DefaulterStudent,
    FundWiseCollection, FundCollectionDetail,
    ClassWiseCollection, ClassCollectionSummary,
    DailyCollection, DailyCollectionItem,
    InstallmentStatusSummary,
    DailyExpenditure, DailyExpenditureItem
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
    # Placeholder for more complex report logic
    return tenant_aware_query(db, Attendance, school_id).all()

@router.get("/grades", dependencies=[Depends(is_admin)])
def get_grades_report(db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    # Placeholder for more complex report logic
    return tenant_aware_query(db, Grade, school_id).all()

@router.get("/financial", dependencies=[Depends(is_admin)])
def get_financial_report(db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    # Placeholder for more complex report logic
    return tenant_aware_query(db, PaymentModel, school_id).all()

@router.get("/students", dependencies=[Depends(is_admin)])
def get_student_report(db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    # Placeholder for more complex report logic
    return tenant_aware_query(db, Student, school_id).all()


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
        ClassModel.name
    ).all()

    # If including transport fees, also query transport outstanding
    students_with_transport = {}
    if include_transport_fees:
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
        overdue_installments = db.query(FeeInstallmentModel).join(
            StudentFeeStructureModel, FeeInstallmentModel.student_fee_structure_id == StudentFeeStructureModel.id
        ).filter(
            StudentFeeStructureModel.student_id == student_data.id,
            StudentFeeStructureModel.academic_year == academic_year,
            FeeInstallmentModel.due_date < as_of_date,
            FeeInstallmentModel.status.in_(['pending', 'partial'])
        ).all()

        overdue_count = len(overdue_installments)
        oldest_due_date = min([inst.due_date for inst in overdue_installments]) if overdue_installments else None

        # Skip if include_overdue_only is True and no overdue installments
        if include_overdue_only and overdue_count == 0:
            continue

        # Get parent contact information
        from app.models.parent import Parent as ParentModel, ParentStudentRelation as ParentStudentRelationModel
        parent_relation = db.query(ParentStudentRelationModel).join(
            ParentModel, ParentStudentRelationModel.parent_id == ParentModel.id
        ).filter(
            ParentStudentRelationModel.student_id == student_data.id
        ).first()

        contact_phone = None
        parent_phone = None
        if parent_relation and parent_relation.parent:
            contact_phone = parent_relation.parent.father_phone
            parent_phone = parent_relation.parent.mother_phone or parent_relation.parent.father_phone

        student_name = f"{student_data.first_name} {student_data.last_name}"
        outstanding = Decimal(str(total_outstanding))

        defaulters.append(DefaulterStudent(
            student_id=str(student_data.id),
            admission_number=student_data.admission_number,
            student_name=student_name,
            class_name=student_data.class_name,
            total_fees=student_info.get('total_fees', 0),
            total_paid=student_info.get('total_paid', 0),
            total_outstanding=float(outstanding),
            overdue_installments=overdue_count,
            oldest_due_date=oldest_due_date,
            contact_phone=contact_phone,
            parent_phone=parent_phone
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

    total_amount = sum(Decimal(str(s.net_salary or 0)) for s in salaries)
    total_payments = len(salaries)

    # Group by payment mode
    by_mode = {}
    for salary in salaries:
        mode = salary.payment_mode or 'Unknown'
        if mode not in by_mode:
            by_mode[mode] = 0
        by_mode[mode] += float(salary.net_salary or 0)

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

    return DailyExpenditure(
        date=expenditure_date,
        total_amount=float(total_amount),
        total_payments=total_payments,
        salaries=salary_details,
        by_mode=by_mode
    )