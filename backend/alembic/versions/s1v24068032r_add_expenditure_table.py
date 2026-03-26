"""add expenditure table

Revision ID: s1v24068032r
Revises: r0u13957921q
Create Date: 2026-03-26 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 's1v24068032r'
down_revision: Union[str, None] = 'r0u13957921q'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'expenditures',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('school_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('category', sa.String(100), nullable=False),
        sa.Column('description', sa.String(500), nullable=False),
        sa.Column('amount', sa.DECIMAL(10, 2), nullable=False),
        sa.Column('payment_mode', sa.String(20), nullable=True, server_default='Cash'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('recorded_by_user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['school_id'], ['schools.id']),
        sa.ForeignKeyConstraint(['recorded_by_user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_expenditures_school_date', 'expenditures', ['school_id', 'date'])


def downgrade() -> None:
    op.drop_index('ix_expenditures_school_date', table_name='expenditures')
    op.drop_table('expenditures')
