"""add_fee_applicability_to_class_fees

Revision ID: d71e1964f876
Revises: d7e91682588d
Create Date: 2025-11-27 12:22:13.014672

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'd71e1964f876'
down_revision = 'd7e91682588d'
branch_labels = None
depends_on = None


def upgrade():
    # Create the enum type for fee_applicability
    fee_applicability_enum = postgresql.ENUM('All', 'Hostellers', 'Day Scholars', name='feeapplicability')
    fee_applicability_enum.create(op.get_bind(), checkfirst=True)

    # Create the enum type for installment_type if not exists
    installment_type_enum = postgresql.ENUM('Monthly', 'Quarterly', 'Half Yearly', 'Annually', name='installmenttype')
    installment_type_enum.create(op.get_bind(), checkfirst=True)

    # Add fee_applicability column to class_fees table
    op.add_column('class_fees', sa.Column('fee_applicability', sa.Enum('All', 'Hostellers', 'Day Scholars', name='feeapplicability'), nullable=False, server_default='All'))

    # Update any NULL values in installment_type to 'Annually' before converting
    op.execute("UPDATE class_fees SET installment_type = 'Annually' WHERE installment_type IS NULL OR installment_type = ''")

    # Alter installment_type column to use enum (if it was previously a string)
    op.execute("ALTER TABLE class_fees ALTER COLUMN installment_type TYPE installmenttype USING COALESCE(installment_type, 'Annually')::installmenttype")

    # Set default value
    op.execute("ALTER TABLE class_fees ALTER COLUMN installment_type SET DEFAULT 'Annually'::installmenttype")

    # Now make it not nullable
    op.execute("ALTER TABLE class_fees ALTER COLUMN installment_type SET NOT NULL")


def downgrade():
    # Remove fee_applicability column
    op.drop_column('class_fees', 'fee_applicability')

    # Convert installment_type back to string
    op.execute("ALTER TABLE class_fees ALTER COLUMN installment_type TYPE VARCHAR(20) USING installment_type::text")

    # Drop the enum types
    op.execute("DROP TYPE IF EXISTS feeapplicability")
    op.execute("DROP TYPE IF EXISTS installmenttype")
