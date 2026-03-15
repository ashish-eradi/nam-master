import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User as UserModel
from app.models.school import School as SchoolModel
from app.models.class_model import Class as ClassModel
from app.models.subject import Subject as SubjectModel
from app.models.exam import Exam as ExamModel
from app.models.student import Student as StudentModel
from app.core.security import create_access_token, hash_password
from datetime import date, time

def test_create_and_read_exams(test_client: TestClient, db_session: Session):
    school = SchoolModel(name="Test School", code="TEST")
    db_session.add(school)
    db_session.commit()

    user = UserModel(
        username="test_user",
        email="test_user@test.com",
        password_hash=hash_password("test_password"),
        role="ADMIN",
        school_id=school.id,
        is_verified=True
    )
    db_session.add(user)
    db_session.commit()

    token_data = {"sub": user.email, "role": "ADMIN", "school_id": str(school.id)}
    token = create_access_token(data=token_data)

    class1 = ClassModel(name="Class 1", section="A", school_id=school.id, academic_year="2025-2026")
    db_session.add(class1)
    db_session.commit()

    subject1 = SubjectModel(name="Math", code="MATH", school_id=school.id, class_id=class1.id)
    db_session.add(subject1)
    db_session.commit()

    exam_data = {
        "name": "Math Midterm",
        "class_id": str(class1.id),
        "subject_id": str(subject1.id),
        "school_id": str(school.id),
        "exam_date": str(date.today()),
        "start_time": str(time(9, 0)),
        "duration_minutes": 90,
        "max_marks": 100,
        "academic_year": "2025-2026",
    }

    response = test_client.post("/api/v1/exams/", headers={"Authorization": f"Bearer {token}"}, json=exam_data)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Math Midterm"
    assert "id" in data

    response = test_client.get("/api/v1/exams/", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == "Math Midterm"

def test_read_update_delete_exam(test_client: TestClient, db_session: Session):
    school = SchoolModel(name="Test School 2", code="TEST2")
    db_session.add(school)
    db_session.commit()

    user = UserModel(
        username="test_user2",
        email="test_user2@test.com",
        password_hash=hash_password("test_password"),
        role="ADMIN",
        school_id=school.id,
        is_verified=True
    )
    db_session.add(user)
    db_session.commit()

    token_data = {"sub": user.email, "role": "ADMIN", "school_id": str(school.id)}
    token = create_access_token(data=token_data)

    class1 = ClassModel(name="Class 1", section="A", school_id=school.id, academic_year="2025-2026")
    db_session.add(class1)
    db_session.commit()

    subject1 = SubjectModel(name="Math", code="MATH", school_id=school.id, class_id=class1.id)
    db_session.add(subject1)
    db_session.commit()

    exam = ExamModel(
        name="Math Midterm",
        class_id=class1.id,
        subject_id=subject1.id,
        school_id=school.id,
        exam_date=date.today(),
        start_time=time(9, 0),
        duration_minutes=90,
        max_marks=100,
        academic_year="2025-2026",
        created_by_user_id=user.id
    )
    db_session.add(exam)
    db_session.commit()

    # Read exam
    response = test_client.get(f"/api/v1/exams/{exam.id}", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Math Midterm"

    # Update exam
    update_data = {"name": "Math Final"}
    response = test_client.put(f"/api/v1/exams/{exam.id}", headers={"Authorization": f"Bearer {token}"}, json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Math Final"

    # Delete exam
    response = test_client.delete(f"/api/v1/exams/{exam.id}", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200

    # Verify delete
    response = test_client.get(f"/api/v1/exams/{exam.id}", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 404

def test_generate_admit_cards(test_client: TestClient, db_session: Session):
    school = SchoolModel(name="Test School 3", code="TEST3")
    db_session.add(school)
    db_session.commit()

    user = UserModel(
        username="test_user3",
        email="test_user3@test.com",
        password_hash=hash_password("test_password"),
        role="ADMIN",
        school_id=school.id,
        is_verified=True
    )
    db_session.add(user)
    db_session.commit()

    token_data = {"sub": user.email, "role": "ADMIN", "school_id": str(school.id)}
    token = create_access_token(data=token_data)

    class1 = ClassModel(name="Class 1", section="A", school_id=school.id, academic_year="2025-2026")
    db_session.add(class1)
    db_session.commit()

    subject1 = SubjectModel(name="Math", code="MATH", school_id=school.id, class_id=class1.id)
    db_session.add(subject1)
    db_session.commit()

    exam = ExamModel(
        name="Math Midterm",
        class_id=class1.id,
        subject_id=subject1.id,
        school_id=school.id,
        exam_date=date.today(),
        start_time=time(9, 0),
        duration_minutes=90,
        max_marks=100,
        academic_year="2025-2026",
        created_by_user_id=user.id
    )
    db_session.add(exam)
    db_session.commit()

    student_user1 = UserModel(username="student1", email="student1@test.com", password_hash=hash_password("password"), role="STUDENT", school_id=school.id, is_verified=True)
    db_session.add(student_user1)
    db_session.commit()
    student1 = StudentModel(user_id=student_user1.id, first_name="John", last_name="Doe", class_id=class1.id, school_id=school.id, admission_number="12345", admission_date=date.today(), date_of_birth=date.today(), gender="Male", academic_year="2025-2026", roll_number="1")
    db_session.add(student1)
    db_session.commit()

    response = test_client.post(f"/api/v1/exams/{exam.id}/admit-cards", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["student_name"] == "John Doe"
    assert data[0]["roll_number"] == "1"