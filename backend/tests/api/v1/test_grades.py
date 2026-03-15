
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User as UserModel
from app.models.school import School as SchoolModel
from app.models.student import Student as StudentModel
from app.models.class_model import Class as ClassModel
from app.models.subject import Subject as SubjectModel
from app.models.assessment import Assessment as AssessmentModel
from app.models.grade import Grade as GradeModel
from app.core.security import create_access_token, hash_password
from datetime import date
import uuid

def test_grade_flow(test_client: TestClient, db_session: Session):
    # 1. Setup: Create school, teacher, student, class, subject, assessment
    school = SchoolModel(name="Test School 34", code="TEST34")
    db_session.add(school)
    db_session.commit()

    teacher_user = UserModel(
        username="test_teacher_user34",
        email="test_teacher_user34@test.com",
        password_hash=hash_password("test_password"),
        role="TEACHER",
        school_id=school.id,
        is_verified=True
    )
    db_session.add(teacher_user)
    db_session.commit()

    class_ = ClassModel(name="Test Class 34", section="A", school_id=school.id, academic_year="2025-2026")
    db_session.add(class_)
    db_session.commit()

    student_user = UserModel(
        username="test_student_user34",
        email="test_student_user34@test.com",
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
        admission_number="1234567890",
        admission_date=date.today(),
        school_id=school.id,
        date_of_birth=date.today(),
        gender="Male",
        class_id=class_.id,
        academic_year="2025-2026",
    )
    db_session.add(student)
    db_session.commit()

    subject = SubjectModel(name="Test Subject 34", code="TS34", school_id=school.id, class_id=class_.id)
    db_session.add(subject)
    db_session.commit()

    assessment = AssessmentModel(name="Test Assessment 34", class_id=class_.id, subject_id=subject.id, school_id=school.id, max_marks=100)
    db_session.add(assessment)
    db_session.commit()

    token_data = {"sub": teacher_user.email, "role": "TEACHER", "school_id": str(school.id)}
    token = create_access_token(data=token_data)
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Bulk Grade Entry
    grade_data = {
        "assessment_id": str(assessment.id),
        "grades": [
            {
                "student_id": str(student.id),
                "score_achieved": 95.5,
                "subject_id": str(subject.id),
                "academic_year": "2025-2026"
            }
        ]
    }
    response = test_client.post("/api/v1/grades/bulk-entry", headers=headers, json=grade_data)
    assert response.status_code == 201

    # 3. Get Grades for Assessment
    response = test_client.get(f"/api/v1/grades/assessment/{assessment.id}", headers=headers)
    assert response.status_code == 200
    grades = response.json()
    assert len(grades) == 1
    assert grades[0]["score_achieved"] == 95.5
