"""add sms_api_key to schools

Revision ID: j2m35169033i
Revises: i1l24058922h
Create Date: 2025-12-23 19:40:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'j2m35169033i'
down_revision = 'i1l24058922h'
branch_labels = None
depends_on = None


def upgrade():
    # Add sms_api_key column to schools table
    op.add_column('schools', sa.Column('sms_api_key', sa.String(255), nullable=True))


def downgrade():
    # Remove sms_api_key column from schools table
    op.drop_column('schools', 'sms_api_key')
