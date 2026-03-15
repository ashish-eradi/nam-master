import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User as UserModel
from app.models.school import School as SchoolModel
from app.models.student import Student as StudentModel
from app.models.teacher import Teacher as TeacherModel
from app.models.class_model import Class as ClassModel
from app.models.attendance import Attendance as AttendanceModel
from app.core.security import create_access_token, hash_password
from datetime import date, timedelta

def test_get_admin_dashboard(test_client: TestClient, db_session: Session):
    school = SchoolModel(name="Test School", code="TEST")
    db_session.add(school)
    db_session.commit()

    admin_user = UserModel(
        username="test_admin",
        email="test_admin@test.com",
        password_hash=hash_password("test_password"),
        role="ADMIN",
        school_id=school.id,
        is_verified=True
    )
    db_session.add(admin_user)
    db_session.commit()

    token_data = {"sub": admin_user.email, "role": "ADMIN", "school_id": str(school.id)}
    token = create_access_token(data=token_data)

    # Create some data for the dashboard
    class1 = ClassModel(name="Class 1", section="A", school_id=school.id, academic_year="2025-2026")
    db_session.add(class1)
    db_session.commit()

    teacher_user = UserModel(username="teacher1", email="teacher1@test.com", password_hash=hash_password("password"), role="TEACHER", school_id=school.id, is_verified=True)
    db_session.add(teacher_user)
    db_session.commit()
    teacher = TeacherModel(user_id=teacher_user.id, school_id=school.id, employee_id="T1")
    db_session.add(teacher)
    db_session.commit()

    student_user1 = UserModel(username="student1", email="student1@test.com", password_hash=hash_password("password"), role="STUDENT", school_id=school.id, is_verified=True)
    student_user2 = UserModel(username="student2", email="student2@test.com", password_hash=hash_password("password"), role="STUDENT", school_id=school.id, is_verified=True)
    db_session.add(student_user1)
    db_session.add(student_user2)
    db_session.commit()

    student1 = StudentModel(user_id=student_user1.id, first_name="John", last_name="Doe", class_id=class1.id, school_id=school.id, admission_number="12345", admission_date=date.today(), date_of_birth=date.today(), gender="Male", academic_year="2025-2026")
    student2 = StudentModel(user_id=student_user2.id, first_name="Jane", last_name="Doe", class_id=class1.id, school_id=school.id, admission_number="67890", admission_date=date.today(), date_of_birth=date.today(), gender="Female", academic_year="2025-2026")
    db_session.add(student1)
    db_session.add(student2)
    db_session.commit()
    
    attendance1 = AttendanceModel(student_id=student1.id, class_id=class1.id, school_id=school.id, date=date.today(), status='P')
    attendance2 = AttendanceModel(student_id=student2.id, class_id=class1.id, school_id=school.id, date=date.today(), status='A')
    db_session.add(attendance1)
    db_session.add(attendance2)
    db_session.commit()

    response = test_client.get("/api/v1/dashboard/admin", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["total_students"] == 2
    assert data["total_teachers"] == 1
    assert data["total_classes"] == 1
    assert data["attendance_rate"] == 50.0

def test_get_teacher_dashboard(test_client: TestClient, db_session: Session):
    school = SchoolModel(name="Test School 2", code="TEST2")
    db_session.add(school)
    db_session.commit()

    teacher_user = UserModel(
        username="test_teacher",
        email="test_teacher@test.com",
        password_hash=hash_password("test_password"),
        role="TEACHER",
        school_id=school.id,
        is_verified=True
    )
    db_session.add(teacher_user)
    db_session.commit()

    token_data = {"sub": teacher_user.email, "role": "TEACHER", "school_id": str(school.id)}
    token = create_access_token(data=token_data)

    response = test_client.get("/api/v1/dashboard/teacher", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert "today_schedule" in data
    assert "assigned_classes_count" in data
    assert "pending_grade_entries" in data