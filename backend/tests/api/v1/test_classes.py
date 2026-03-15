import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User as UserModel
from app.models.school import School as SchoolModel
from app.models.class_model import Class as ClassModel
from app.models.student import Student as StudentModel
from app.core.security import create_access_token, hash_password
import uuid
from app.main import app
from app.core.database import get_db
from datetime import date

def test_create_class(test_client: TestClient, db_session: Session):
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

    response = test_client.post(
        "/api/v1/classes/",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Test Class", "section": "A", "school_id": str(school.id), "academic_year": "2025-2026"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Class"
    assert "id" in data

def test_read_classes(test_client: TestClient, db_session: Session):
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
    class2 = ClassModel(name="Class 2", section="B", school_id=school.id, academic_year="2025-2026")
    db_session.add(class1)
    db_session.add(class2)
    db_session.commit()

    response = test_client.get("/api/v1/classes/", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["name"] == "Class 1"
    assert data[1]["name"] == "Class 2"

def test_read_class(test_client: TestClient, db_session: Session):
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

    response = test_client.get(f"/api/v1/classes/{str(class1.id)}", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Class 1"
    assert data["id"] == str(class1.id)

def test_update_class(test_client: TestClient, db_session: Session):
    school = SchoolModel(name="Test School 4", code="TEST4")
    db_session.add(school)
    db_session.commit()

    user = UserModel(
        username="test_user4",
        email="test_user4@test.com",
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

    response = test_client.put(
        f"/api/v1/classes/{str(class1.id)}",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Updated Class 1"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Class 1"
    assert data["id"] == str(class1.id)

def test_read_students_in_class(test_client: TestClient, db_session: Session):
    school = SchoolModel(name="Test School 5", code="TEST5")
    db_session.add(school)
    db_session.commit()

    user = UserModel(
        username="test_user5",
        email="test_user5@test.com",
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

    response = test_client.get(f"/api/v1/classes/{class1.id}/students", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["first_name"] == "John"
    assert data[1]["first_name"] == "Jane"

def test_delete_class(test_client: TestClient, db_session: Session):
    school = SchoolModel(name="Test School 6", code="TEST6")
    db_session.add(school)
    db_session.commit()

    user = UserModel(
        username="test_user6",
        email="test_user6@test.com",
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

    response = test_client.delete(f"/api/v1/classes/{class1.id}", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Class 1"
    assert data["id"] == str(class1.id)

    response = test_client.get(f"/api/v1/classes/{class1.id}", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 404
