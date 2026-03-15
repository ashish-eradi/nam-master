"""
Installment Scheduling Service

Generates installment schedules based on installment type (monthly, quarterly, etc.)
and manages installment due dates.
"""

from sqlalchemy.orm import Session
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
from decimal import Decimal
from typing import List
import uuid
from app.models.finance import FeeInstallment as FeeInstallmentModel


class InstallmentService:
    """Service for creating and managing fee installment schedules"""

    @staticmethod
    def create_installments(
        db: Session,
        student_fee_structure_id: uuid.UUID,
        installment_type: str,
        start_date: date,
        total_amount: Decimal
    ) -> List[FeeInstallmentModel]:
        """
        Generate installment schedule based on type.

        Args:
            db: Database session
            student_fee_structure_id: Student fee structure ID
            installment_type: Type of installment (monthly, quarterly, half_yearly, yearly)
            start_date: Start date for installments
            total_amount: Total fee amount to split

        Returns:
            List of created FeeInstallment records

        Raises:
            ValueError: If invalid installment type
        """
        installment_configs = {
            'monthly': {'count': 12, 'months_gap': 1},
            'quarterly': {'count': 4, 'months_gap': 3},
            'half_yearly': {'count': 2, 'months_gap': 6},
            'yearly': {'count': 1, 'months_gap': 12}
        }

        if installment_type not in installment_configs:
            raise ValueError(
                f"Invalid installment type: {installment_type}. "
                f"Must be one of: {', '.join(installment_configs.keys())}"
            )

        config = installment_configs[installment_type]
        count = config['count']
        months_gap = config['months_gap']

        # Calculate installment amount
        installment_amount = total_amount / Decimal(count)

        # Handle rounding - last installment gets the difference
        rounded_amount = installment_amount.quantize(Decimal('0.01'))
        last_installment_amount = total_amount - (rounded_amount * (count - 1))

        installments = []
        current_date = start_date

        for i in range(count):
            # Calculate due date (10th of the month)
            due_date = current_date.replace(day=10)

            # Determine amount for this installment
            amount = last_installment_amount if i == count - 1 else rounded_amount

            installment = FeeInstallmentModel(
                id=uuid.uuid4(),
                student_fee_structure_id=student_fee_structure_id,
                installment_number=i + 1,
                due_date=due_date,
                amount=amount,
                paid_amount=Decimal('0'),
                status='pending'
            )

            db.add(installment)
            installments.append(installment)

            # Move to next installment date
            current_date += relativedelta(months=months_gap)

        db.commit()
        return installments

    @staticmethod
    def update_installment_status(db: Session, installment_id: uuid.UUID):
        """
        Update installment status based on payment and due date.

        Statuses:
        - paid: Fully paid
        - partial: Partially paid
        - pending: Not paid, not overdue
        - overdue: Not paid, past due date

        Args:
            db: Database session
            installment_id: Installment ID
        """
        installment = db.query(FeeInstallmentModel).filter(
            FeeInstallmentModel.id == installment_id
        ).first()

        if not installment:
            return

        if installment.paid_amount >= installment.amount:
            installment.status = 'paid'
        elif installment.paid_amount > 0:
            installment.status = 'partial'
        elif date.today() > installment.due_date:
            installment.status = 'overdue'
        else:
            installment.status = 'pending'

        db.commit()

    @staticmethod
    def get_overdue_installments(
        db: Session,
        student_id: uuid.UUID = None,
        school_id: uuid.UUID = None
    ) -> List[FeeInstallmentModel]:
        """
        Get all overdue installments for a student or school.

        Args:
            db: Database session
            student_id: Optional student ID filter
            school_id: Optional school ID filter

        Returns:
            List of overdue installments
        """
        from app.models.finance import StudentFeeStructure as StudentFeeStructureModel

        query = db.query(FeeInstallmentModel).join(
            StudentFeeStructureModel,
            FeeInstallmentModel.student_fee_structure_id == StudentFeeStructureModel.id
        ).filter(
            FeeInstallmentModel.due_date < date.today(),
            FeeInstallmentModel.status.in_(['pending', 'partial'])
        )

        if student_id:
            query = query.filter(StudentFeeStructureModel.student_id == student_id)

        if school_id:
            from app.models.student import Student as StudentModel
            query = query.join(
                StudentModel,
                StudentFeeStructureModel.student_id == StudentModel.id
            ).filter(StudentModel.school_id == school_id)

        return query.all()

    @staticmethod
    def calculate_days_overdue(due_date: date) -> int:
        """
        Calculate number of days an installment is overdue.

        Args:
            due_date: Due date of installment

        Returns:
            Number of days overdue (0 if not overdue)
        """
        if date.today() <= due_date:
            return 0

        delta = date.today() - due_date
        return delta.days
