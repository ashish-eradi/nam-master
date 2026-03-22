"""add miscellaneous fees

Revision ID: r0u13957921q
Revises: q9t02846810p
Create Date: 2026-03-22 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'r0u13957921q'
down_revision: Union[str, None] = 'q9t02846810p'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'miscellaneous_fee_categories',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('school_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['school_id'], ['schools.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'miscellaneous_fees',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('category_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('amount', sa.DECIMAL(10, 2), nullable=False),
        sa.Column('fund_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('academic_year', sa.String(10), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['category_id'], ['miscellaneous_fee_categories.id']),
        sa.ForeignKeyConstraint(['fund_id'], ['funds.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'student_miscellaneous_fee_structures',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('student_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('miscellaneous_fee_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('academic_year', sa.String(10), nullable=False),
        sa.Column('total_amount', sa.DECIMAL(10, 2), nullable=False),
        sa.Column('discount_amount', sa.DECIMAL(10, 2), nullable=True),
        sa.Column('final_amount', sa.DECIMAL(10, 2), nullable=False),
        sa.Column('amount_paid', sa.DECIMAL(10, 2), nullable=True),
        sa.Column('outstanding_amount', sa.DECIMAL(10, 2), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['student_id'], ['students.id']),
        sa.ForeignKeyConstraint(['miscellaneous_fee_id'], ['miscellaneous_fees.id']),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('student_miscellaneous_fee_structures')
    op.drop_table('miscellaneous_fees')
    op.drop_table('miscellaneous_fee_categories')
