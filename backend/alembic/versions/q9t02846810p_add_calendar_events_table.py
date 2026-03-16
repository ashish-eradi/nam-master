"""Add calendar_events table

Revision ID: q9t02846810p
Revises: p8s91735699o
Create Date: 2026-03-16 17:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'q9t02846810p'
down_revision: Union[str, None] = 'p8s91735699o'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    event_type_enum = sa.Enum(
        'holiday', 'exam', 'event', 'meeting', 'workshop', 'sports', 'other',
        name='eventtype'
    )
    event_type_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        'calendar_events',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('school_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('event_type', sa.Enum(
            'holiday', 'exam', 'event', 'meeting', 'workshop', 'sports', 'other',
            name='eventtype', create_type=False
        ), nullable=False, server_default='event'),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('is_school_closed', sa.String(), nullable=True, server_default='no'),
        sa.Column('academic_year', sa.String(), nullable=False),
        sa.Column('color', sa.String(), nullable=True, server_default='#1890ff'),
        sa.ForeignKeyConstraint(['school_id'], ['schools.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_calendar_events_school_id', 'calendar_events', ['school_id'])
    op.create_index('ix_calendar_events_start_date', 'calendar_events', ['start_date'])


def downgrade() -> None:
    op.drop_index('ix_calendar_events_start_date', table_name='calendar_events')
    op.drop_index('ix_calendar_events_school_id', table_name='calendar_events')
    op.drop_table('calendar_events')
    sa.Enum(name='eventtype').drop(op.get_bind(), checkfirst=True)
