
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User as UserModel
from app.models.school import School as SchoolModel
from app.core.security import create_access_token, hash_password
import uuid

def test_user_crud_flow(test_client: TestClient, db_session: Session):
    # 1. Setup: Create school and admin user
    school = SchoolModel(name="Test School 32", code="TEST32")
    db_session.add(school)
    db_session.commit()

    admin_user = UserModel(
        username="test_admin_user32",
        email="test_admin_user32@test.com",
        password_hash=hash_password("test_password"),
        role="ADMIN",
        school_id=school.id,
        is_verified=True
    )
    db_session.add(admin_user)
    db_session.commit()

    token_data = {"sub": admin_user.email, "role": "ADMIN", "school_id": str(school.id)}
    token = create_access_token(data=token_data)
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create User
    user_data = {
        "username": "new_user",
        "email": "new_user@test.com",
        "password": "new_password",
        "role": "TEACHER",
        "school_id": str(school.id),
    }
    response = test_client.post("/api/v1/users/", headers=headers, json=user_data)
    assert response.status_code == 200
    created_user = response.json()
    user_id = created_user["id"]

    # 3. Read User
    response = test_client.get(f"/api/v1/users/{user_id}", headers=headers)
    assert response.status_code == 200
    read_user = response.json()
    assert read_user["username"] == "new_user"
    assert read_user["email"] == "new_user@test.com"

    # 4. Read Users
    response = test_client.get("/api/v1/users/", headers=headers)
    assert response.status_code == 200
    users = response.json()
    assert any(u["id"] == user_id for u in users)

    # 5. Update User
    update_data = {"username": "updated_user"}
    response = test_client.put(f"/api/v1/users/{user_id}", headers=headers, json=update_data)
    assert response.status_code == 200
    updated_user = response.json()
    assert updated_user["username"] == "updated_user"

    # 6. Read User again to verify update
    response = test_client.get(f"/api/v1/users/{user_id}", headers=headers)
    assert response.status_code == 200
    read_user = response.json()
    assert read_user["username"] == "updated_user"

    # 7. Delete User
    response = test_client.delete(f"/api/v1/users/{user_id}", headers=headers)
    assert response.status_code == 200

    # 8. Verify Deletion
    response = test_client.get(f"/api/v1/users/{user_id}", headers=headers)
    assert response.status_code == 404
