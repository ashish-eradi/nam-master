"""add license key system

Revision ID: k3n46280144j
Revises: 0f287e42a358
Create Date: 2026-02-25 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision = 'k3n46280144j'
down_revision = '0f287e42a358'
branch_labels = None
depends_on = None


def upgrade():
    # Create license_keys table
    op.create_table(
        'license_keys',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('school_id', UUID(as_uuid=True), sa.ForeignKey('schools.id'), nullable=False),
        sa.Column('key_hash', sa.String(255), nullable=False),
        sa.Column('issued_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('is_revoked', sa.Boolean(), default=False),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('issued_by', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )

    # Add license columns to schools table
    op.add_column('schools', sa.Column('license_expires_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('schools', sa.Column('license_activated_at', sa.DateTime(timezone=True), nullable=True))


def downgrade():
    op.drop_column('schools', 'license_activated_at')
    op.drop_column('schools', 'license_expires_at')
    op.drop_table('license_keys')
