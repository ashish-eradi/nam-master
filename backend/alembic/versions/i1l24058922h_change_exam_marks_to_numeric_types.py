"""change exam marks to numeric types

Revision ID: i1l24058922h
Revises: h0k13947811g
Create Date: 2025-12-03 03:20:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'i1l24058922h'
down_revision = 'h0k13947811g'
branch_labels = None
depends_on = None


def upgrade():
    # Change exam_schedule_items columns from String to numeric types
    # duration_minutes: String -> Integer
    op.alter_column('exam_schedule_items', 'duration_minutes',
                    existing_type=sa.String(10),
                    type_=sa.Integer(),
                    existing_nullable=False,
                    postgresql_using='duration_minutes::integer')

    # max_marks: String -> Numeric(5, 2)
    op.alter_column('exam_schedule_items', 'max_marks',
                    existing_type=sa.String(10),
                    type_=sa.Numeric(5, 2),
                    existing_nullable=False,
                    postgresql_using='max_marks::numeric(5,2)')

    # passing_marks: String -> Numeric(5, 2)
    op.alter_column('exam_schedule_items', 'passing_marks',
                    existing_type=sa.String(10),
                    type_=sa.Numeric(5, 2),
                    existing_nullable=True,
                    postgresql_using='passing_marks::numeric(5,2)')

    # Change student_exam_marks.marks_obtained from String to Numeric(5, 2)
    op.alter_column('student_exam_marks', 'marks_obtained',
                    existing_type=sa.String(10),
                    type_=sa.Numeric(5, 2),
                    existing_nullable=True,
                    postgresql_using='marks_obtained::numeric(5,2)')


def downgrade():
    # Revert student_exam_marks.marks_obtained back to String
    op.alter_column('student_exam_marks', 'marks_obtained',
                    existing_type=sa.Numeric(5, 2),
                    type_=sa.String(10),
                    existing_nullable=True,
                    postgresql_using='marks_obtained::varchar(10)')

    # Revert exam_schedule_items columns back to String
    op.alter_column('exam_schedule_items', 'passing_marks',
                    existing_type=sa.Numeric(5, 2),
                    type_=sa.String(10),
                    existing_nullable=True,
                    postgresql_using='passing_marks::varchar(10)')

    op.alter_column('exam_schedule_items', 'max_marks',
                    existing_type=sa.Numeric(5, 2),
                    type_=sa.String(10),
                    existing_nullable=False,
                    postgresql_using='max_marks::varchar(10)')

    op.alter_column('exam_schedule_items', 'duration_minutes',
                    existing_type=sa.Integer(),
                    type_=sa.String(10),
                    existing_nullable=False,
                    postgresql_using='duration_minutes::varchar(10)')
