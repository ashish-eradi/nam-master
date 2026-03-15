"""add_parent_contact_fields

Revision ID: 2c0069bea8db
Revises: 1cf2ccdcc68c
Create Date: 2025-12-30 16:05:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2c0069bea8db'
down_revision = '1cf2ccdcc68c'
branch_labels = None
depends_on = None


def upgrade():
    # Add new columns to parents table
    op.add_column('parents', sa.Column('father_name', sa.String(length=100), nullable=True))
    op.add_column('parents', sa.Column('father_phone', sa.String(length=20), nullable=True))
    op.add_column('parents', sa.Column('father_email', sa.String(length=100), nullable=True))
    op.add_column('parents', sa.Column('father_occupation', sa.String(length=100), nullable=True))
    op.add_column('parents', sa.Column('mother_name', sa.String(length=100), nullable=True))
    op.add_column('parents', sa.Column('mother_phone', sa.String(length=20), nullable=True))
    op.add_column('parents', sa.Column('mother_email', sa.String(length=100), nullable=True))
    op.add_column('parents', sa.Column('mother_occupation', sa.String(length=100), nullable=True))
    op.add_column('parents', sa.Column('address', sa.String(), nullable=True))
    op.add_column('parents', sa.Column('city', sa.String(length=100), nullable=True))
    op.add_column('parents', sa.Column('state', sa.String(length=100), nullable=True))
    op.add_column('parents', sa.Column('pincode', sa.String(length=10), nullable=True))


def downgrade():
    # Remove columns from parents table
    op.drop_column('parents', 'pincode')
    op.drop_column('parents', 'state')
    op.drop_column('parents', 'city')
    op.drop_column('parents', 'address')
    op.drop_column('parents', 'mother_occupation')
    op.drop_column('parents', 'mother_email')
    op.drop_column('parents', 'mother_phone')
    op.drop_column('parents', 'mother_name')
    op.drop_column('parents', 'father_occupation')
    op.drop_column('parents', 'father_email')
    op.drop_column('parents', 'father_phone')
    op.drop_column('parents', 'father_name')
