
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User as UserModel
from app.models.school import School as SchoolModel
from app.models.student import Student as StudentModel
from app.models.parent import Parent as ParentModel, ParentStudentRelation as ParentStudentRelationModel
from app.models.class_model import Class as ClassModel
from app.core.security import create_access_token, hash_password
from datetime import date
import uuid

def test_parent_flow(test_client: TestClient, db_session: Session):
    # 1. Setup: Create school, admin, student, and parent users
    school = SchoolModel(name="Test School 35", code="TEST35")
    db_session.add(school)
    db_session.commit()

    admin_user = UserModel(
        username="test_admin_user35",
        email="test_admin_user35@test.com",
        password_hash=hash_password("test_password"),
        role="ADMIN",
        school_id=school.id,
        is_verified=True
    )
    db_session.add(admin_user)
    db_session.commit()

    parent_user = UserModel(
        username="test_parent_user35",
        email="test_parent_user35@test.com",
        password_hash=hash_password("test_password"),
        role="PARENT",
        school_id=school.id,
        is_verified=True
    )
    db_session.add(parent_user)
    db_session.commit()

    class_ = ClassModel(name="Test Class 35", section="A", school_id=school.id, academic_year="2025-2026")
    db_session.add(class_)
    db_session.commit()

    student_user = UserModel(
        username="test_student_user35",
        email="test_student_user35@test.com",
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
        admission_number="12345678901",
        admission_date=date.today(),
        school_id=school.id,
        date_of_birth=date.today(),
        gender="Male",
        class_id=class_.id,
        academic_year="2025-2026",
    )
    db_session.add(student)
    db_session.commit()

    token_data = {"sub": admin_user.email, "role": "ADMIN", "school_id": str(school.id)}
    token = create_access_token(data=token_data)
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Parent
    parent_data = {
        "user_id": str(parent_user.id),
        "school_id": str(school.id)
    }
    response = test_client.post("/api/v1/parents/", headers=headers, json=parent_data)
    assert response.status_code == 200
    created_parent = response.json()
    parent_id = created_parent["id"]

    # 3. Read Parents
    response = test_client.get("/api/v1/parents/", headers=headers)
    assert response.status_code == 200
    parents = response.json()
    assert any(p["id"] == parent_id for p in parents)

    # 4. Link Student to Parent
    link_data = {
        "parent_id": parent_id,
        "student_id": str(student.id),
        "relationship_type": "Father"
    }
    response = test_client.post("/api/v1/parents/link-student", headers=headers, json=link_data)
    assert response.status_code == 200
    link = response.json()
    assert link["parent_id"] == parent_id
    assert link["student_id"] == str(student.id)
