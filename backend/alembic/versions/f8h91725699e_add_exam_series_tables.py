"""add exam series tables

Revision ID: f8h91725699e
Revises: a3bc5a576ca1
Create Date: 2025-11-28

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'f8h91725699e'
down_revision: Union[str, None] = 'a3bc5a576ca1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create exam_type enum if it doesn't exist
    conn = op.get_bind()
    conn.execute(sa.text("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'examtype') THEN
                CREATE TYPE examtype AS ENUM ('Unit Test', 'Midterm', 'Final', 'Quarterly', 'Half Yearly', 'Annual', 'Practical', 'Internal');
            END IF;
        END$$;
    """))

    # Create exam_series table
    op.create_table(
        'exam_series',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('exam_type', postgresql.ENUM('Unit Test', 'Midterm', 'Final', 'Quarterly', 'Half Yearly', 'Annual', 'Practical', 'Internal', name='examtype', create_type=False), nullable=False),
        sa.Column('academic_year', sa.String(length=10), nullable=False),
        sa.Column('school_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('is_published', sa.Boolean(), nullable=True),
        sa.Column('created_by_user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['created_by_user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['school_id'], ['schools.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_exam_series_school_id'), 'exam_series', ['school_id'], unique=False)
    op.create_index(op.f('ix_exam_series_academic_year'), 'exam_series', ['academic_year'], unique=False)

    # Create exam_timetables table
    op.create_table(
        'exam_timetables',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('exam_series_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('class_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('school_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('instructions', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['class_id'], ['classes.id'], ),
        sa.ForeignKeyConstraint(['exam_series_id'], ['exam_series.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['school_id'], ['schools.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_exam_timetables_exam_series_id'), 'exam_timetables', ['exam_series_id'], unique=False)
    op.create_index(op.f('ix_exam_timetables_class_id'), 'exam_timetables', ['class_id'], unique=False)
    op.create_index(op.f('ix_exam_timetables_school_id'), 'exam_timetables', ['school_id'], unique=False)

    # Create exam_schedule_items table
    op.create_table(
        'exam_schedule_items',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('exam_timetable_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('subject_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('exam_date', sa.Date(), nullable=False),
        sa.Column('start_time', sa.String(length=10), nullable=False),
        sa.Column('duration_minutes', sa.String(length=10), nullable=False),
        sa.Column('max_marks', sa.String(length=10), nullable=False),
        sa.Column('passing_marks', sa.String(length=10), nullable=True),
        sa.Column('room_number', sa.String(length=50), nullable=True),
        sa.Column('instructions', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['exam_timetable_id'], ['exam_timetables.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['subject_id'], ['subjects.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_exam_schedule_items_exam_timetable_id'), 'exam_schedule_items', ['exam_timetable_id'], unique=False)
    op.create_index(op.f('ix_exam_schedule_items_subject_id'), 'exam_schedule_items', ['subject_id'], unique=False)
    op.create_index(op.f('ix_exam_schedule_items_exam_date'), 'exam_schedule_items', ['exam_date'], unique=False)

    # Create student_exam_marks table
    op.create_table(
        'student_exam_marks',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('student_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('exam_schedule_item_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('marks_obtained', sa.String(length=10), nullable=True),
        sa.Column('grade_letter', sa.String(length=5), nullable=True),
        sa.Column('is_absent', sa.Boolean(), nullable=True),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.Column('entered_by_user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('entered_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['entered_by_user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['exam_schedule_item_id'], ['exam_schedule_items.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_student_exam_marks_student_id'), 'student_exam_marks', ['student_id'], unique=False)
    op.create_index(op.f('ix_student_exam_marks_exam_schedule_item_id'), 'student_exam_marks', ['exam_schedule_item_id'], unique=False)

    # Create unique constraint for student + exam_schedule_item
    op.create_unique_constraint('uq_student_exam_schedule_item', 'student_exam_marks', ['student_id', 'exam_schedule_item_id'])


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_index(op.f('ix_student_exam_marks_exam_schedule_item_id'), table_name='student_exam_marks')
    op.drop_index(op.f('ix_student_exam_marks_student_id'), table_name='student_exam_marks')
    op.drop_constraint('uq_student_exam_schedule_item', 'student_exam_marks', type_='unique')
    op.drop_table('student_exam_marks')

    op.drop_index(op.f('ix_exam_schedule_items_exam_date'), table_name='exam_schedule_items')
    op.drop_index(op.f('ix_exam_schedule_items_subject_id'), table_name='exam_schedule_items')
    op.drop_index(op.f('ix_exam_schedule_items_exam_timetable_id'), table_name='exam_schedule_items')
    op.drop_table('exam_schedule_items')

    op.drop_index(op.f('ix_exam_timetables_school_id'), table_name='exam_timetables')
    op.drop_index(op.f('ix_exam_timetables_class_id'), table_name='exam_timetables')
    op.drop_index(op.f('ix_exam_timetables_exam_series_id'), table_name='exam_timetables')
    op.drop_table('exam_timetables')

    op.drop_index(op.f('ix_exam_series_academic_year'), table_name='exam_series')
    op.drop_index(op.f('ix_exam_series_school_id'), table_name='exam_series')
    op.drop_table('exam_series')

    # Drop enum
    conn = op.get_bind()
    conn.execute(sa.text("DROP TYPE IF EXISTS examtype"))
