"""Add calendar_events table

Revision ID: q9t02846810p
Revises: p8s91735699o
Create Date: 2026-03-16 17:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'q9t02846810p'
down_revision: Union[str, None] = 'p8s91735699o'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enum type safely (handles partial previous runs)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE eventtype AS ENUM (
                'holiday', 'exam', 'event', 'meeting', 'workshop', 'sports', 'other'
            );
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)

    # Create table safely (idempotent)
    op.execute("""
        CREATE TABLE IF NOT EXISTS calendar_events (
            id UUID NOT NULL DEFAULT gen_random_uuid(),
            school_id UUID NOT NULL,
            title VARCHAR NOT NULL,
            description TEXT,
            event_type eventtype NOT NULL DEFAULT 'event',
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            is_school_closed VARCHAR DEFAULT 'no',
            academic_year VARCHAR NOT NULL,
            color VARCHAR DEFAULT '#1890ff',
            PRIMARY KEY (id),
            FOREIGN KEY (school_id) REFERENCES schools(id)
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_calendar_events_school_id ON calendar_events (school_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_calendar_events_start_date ON calendar_events (start_date)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS calendar_events")
    op.execute("DROP TYPE IF EXISTS eventtype")
