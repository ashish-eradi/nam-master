"""add hostel fees table

Revision ID: n6q79513477m
Revises: m5p68402366l
Create Date: 2026-03-14 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'n6q79513477m'
down_revision = 'm5p68402366l'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'hostel_fees',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('hostel_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('hostels.id'), nullable=False),
        sa.Column('amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('installment_type', sa.String(20), nullable=True),
        sa.Column('fund_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('funds.id'), nullable=True),
        sa.Column('academic_year', sa.String(10), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )


def downgrade():
    op.drop_table('hostel_fees')
