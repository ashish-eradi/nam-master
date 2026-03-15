
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User as UserModel
from app.models.school import School as SchoolModel
from app.models.communication import Message as MessageModel
from app.core.security import create_access_token, hash_password
import uuid

def test_message_flow(test_client: TestClient, db_session: Session):
    # 1. Setup: Create school and two users
    school = SchoolModel(name="Test School 33", code="TEST33")
    db_session.add(school)
    db_session.commit()

    user1 = UserModel(
        username="test_user33_1",
        email="test_user33_1@test.com",
        password_hash=hash_password("test_password"),
        role="TEACHER",
        school_id=school.id,
        is_verified=True
    )
    user2 = UserModel(
        username="test_user33_2",
        email="test_user33_2@test.com",
        password_hash=hash_password("test_password"),
        role="PARENT",
        school_id=school.id,
        is_verified=True
    )
    db_session.add_all([user1, user2])
    db_session.commit()

    token1_data = {"sub": user1.email, "role": "TEACHER", "school_id": str(school.id)}
    token1 = create_access_token(data=token1_data)
    headers1 = {"Authorization": f"Bearer {token1}"}

    token2_data = {"sub": user2.email, "role": "PARENT", "school_id": str(school.id)}
    token2 = create_access_token(data=token2_data)
    headers2 = {"Authorization": f"Bearer {token2}"}

    # 2. User 1 sends a message to User 2
    message_data = {
        "recipient_id": str(user2.id),
        "subject": "Hello",
        "content": "This is a test message."
    }
    response = test_client.post("/api/v1/messages/", headers=headers1, json=message_data)
    assert response.status_code == 200
    created_message = response.json()
    message_id = created_message["id"]

    # 3. User 2 reads the message
    response = test_client.get(f"/api/v1/messages/{message_id}", headers=headers2)
    assert response.status_code == 200
    read_message = response.json()
    assert read_message["subject"] == "Hello"
    assert read_message["content"] == "This is a test message."
    assert not read_message["is_read"]

    # 4. User 2 marks the message as read
    response = test_client.put(f"/api/v1/messages/{message_id}/read", headers=headers2)
    assert response.status_code == 200
    updated_message = response.json()
    assert updated_message["is_read"]

    # 5. User 2 reads their messages and finds the message
    response = test_client.get("/api/v1/messages/", headers=headers2)
    assert response.status_code == 200
    messages = response.json()
    assert any(m["id"] == message_id for m in messages)
