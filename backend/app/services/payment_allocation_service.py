"""
Payment Allocation Service

Manages allocation of payments to specific fees with validation and ledger updates.
Ensures payment integrity and maintains accurate outstanding balances.
"""

from sqlalchemy.orm import Session
from decimal import Decimal
from typing import List, Dict
import uuid
from app.models.finance import (
    Payment as PaymentModel,
    PaymentDetail as PaymentDetailModel,
    StudentFeeStructure as StudentFeeStructureModel,
    FeeInstallment as FeeInstallmentModel
)
from app.models.transport import StudentRouteFeeStructure as StudentRouteFeeStructureModel
from app.models.hostel import StudentHostelFeeStructure as StudentHostelFeeStructureModel


class PaymentAllocationService:
    """Service for allocating payments to fees with strict validation"""

    @staticmethod
    def allocate_payment(
        db: Session,
        payment: PaymentModel,
        allocations: List[Dict]
    ) -> List[PaymentDetailModel]:
        """
        Allocate a payment across multiple fees.

        Args:
            db: Database session
            payment: Payment model instance
            allocations: List of allocation dicts with keys:
                - fee_id: UUID
                - student_fee_structure_id: UUID
                - amount: Decimal
                - route_fee_id: Optional[UUID]
                - student_route_fee_structure_id: Optional[UUID]

        Returns:
            List of created PaymentDetail records

        Raises:
            ValueError: If allocation validation fails
        """
        # Validate total allocation matches payment amount
        total_allocated = sum(Decimal(str(alloc['amount'])) for alloc in allocations)
        payment_amount = Decimal(str(payment.amount_paid))

        if total_allocated != payment_amount:
            raise ValueError(
                f"Allocation sum ({total_allocated}) must equal payment amount ({payment_amount})"
            )

        # Validate individual allocations
        payment_details = []
        for alloc in allocations:
            amount = Decimal(str(alloc['amount']))

            # Validate amount is positive
            if amount <= 0:
                raise ValueError("Allocation amount must be positive")

            # Try regular class fee structure first
            fee_structure = db.query(StudentFeeStructureModel).filter(
                StudentFeeStructureModel.id == alloc['student_fee_structure_id']
            ).first()

            if fee_structure:
                # Regular class fee allocation
                if fee_structure.student_id != payment.student_id:
                    raise ValueError(
                        f"Fee structure does not belong to student {payment.student_id}"
                    )
                if amount > fee_structure.outstanding_amount:
                    raise ValueError(
                        f"Allocation amount ({amount}) exceeds outstanding ({fee_structure.outstanding_amount}) "
                        f"for fee structure {fee_structure.id}"
                    )
                fee_structure.amount_paid += amount
                fee_structure.outstanding_amount -= amount

                payment_detail = PaymentDetailModel(
                    id=uuid.uuid4(),
                    payment_id=payment.id,
                    fee_id=alloc['fee_id'],
                    student_fee_structure_id=alloc['student_fee_structure_id'],
                    amount=amount
                )
                db.add(payment_detail)
                payment_details.append(payment_detail)

                PaymentAllocationService._update_installments(db, fee_structure.id, amount)

            else:
                # Try transport/route fee structure
                route_fee_structure = db.query(StudentRouteFeeStructureModel).filter(
                    StudentRouteFeeStructureModel.id == alloc['student_fee_structure_id']
                ).first()

                if route_fee_structure:
                    if route_fee_structure.student_id != payment.student_id:
                        raise ValueError(f"Transport fee structure does not belong to student {payment.student_id}")
                    if amount > route_fee_structure.outstanding_amount:
                        raise ValueError(f"Allocation amount ({amount}) exceeds outstanding ({route_fee_structure.outstanding_amount})")
                    route_fee_structure.amount_paid += amount
                    route_fee_structure.outstanding_amount -= amount
                else:
                    # Try hostel fee structure
                    hostel_fee_structure = db.query(StudentHostelFeeStructureModel).filter(
                        StudentHostelFeeStructureModel.id == alloc['student_fee_structure_id']
                    ).first()
                    if not hostel_fee_structure:
                        raise ValueError(f"Fee structure {alloc['student_fee_structure_id']} not found")
                    if hostel_fee_structure.student_id != payment.student_id:
                        raise ValueError(f"Hostel fee structure does not belong to student {payment.student_id}")
                    if amount > hostel_fee_structure.outstanding_amount:
                        raise ValueError(f"Allocation amount ({amount}) exceeds outstanding ({hostel_fee_structure.outstanding_amount})")
                    hostel_fee_structure.amount_paid += amount
                    hostel_fee_structure.outstanding_amount -= amount

                # Store payment detail for non-class fees
                payment_detail = PaymentDetailModel(
                    id=uuid.uuid4(),
                    payment_id=payment.id,
                    fee_id=None,
                    student_fee_structure_id=None,
                    amount=amount
                )
                db.add(payment_detail)
                payment_details.append(payment_detail)

        db.commit()
        return payment_details

    @staticmethod
    def _update_installments(
        db: Session,
        student_fee_structure_id: uuid.UUID,
        payment_amount: Decimal
    ):
        """
        Update installment records when payment is allocated.

        Allocates payment to installments in order by due date.

        Args:
            db: Database session
            student_fee_structure_id: Fee structure ID
            payment_amount: Amount to allocate to installments
        """
        # Get pending/partial installments ordered by due date
        installments = db.query(FeeInstallmentModel).filter(
            FeeInstallmentModel.student_fee_structure_id == student_fee_structure_id,
            FeeInstallmentModel.status.in_(['pending', 'partial'])
        ).order_by(FeeInstallmentModel.due_date).all()

        remaining_payment = payment_amount

        for installment in installments:
            if remaining_payment <= 0:
                break

            installment_outstanding = installment.amount - installment.paid_amount

            if remaining_payment >= installment_outstanding:
                # Full payment of this installment
                installment.paid_amount = installment.amount
                installment.status = 'paid'
                remaining_payment -= installment_outstanding
            else:
                # Partial payment
                installment.paid_amount += remaining_payment
                installment.status = 'partial'
                remaining_payment = Decimal('0')

        db.commit()

    @staticmethod
    def validate_allocations(
        db: Session,
        student_id: uuid.UUID,
        allocations: List[Dict],
        total_payment: Decimal
    ) -> Dict[str, any]:
        """
        Validate payment allocations before processing.

        Args:
            db: Database session
            student_id: Student ID
            allocations: List of allocation dicts
            total_payment: Total payment amount

        Returns:
            Dict with validation result:
                - valid: bool
                - errors: List[str]
                - warnings: List[str]
        """
        errors = []
        warnings = []

        # Check total payment is positive
        if total_payment <= 0:
            errors.append("Payment amount must be greater than zero")
            return {'valid': False, 'errors': errors, 'warnings': warnings}

        # Check total allocation
        total_allocated = sum(Decimal(str(alloc['amount'])) for alloc in allocations)
        if total_allocated != total_payment:
            errors.append(
                f"Total allocation ({total_allocated}) must equal payment amount ({total_payment})"
            )

        # Check each allocation — handles both regular and transport fee structures
        for i, alloc in enumerate(allocations):
            fee_structure = db.query(StudentFeeStructureModel).filter(
                StudentFeeStructureModel.id == alloc['student_fee_structure_id']
            ).first()

            if not fee_structure:
                # Try transport fee structure
                route_fee_structure = db.query(StudentRouteFeeStructureModel).filter(
                    StudentRouteFeeStructureModel.id == alloc['student_fee_structure_id']
                ).first()
                if route_fee_structure:
                    amount = Decimal(str(alloc['amount']))
                    if amount <= 0:
                        errors.append(f"Allocation {i+1}: Amount must be positive")
                    if route_fee_structure.student_id != student_id:
                        errors.append(f"Allocation {i+1}: Transport fee does not belong to this student")
                    if amount > route_fee_structure.outstanding_amount:
                        errors.append(f"Allocation {i+1}: Amount exceeds outstanding transport fee balance")
                else:
                    errors.append(f"Allocation {i+1}: Fee structure not found")
                continue

            if fee_structure.student_id != student_id:
                errors.append(f"Allocation {i+1}: Fee does not belong to this student")

            amount = Decimal(str(alloc['amount']))
            if amount <= 0:
                errors.append(f"Allocation {i+1}: Amount must be positive")

            if amount > fee_structure.outstanding_amount:
                errors.append(
                    f"Allocation {i+1}: Amount ({amount}) exceeds outstanding "
                    f"({fee_structure.outstanding_amount})"
                )

            # Warning if partial payment
            if amount < fee_structure.outstanding_amount:
                warnings.append(
                    f"Allocation {i+1}: Partial payment - "
                    f"₹{fee_structure.outstanding_amount - amount} will remain outstanding"
                )

        return {
            'valid': len(errors) == 0,
            'errors': errors,
            'warnings': warnings
        }
