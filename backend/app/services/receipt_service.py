"""
Receipt Number Generation Service

Generates sequential receipt numbers with fund prefix to ensure uniqueness and audit compliance.
Format: {PREFIX}-{YEAR}-{SEQUENCE}
Example: TF-2025-00001
"""

from sqlalchemy.orm import Session
from datetime import datetime
import uuid
from app.models.finance import Fund as FundModel


class ReceiptNumberService:
    """Service for generating sequential receipt numbers with concurrency safety"""

    @staticmethod
    def generate_receipt_number(db: Session, fund_id: uuid.UUID) -> str:
        """
        Generate a sequential receipt number for a payment.

        Uses SELECT FOR UPDATE row-level locking to prevent duplicate receipt numbers
        under concurrent payment processing.

        Args:
            db: Database session
            fund_id: UUID of the fund for which receipt is being generated

        Returns:
            Formatted receipt number (e.g., "TF-2025-00001")

        Raises:
            ValueError: If fund not found
        """
        # Get fund with row-level lock to prevent concurrent updates
        fund = db.query(FundModel).filter(
            FundModel.id == fund_id
        ).with_for_update().first()

        if not fund:
            raise ValueError(f"Fund with ID {fund_id} not found")

        # Get current receipt number and increment
        receipt_sequence = fund.current_receipt_number
        fund.current_receipt_number += 1

        # Commit the increment immediately to release the lock
        db.commit()
        db.refresh(fund)

        # Format receipt number
        prefix = fund.receipt_series_prefix or "RCP"
        year = datetime.now().year
        formatted_number = f"{prefix}-{year}-{receipt_sequence:05d}"

        return formatted_number

    @staticmethod
    def validate_receipt_number(receipt_number: str) -> bool:
        """
        Validate receipt number format.

        Args:
            receipt_number: Receipt number to validate

        Returns:
            True if valid format, False otherwise
        """
        try:
            parts = receipt_number.split('-')
            return (
                len(parts) == 3 and
                len(parts[0]) > 0 and  # Prefix
                parts[1].isdigit() and len(parts[1]) == 4 and  # Year
                parts[2].isdigit() and len(parts[2]) == 5  # Sequence
            )
        except Exception:
            return False
