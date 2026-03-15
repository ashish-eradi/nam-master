"""add logo_url to schools

Revision ID: m5p68402366l
Revises: l4o57391255k
Create Date: 2026-03-10 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'm5p68402366l'
down_revision = 'l4o57391255k'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('schools', sa.Column('logo_url', sa.String(500), nullable=True))


def downgrade():
    op.drop_column('schools', 'logo_url')
