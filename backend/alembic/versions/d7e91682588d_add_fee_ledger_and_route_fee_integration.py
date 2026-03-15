"""add fee ledger and route fee integration

Revision ID: d7e91682588d
Revises: c6d90581477c
Create Date: 2025-11-26 15:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision = 'd7e91682588d'
down_revision = 'c6d90581477c'
branch_labels = None
depends_on = None


def upgrade():
    # Create student_fee_structures table
    op.create_table('student_fee_structures',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('student_id', UUID(as_uuid=True), sa.ForeignKey('students.id'), nullable=False),
        sa.Column('class_fee_id', UUID(as_uuid=True), sa.ForeignKey('class_fees.id'), nullable=False),
        sa.Column('academic_year', sa.String(length=10), nullable=False),
        sa.Column('total_amount', sa.DECIMAL(10, 2), nullable=False),
        sa.Column('discount_amount', sa.DECIMAL(10, 2), server_default='0'),
        sa.Column('final_amount', sa.DECIMAL(10, 2), nullable=False),
        sa.Column('amount_paid', sa.DECIMAL(10, 2), server_default='0'),
        sa.Column('outstanding_amount', sa.DECIMAL(10, 2), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.text('now()'))
    )

    # Create fee_installments table
    op.create_table('fee_installments',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('student_fee_structure_id', UUID(as_uuid=True), sa.ForeignKey('student_fee_structures.id'), nullable=False),
        sa.Column('installment_number', sa.Integer, nullable=False),
        sa.Column('due_date', sa.Date, nullable=False),
        sa.Column('amount', sa.DECIMAL(10, 2), nullable=False),
        sa.Column('paid_amount', sa.DECIMAL(10, 2), server_default='0'),
        sa.Column('status', sa.String(length=20), server_default='pending'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.text('now()'))
    )

    # Create payment_details table
    op.create_table('payment_details',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('payment_id', UUID(as_uuid=True), sa.ForeignKey('payments.id', ondelete='CASCADE'), nullable=False),
        sa.Column('fee_id', UUID(as_uuid=True), sa.ForeignKey('fees.id'), nullable=False),
        sa.Column('student_fee_structure_id', UUID(as_uuid=True), sa.ForeignKey('student_fee_structures.id'), nullable=True),
        sa.Column('amount', sa.DECIMAL(10, 2), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'))
    )

    # Add academic_year to route_fees table
    op.add_column('route_fees', sa.Column('academic_year', sa.String(length=10), nullable=True))

    # Create student_route_fee_structures table
    op.create_table('student_route_fee_structures',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('student_id', UUID(as_uuid=True), sa.ForeignKey('students.id'), nullable=False),
        sa.Column('route_fee_id', UUID(as_uuid=True), sa.ForeignKey('route_fees.id'), nullable=False),
        sa.Column('student_route_id', UUID(as_uuid=True), sa.ForeignKey('student_routes.id'), nullable=True),
        sa.Column('academic_year', sa.String(length=10), nullable=False),
        sa.Column('total_amount', sa.DECIMAL(10, 2), nullable=False),
        sa.Column('discount_amount', sa.DECIMAL(10, 2), server_default='0'),
        sa.Column('final_amount', sa.DECIMAL(10, 2), nullable=False),
        sa.Column('amount_paid', sa.DECIMAL(10, 2), server_default='0'),
        sa.Column('outstanding_amount', sa.DECIMAL(10, 2), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.text('now()'))
    )

    # Add route fee tracking to payment_details
    op.add_column('payment_details', sa.Column('route_fee_id', UUID(as_uuid=True), sa.ForeignKey('route_fees.id'), nullable=True))
    op.add_column('payment_details', sa.Column('student_route_fee_structure_id', UUID(as_uuid=True), sa.ForeignKey('student_route_fee_structures.id'), nullable=True))


def downgrade():
    # Drop in reverse order
    op.drop_column('payment_details', 'student_route_fee_structure_id')
    op.drop_column('payment_details', 'route_fee_id')
    op.drop_table('student_route_fee_structures')
    op.drop_column('route_fees', 'academic_year')
    op.drop_table('payment_details')
    op.drop_table('fee_installments')
    op.drop_table('student_fee_structures')
