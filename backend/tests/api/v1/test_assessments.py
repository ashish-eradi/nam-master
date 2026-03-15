import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User as UserModel
from app.models.school import School as SchoolModel
from app.models.assessment import Assessment as AssessmentModel, AssessmentType as AssessmentTypeModel
from app.core.security import create_access_token, hash_password
import uuid

def test_create_assessment_type(test_client: TestClient, db_session: Session):
    school = SchoolModel(name="Test School", code="TEST")
    db_session.add(school)
    db_session.commit()
    db_session.refresh(school)

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
    db_session.refresh(user)

    token_data = {"sub": user.email, "role": "ADMIN", "school_id": str(school.id)}
    token = create_access_token(data=token_data)

    response = test_client.post(
        "/api/v1/assessments/types",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Test Assessment Type", "school_id": str(school.id)}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Assessment Type"
    assert "id" in data

def test_read_assessment_types(test_client: TestClient, db_session: Session):
    school = SchoolModel(name="Test School", code="TEST")
    db_session.add(school)
    db_session.commit()
    db_session.refresh(school)

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
    db_session.refresh(user)

    token_data = {"sub": user.email, "role": "ADMIN", "school_id": str(school.id)}
    token = create_access_token(data=token_data)

    assessment_type = AssessmentTypeModel(name="Test Assessment Type", school_id=school.id)
    db_session.add(assessment_type)
    db_session.commit()
    db_session.refresh(assessment_type)

    response = test_client.get(
        "/api/v1/assessments/types",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    assert data[0]["name"] == "Test Assessment Type"

def test_update_assessment_type(test_client: TestClient, db_session: Session):
    school = SchoolModel(name="Test School", code="TEST")
    db_session.add(school)
    db_session.commit()
    db_session.refresh(school)

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
    db_session.refresh(user)

    token_data = {"sub": user.email, "role": "ADMIN", "school_id": str(school.id)}
    token = create_access_token(data=token_data)

    assessment_type = AssessmentTypeModel(name="Test Assessment Type", school_id=school.id)
    db_session.add(assessment_type)
    db_session.commit()
    db_session.refresh(assessment_type)

    response = test_client.put(
        f"/api/v1/assessments/types/{str(assessment_type.id)}",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Updated Assessment Type"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Assessment Type"

def test_delete_assessment_type(test_client: TestClient, db_session: Session):
    school = SchoolModel(name="Test School", code="TEST")
    db_session.add(school)
    db_session.commit()
    db_session.refresh(school)

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
    db_session.refresh(user)

    token_data = {"sub": user.email, "role": "ADMIN", "school_id": str(school.id)}
    token = create_access_token(data=token_data)

    assessment_type = AssessmentTypeModel(name="Test Assessment Type", school_id=school.id)
    db_session.add(assessment_type)
    db_session.commit()
    db_session.refresh(assessment_type)

    response = test_client.delete(
        f"/api/v1/assessments/types/{str(assessment_type.id)}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 204

def test_read_assessments(test_client: TestClient, db_session: Session):
    school = SchoolModel(name="Test School", code="TEST")
    db_session.add(school)
    db_session.commit()
    db_session.refresh(school)

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
    db_session.refresh(user)

    token_data = {"sub": user.email, "role": "ADMIN", "school_id": str(school.id)}
    token = create_access_token(data=token_data)

    assessment = AssessmentModel(name="Test Assessment", school_id=school.id, assessment_type_id=uuid.uuid4(), class_id=uuid.uuid4(), subject_id=uuid.uuid4(), max_marks=100, academic_year="2025-2026", teacher_id=user.id)
    db_session.add(assessment)
    db_session.commit()
    db_session.refresh(assessment)

    response = test_client.get(
        "/api/v1/assessments/",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    assert data[0]["name"] == "Test Assessment"

def test_create_assessment(test_client: TestClient, db_session: Session):
    school = SchoolModel(name="Test School", code="TEST")
    db_session.add(school)
    db_session.commit()
    db_session.refresh(school)

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
    db_session.refresh(user)

    token_data = {"sub": user.email, "role": "ADMIN", "school_id": str(school.id)}
    token = create_access_token(data=token_data)

    assessment_type = AssessmentTypeModel(name="Test Assessment Type", school_id=school.id)
    db_session.add(assessment_type)
    db_session.commit()
    db_session.refresh(assessment_type)

    response = test_client.post(
        "/api/v1/assessments/",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Test Assessment", "school_id": str(school.id), "assessment_type_id": str(assessment_type.id), "class_id": str(uuid.uuid4()), "subject_id": str(uuid.uuid4()), "max_marks": 100, "academic_year": "2025-2026", "teacher_id": str(user.id)}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Assessment"
    assert "id" in data

def test_read_assessment(test_client: TestClient, db_session: Session):
    school = SchoolModel(name="Test School", code="TEST")
    db_session.add(school)
    db_session.commit()
    db_session.refresh(school)

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
    db_session.refresh(user)

    token_data = {"sub": user.email, "role": "ADMIN", "school_id": str(school.id)}
    token = create_access_token(data=token_data)

    assessment = AssessmentModel(name="Test Assessment", school_id=school.id, assessment_type_id=uuid.uuid4(), class_id=uuid.uuid4(), subject_id=uuid.uuid4(), max_marks=100, academic_year="2025-2026", teacher_id=user.id)
    db_session.add(assessment)
    db_session.commit()
    db_session.refresh(assessment)

    response = test_client.get(
        f"/api/v1/assessments/{str(assessment.id)}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Assessment"

def test_update_assessment(test_client: TestClient, db_session: Session):
    school = SchoolModel(name="Test School", code="TEST")
    db_session.add(school)
    db_session.commit()
    db_session.refresh(school)

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
    db_session.refresh(user)

    token_data = {"sub": user.email, "role": "ADMIN", "school_id": str(school.id)}
    token = create_access_token(data=token_data)

    assessment = AssessmentModel(name="Test Assessment", school_id=school.id, assessment_type_id=uuid.uuid4(), class_id=uuid.uuid4(), subject_id=uuid.uuid4(), max_marks=100, academic_year="2025-2026", teacher_id=user.id)
    db_session.add(assessment)
    db_session.commit()
    db_session.refresh(assessment)

    response = test_client.put(
        f"/api/v1/assessments/{str(assessment.id)}",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Updated Assessment", "assessment_type_id": str(assessment.assessment_type_id), "class_id": str(assessment.class_id), "subject_id": str(assessment.subject_id), "max_marks": 100, "academic_year": "2025-2026"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Assessment"

def test_delete_assessment(test_client: TestClient, db_session: Session):
    school = SchoolModel(name="Test School", code="TEST")
    db_session.add(school)
    db_session.commit()
    db_session.refresh(school)

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
    db_session.refresh(user)

    token_data = {"sub": user.email, "role": "ADMIN", "school_id": str(school.id)}
    token = create_access_token(data=token_data)

    assessment = AssessmentModel(name="Test Assessment", school_id=school.id, assessment_type_id=uuid.uuid4(), class_id=uuid.uuid4(), subject_id=uuid.uuid4(), max_marks=100, academic_year="2025-2026", teacher_id=user.id)
    db_session.add(assessment)
    db_session.commit()
    db_session.refresh(assessment)

    response = test_client.delete(
        f"/api/v1/assessments/{str(assessment.id)}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 204








