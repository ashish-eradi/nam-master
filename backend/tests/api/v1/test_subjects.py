import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User as UserModel
from app.models.school import School as SchoolModel
from app.models.subject import Subject as SubjectModel
from app.core.security import create_access_token, hash_password

def test_read_update_delete_subject(test_client: TestClient, db_session: Session):
    school = SchoolModel(name="Test School 26", code="TEST26")
    db_session.add(school)
    db_session.commit()

    user = UserModel(
        username="test_admin_user26",
        email="test_admin_user26@test.com",
        password_hash=hash_password("test_password"),
        role="ADMIN",
        school_id=school.id,
        is_verified=True
    )
    db_session.add(user)
    db_session.commit()

    token_data = {"sub": user.email, "role": "ADMIN", "school_id": str(school.id)}
    token = create_access_token(data=token_data)

    subject = SubjectModel(
        name="Test Subject",
        code="TS101",
        school_id=school.id,
    )
    db_session.add(subject)
    db_session.commit()

    response = test_client.get(f"/api/v1/subjects/{subject.id}", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Subject"

    update_data = {"name": "Updated Test Subject", "code": "TS101"}
    response = test_client.put(f"/api/v1/subjects/{subject.id}", headers={"Authorization": f"Bearer {token}"}, json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Test Subject"

    response = test_client.delete(f"/api/v1/subjects/{subject.id}", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200

    response = test_client.get(f"/api/v1/subjects/{subject.id}", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 404
