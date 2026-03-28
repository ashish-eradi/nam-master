"""add whatsapp meta cloud api

Revision ID: u3x46290254t
Revises: s1v24068032r
Create Date: 2026-03-28 00:00:00.000000

Creates the whatsapp_credentials table and extends the existing
sms_notifications / sms_templates tables with Meta Cloud API tracking columns.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'u3x46290254t'
down_revision: Union[str, None] = 's1v24068032r'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. whatsapp_credentials ───────────────────────────────────────────────
    op.create_table(
        'whatsapp_credentials',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('school_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('phone_number_id', sa.String(50), nullable=False),
        sa.Column('waba_id', sa.String(50), nullable=False),
        sa.Column('access_token', sa.Text(), nullable=False),
        sa.Column('display_name', sa.String(200), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('connected_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['school_id'], ['schools.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('school_id', name='uq_whatsapp_credentials_school'),
    )
    op.create_index(
        'ix_whatsapp_credentials_phone_number_id',
        'whatsapp_credentials',
        ['phone_number_id'],
    )

    # ── 2. sms_notifications — add Meta tracking columns ─────────────────────
    op.add_column(
        'sms_notifications',
        sa.Column('meta_message_id', sa.String(100), nullable=True),
    )
    op.add_column(
        'sms_notifications',
        sa.Column('delivered_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        'sms_notifications',
        sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        'ix_sms_notifications_meta_message_id',
        'sms_notifications',
        ['meta_message_id'],
    )
    op.create_index(
        'ix_sms_notifications_school_created',
        'sms_notifications',
        ['school_id', 'created_at'],
    )

    # ── 3. sms_templates — add Meta template binding columns ─────────────────
    op.add_column(
        'sms_templates',
        sa.Column('meta_template_name', sa.String(200), nullable=True),
    )
    op.add_column(
        'sms_templates',
        sa.Column('meta_template_language', sa.String(20), nullable=True, server_default='en'),
    )


def downgrade() -> None:
    op.drop_column('sms_templates', 'meta_template_language')
    op.drop_column('sms_templates', 'meta_template_name')

    op.drop_index('ix_sms_notifications_school_created', table_name='sms_notifications')
    op.drop_index('ix_sms_notifications_meta_message_id', table_name='sms_notifications')
    op.drop_column('sms_notifications', 'read_at')
    op.drop_column('sms_notifications', 'delivered_at')
    op.drop_column('sms_notifications', 'meta_message_id')

    op.drop_index('ix_whatsapp_credentials_phone_number_id', table_name='whatsapp_credentials')
    op.drop_table('whatsapp_credentials')
