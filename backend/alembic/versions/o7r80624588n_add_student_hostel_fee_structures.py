"""add student hostel fee structures table

Revision ID: o7r80624588n
Revises: n6q79513477m
Create Date: 2026-03-14 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'o7r80624588n'
down_revision = 'n6q79513477m'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'student_hostel_fee_structures',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('student_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('students.id'), nullable=False),
        sa.Column('hostel_fee_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('hostel_fees.id'), nullable=False),
        sa.Column('academic_year', sa.String(10), nullable=False),
        sa.Column('total_amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('discount_amount', sa.Numeric(10, 2), server_default='0'),
        sa.Column('final_amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('amount_paid', sa.Numeric(10, 2), server_default='0'),
        sa.Column('outstanding_amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )


def downgrade():
    op.drop_table('student_hostel_fee_structures')
