import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User as UserModel
from app.models.school import School as SchoolModel
from app.models.student import Student as StudentModel
from app.models.grade import Grade as GradeModel
from app.models.attendance import Attendance as AttendanceModel
from app.models.class_model import Class as ClassModel
from app.core.security import create_access_token, hash_password
from datetime import date

import uuid

def test_read_student_grades_and_attendance(test_client: TestClient, db_session: Session):
    school = SchoolModel(name="Test School 29", code="TEST29")
    db_session.add(school)
    db_session.commit()

    user = UserModel(
        username="test_student_user29",
        email="test_student_user29@test.com",
        password_hash=hash_password("test_password"),
        role="STUDENT",
        school_id=school.id,
        is_verified=True
    )
    db_session.add(user)
    db_session.commit()

    token_data = {"sub": user.email, "role": "STUDENT", "school_id": str(school.id)}
    token = create_access_token(data=token_data)

    class_ = ClassModel(name="Test Class", section="A", school_id=school.id, academic_year="2025-2026")
    db_session.add(class_)
    db_session.commit()

    student = StudentModel(
        user_id=user.id,
        first_name="Test",
        last_name="Student",
        admission_number="12345678",
        admission_date=date.today(),
        school_id=school.id,
        date_of_birth=date.today(),
        gender="Male",
        class_id=class_.id,
        academic_year="2025-2026",
    )
    db_session.add(student)
    db_session.commit()

    grade = GradeModel(student_id=student.id, subject_id=uuid.uuid4(), school_id=school.id, score_achieved=99.9, assessment_id=uuid.uuid4())
    db_session.add(grade)
    db_session.commit()

    attendance = AttendanceModel(student_id=student.id, class_id=student.class_id, school_id=school.id, date=date.today(), status="P")
    db_session.add(attendance)
    db_session.commit()

    response = test_client.get(f"/api/v1/students/{str(student.id)}/grades", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["score_achieved"] == 99.9

    response = test_client.get(f"/api/v1/students/{str(student.id)}/attendance", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["status"] == "P"
