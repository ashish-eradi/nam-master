"""add installment_type to funds

Revision ID: c6d90581477c
Revises: b5c89470366b
Create Date: 2025-11-26 10:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c6d90581477c'
down_revision = 'b5c89470366b'
branch_labels = None
depends_on = None


def upgrade():
    # Add installment_type column to funds table
    op.add_column('funds', sa.Column('installment_type', sa.String(length=20), nullable=True))


def downgrade():
    # Remove installment_type column from funds table
    op.drop_column('funds', 'installment_type')
