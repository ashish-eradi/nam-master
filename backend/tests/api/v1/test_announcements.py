from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User as UserModel
from app.models.school import School as SchoolModel
from app.models.communication import Announcement
from app.core.security import create_access_token, hash_password
import uuid

def test_create_announcement(test_client: TestClient, db_session: Session):
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
        "/api/v1/announcements/",
        headers={"Authorization": f"Bearer {token}"},
        json={"title": "Test Announcement", "content": "This is a test announcement.", "school_id": str(school.id)}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Test Announcement"
    assert data["content"] == "This is a test announcement."
    assert "id" in data
    # Clean up the created announcement
    announcement = db_session.query(Announcement).filter(Announcement.id == uuid.UUID(data["id"])).first()
    db_session.delete(announcement)
    db_session.commit()