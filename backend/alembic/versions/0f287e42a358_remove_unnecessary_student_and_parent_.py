
"""remove_unnecessary_student_and_parent_fields

Revision ID: 0f287e42a358
Revises: 2c0069bea8db
Create Date: 2025-12-30 14:53:33.799695

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0f287e42a358'
down_revision = '2c0069bea8db'
branch_labels = None
depends_on = None


def upgrade():
    # Remove unnecessary fields from students table
    op.drop_column('students', 'user_id', if_exists=True)
    op.drop_column('students', 'father_name', if_exists=True)
    op.drop_column('students', 'father_phone', if_exists=True)
    op.drop_column('students', 'mother_name', if_exists=True)
    op.drop_column('students', 'mother_phone', if_exists=True)

    # Remove duplicate parent fields from parent_student_relation table
    op.drop_column('parent_student_relation', 'father_name', if_exists=True)
    op.drop_column('parent_student_relation', 'father_phone', if_exists=True)
    op.drop_column('parent_student_relation', 'father_occupation', if_exists=True)
    op.drop_column('parent_student_relation', 'mother_name', if_exists=True)
    op.drop_column('parent_student_relation', 'mother_phone', if_exists=True)
    op.drop_column('parent_student_relation', 'mother_occupation', if_exists=True)
    op.drop_column('parent_student_relation', 'guardian_name', if_exists=True)
    op.drop_column('parent_student_relation', 'guardian_phone', if_exists=True)


def downgrade():
    # Add back fields to students table
    op.add_column('students', sa.Column('user_id', sa.UUID(), nullable=True))
    op.add_column('students', sa.Column('father_name', sa.String(100), nullable=True))
    op.add_column('students', sa.Column('father_phone', sa.String(20), nullable=True))
    op.add_column('students', sa.Column('mother_name', sa.String(100), nullable=True))
    op.add_column('students', sa.Column('mother_phone', sa.String(20), nullable=True))

    # Add back duplicate parent fields to parent_student_relation table
    op.add_column('parent_student_relation', sa.Column('father_name', sa.String(100), nullable=True))
    op.add_column('parent_student_relation', sa.Column('father_phone', sa.String(20), nullable=True))
    op.add_column('parent_student_relation', sa.Column('father_occupation', sa.String(100), nullable=True))
    op.add_column('parent_student_relation', sa.Column('mother_name', sa.String(100), nullable=True))
    op.add_column('parent_student_relation', sa.Column('mother_phone', sa.String(20), nullable=True))
    op.add_column('parent_student_relation', sa.Column('mother_occupation', sa.String(100), nullable=True))
    op.add_column('parent_student_relation', sa.Column('guardian_name', sa.String(100), nullable=True))
    op.add_column('parent_student_relation', sa.Column('guardian_phone', sa.String(20), nullable=True))
