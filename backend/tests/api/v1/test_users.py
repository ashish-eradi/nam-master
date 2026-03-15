import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User as UserModel
from app.models.school import School as SchoolModel
from app.core.security import create_access_token, hash_password

def test_read_and_update_user_profile(test_client: TestClient, db_session: Session):
    school = SchoolModel(name="Test School 24", code="TEST24")
    db_session.add(school)
    db_session.commit()

    user = UserModel(
        username="test_user24",
        email="test_user24@test.com",
        password_hash=hash_password("test_password"),
        role="STUDENT",
        school_id=school.id,
        is_verified=True
    )
    db_session.add(user)
    db_session.commit()

    token_data = {"sub": user.email, "role": "STUDENT", "school_id": str(school.id)}
    token = create_access_token(data=token_data)

    response = test_client.get("/api/v1/users/profile/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "test_user24"

    update_data = {"username": "updated_user24"}
    response = test_client.put("/api/v1/users/profile/me", headers={"Authorization": f"Bearer {token}"}, json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "updated_user24"
