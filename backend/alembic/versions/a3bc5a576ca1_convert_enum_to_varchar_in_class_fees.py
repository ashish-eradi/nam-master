"""convert_enum_to_varchar_in_class_fees

Revision ID: a3bc5a576ca1
Revises: d71e1964f876
Create Date: 2025-11-27 13:03:11.493808

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a3bc5a576ca1'
down_revision = 'd71e1964f876'
branch_labels = None
depends_on = None


def upgrade():
    # Convert installment_type from ENUM to VARCHAR
    # First, cast the column to text, then to VARCHAR
    op.execute("ALTER TABLE class_fees ALTER COLUMN installment_type TYPE VARCHAR(20) USING installment_type::text")

    # Convert fee_applicability from ENUM to VARCHAR
    op.execute("ALTER TABLE class_fees ALTER COLUMN fee_applicability TYPE VARCHAR(20) USING fee_applicability::text")


def downgrade():
    # Recreate the ENUM types if needed
    op.execute("CREATE TYPE installmenttype AS ENUM ('Monthly', 'Quarterly', 'Half Yearly', 'Annually')")
    op.execute("CREATE TYPE feeapplicability AS ENUM ('All', 'Hostellers', 'Day Scholars')")

    # Convert back to ENUM
    op.execute("ALTER TABLE class_fees ALTER COLUMN installment_type TYPE installmenttype USING installment_type::installmenttype")
    op.execute("ALTER TABLE class_fees ALTER COLUMN fee_applicability TYPE feeapplicability USING fee_applicability::feeapplicability")
