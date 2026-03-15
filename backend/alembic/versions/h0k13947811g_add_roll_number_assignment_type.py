"""add roll number assignment type

Revision ID: h0k13947811g
Revises: g9j02836700f
Create Date: 2025-12-03 00:51:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'h0k13947811g'
down_revision = 'g9j02836700f'
branch_labels = None
depends_on = None


def upgrade():
    # Create enum type
    rollnumberassignmenttype = postgresql.ENUM('AUTO_BOYS', 'AUTO_GIRLS', 'AUTO_NORMAL', 'MANUAL', name='rollnumberassignmenttype')
    rollnumberassignmenttype.create(op.get_bind())

    # Add column with default value
    op.add_column('students', sa.Column('roll_number_assignment_type',
                                        sa.Enum('AUTO_BOYS', 'AUTO_GIRLS', 'AUTO_NORMAL', 'MANUAL', name='rollnumberassignmenttype'),
                                        nullable=True,
                                        server_default='MANUAL'))

    # Update existing NULL values to MANUAL
    op.execute("UPDATE students SET roll_number_assignment_type = 'MANUAL' WHERE roll_number_assignment_type IS NULL")


def downgrade():
    # Remove column
    op.drop_column('students', 'roll_number_assignment_type')

    # Drop enum type
    rollnumberassignmenttype = postgresql.ENUM('AUTO_BOYS', 'AUTO_GIRLS', 'AUTO_NORMAL', 'MANUAL', name='rollnumberassignmenttype')
    rollnumberassignmenttype.drop(op.get_bind())
