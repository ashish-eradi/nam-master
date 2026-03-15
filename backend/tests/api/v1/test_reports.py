
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User as UserModel
from app.models.school import School as SchoolModel
from app.models.student import Student as StudentModel
from app.models.class_model import Class as ClassModel
from app.models.attendance import Attendance as AttendanceModel
from app.models.grade import Grade as GradeModel
from app.models.finance import Payment as PaymentModel
from app.core.security import create_access_token, hash_password
from datetime import date
import uuid

def test_reports_flow(test_client: TestClient, db_session: Session):
    # 1. Setup: Create school, admin, student, class, teacher, attendance, grade, payment
    school = SchoolModel(name="Test School 39", code="TEST39")
    db_session.add(school)
    db_session.commit()

    admin_user = UserModel(
        username="test_admin_user39",
        email="test_admin_user39@test.com",
        password_hash=hash_password("test_password"),
        role="ADMIN",
        school_id=school.id,
        is_verified=True
    )
    teacher_user = UserModel(
        username="test_teacher_user39",
        email="test_teacher_user39@test.com",
        password_hash=hash_password("test_password"),
        role="TEACHER",
        school_id=school.id,
        is_verified=True
    )
    db_session.add_all([admin_user, teacher_user])
    db_session.commit()

    class_ = ClassModel(name="Test Class 39", section="A", school_id=school.id, academic_year="2025-2026")
    db_session.add(class_)
    db_session.commit()

    student_user = UserModel(
        username="test_student_user39",
        email="test_student_user39@test.com",
        password_hash=hash_password("test_password"),
        role="STUDENT",
        school_id=school.id,
        is_verified=True
    )
    db_session.add(student_user)
    db_session.commit()

    student = StudentModel(
        user_id=student_user.id,
        first_name="Test",
        last_name="Student",
        admission_number="123456789012345",
        admission_date=date.today(),
        school_id=school.id,
        date_of_birth=date.today(),
        gender="Male",
        class_id=class_.id,
        academic_year="2025-2026",
    )
    db_session.add(student)
    db_session.commit()

    attendance = AttendanceModel(student_id=student.id, class_id=class_.id, school_id=school.id, date=date.today(), status="P")
    db_session.add(attendance)
    db_session.commit()

    grade = GradeModel(student_id=student.id, subject_id=uuid.uuid4(), school_id=school.id, score_achieved=95.5, assessment_id=uuid.uuid4())
    db_session.add(grade)
    db_session.commit()

    payment = PaymentModel(student_id=student.id, school_id=school.id, amount_paid=1000, payment_date=date.today(), receipt_number="12345")
    db_session.add(payment)
    db_session.commit()

    token_data = {"sub": admin_user.email, "role": "ADMIN", "school_id": str(school.id)}
    token = create_access_token(data=token_data)
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get Admin Dashboard
    response = test_client.get("/api/v1/reports/admin-dashboard", headers=headers)
    assert response.status_code == 200
    dashboard_data = response.json()
    assert dashboard_data["total_students"] == 1
    assert dashboard_data["total_teachers"] == 1
    assert dashboard_data["total_classes"] == 1

    # 3. Get Attendance Report
    response = test_client.get("/api/v1/reports/attendance", headers=headers)
    assert response.status_code == 200
    assert len(response.json()) > 0

    # 4. Get Grades Report
    response = test_client.get("/api/v1/reports/grades", headers=headers)
    assert response.status_code == 200
    assert len(response.json()) > 0

    # 5. Get Financial Report
    response = test_client.get("/api/v1/reports/financial", headers=headers)
    assert response.status_code == 200
    assert len(response.json()) > 0

    # 6. Get Student Report
    response = test_client.get("/api/v1/reports/students", headers=headers)
    assert response.status_code == 200
    assert len(response.json()) > 0
