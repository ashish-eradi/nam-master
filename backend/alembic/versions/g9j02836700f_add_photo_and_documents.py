"""add photo and documents to students and teachers

Revision ID: g9j02836700f
Revises: f8h91725699e
Create Date: 2025-11-30 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'g9j02836700f'
down_revision = 'f8h91725699e'
branch_labels = None
depends_on = None


def upgrade():
    # Add photo_url and documents columns to students table
    op.add_column('students', sa.Column('photo_url', sa.String(), nullable=True))
    op.add_column('students', sa.Column('documents', postgresql.JSONB(astext_type=sa.Text()), nullable=True))

    # Add photo_url and documents columns to teachers table
    op.add_column('teachers', sa.Column('photo_url', sa.String(), nullable=True))
    op.add_column('teachers', sa.Column('documents', postgresql.JSONB(astext_type=sa.Text()), nullable=True))


def downgrade():
    # Remove columns from teachers table
    op.drop_column('teachers', 'documents')
    op.drop_column('teachers', 'photo_url')

    # Remove columns from students table
    op.drop_column('students', 'documents')
    op.drop_column('students', 'photo_url')
