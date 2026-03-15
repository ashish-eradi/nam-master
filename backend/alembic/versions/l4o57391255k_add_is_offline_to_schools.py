"""add is_offline to schools

Revision ID: l4o57391255k
Revises: k3n46280144j
Create Date: 2026-02-26 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'l4o57391255k'
down_revision = 'k3n46280144j'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('schools', sa.Column('is_offline', sa.Boolean(), nullable=False, server_default='false'))


def downgrade():
    op.drop_column('schools', 'is_offline')
