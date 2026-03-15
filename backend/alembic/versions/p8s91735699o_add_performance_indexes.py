"""add performance indexes

Revision ID: p8s91735699o
Revises: o7r80624588n
Create Date: 2026-03-15 00:00:00.000000

"""
from alembic import op

revision = 'p8s91735699o'
down_revision = 'o7r80624588n'
branch_labels = None
depends_on = None


def upgrade():
    # Students: common filters
    op.create_index('ix_students_school_id', 'students', ['school_id'])
    op.create_index('ix_students_class_id', 'students', ['class_id'])
    op.create_index('ix_students_admission_number', 'students', ['admission_number'])

    # Attendance: common filters
    op.create_index('ix_attendance_school_id_date', 'attendance', ['school_id', 'date'])
    op.create_index('ix_attendance_student_id', 'attendance', ['student_id'])
    op.create_index('ix_attendance_class_id', 'attendance', ['class_id'])

    # Payments: common filters
    op.create_index('ix_payments_school_id', 'payments', ['school_id'])
    op.create_index('ix_payments_student_id', 'payments', ['student_id'])
    op.create_index('ix_payments_payment_date', 'payments', ['payment_date'])

    # Timetable entries: teacher schedule lookup
    op.create_index('ix_timetable_entries_teacher_id', 'timetable_entries', ['teacher_id'])
    op.create_index('ix_timetable_entries_school_id_day', 'timetable_entries', ['school_id', 'day_of_week'])

    # Audit logs: common lookup
    op.create_index('ix_audit_logs_school_id', 'audit_logs', ['school_id'])
    op.create_index('ix_audit_logs_user_id', 'audit_logs', ['user_id'])

    # Users: login lookup
    op.create_index('ix_users_email', 'users', ['email'], unique=True)
    op.create_index('ix_users_school_id', 'users', ['school_id'])

    # Teachers
    op.create_index('ix_teachers_school_id', 'teachers', ['school_id'])
    op.create_index('ix_teachers_user_id', 'teachers', ['user_id'])


def downgrade():
    op.drop_index('ix_students_school_id', 'students')
    op.drop_index('ix_students_class_id', 'students')
    op.drop_index('ix_students_admission_number', 'students')

    op.drop_index('ix_attendance_school_id_date', 'attendance')
    op.drop_index('ix_attendance_student_id', 'attendance')
    op.drop_index('ix_attendance_class_id', 'attendance')

    op.drop_index('ix_payments_school_id', 'payments')
    op.drop_index('ix_payments_student_id', 'payments')
    op.drop_index('ix_payments_payment_date', 'payments')

    op.drop_index('ix_timetable_entries_teacher_id', 'timetable_entries')
    op.drop_index('ix_timetable_entries_school_id_day', 'timetable_entries')

    op.drop_index('ix_audit_logs_school_id', 'audit_logs')
    op.drop_index('ix_audit_logs_user_id', 'audit_logs')

    op.drop_index('ix_users_email', 'users')
    op.drop_index('ix_users_school_id', 'users')

    op.drop_index('ix_teachers_school_id', 'teachers')
    op.drop_index('ix_teachers_user_id', 'teachers')
