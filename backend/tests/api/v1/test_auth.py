import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User as UserModel
from app.models.school import School as SchoolModel
from app.core.security import hash_password
from app.main import app
from app.core.database import get_db
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.base import Base


@pytest.fixture(scope="module")
def db_engine():
    SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db_session(db_engine):
    connection = db_engine.connect()
    transaction = connection.begin()
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=connection)
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()
        transaction.rollback()
        connection.close()


@pytest.fixture(scope="function")
def test_client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            db_session.close()

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)


def test_register(test_client: TestClient, db_session: Session):
    school = SchoolModel(name="Test School", code="TEST")
    db_session.add(school)
    db_session.commit()
    db_session.refresh(school)

    response = test_client.post(
        "/api/v1/auth/register",
        json={
            "username": "testuser",
            "email": "test@example.com",
            "password": "testpassword",
            "role": "ADMIN",
            "school_id": str(school.id),
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"
    assert "id" in data

    user_in_db = db_session.query(UserModel).filter(UserModel.email == "test@example.com").first()
    assert user_in_db is not None


def test_register_duplicate_email(test_client: TestClient, db_session: Session):
    school = SchoolModel(name="Test School", code="TEST")
    db_session.add(school)
    db_session.commit()
    db_session.refresh(school)

    test_client.post(
        "/api/v1/auth/register",
        json={
            "username": "testuser1",
            "email": "test@example.com",
            "password": "testpassword",
            "role": "ADMIN",
            "school_id": str(school.id),
        },
    )
    db_session.add(school)
    response = test_client.post(
        "/api/v1/auth/register",
        json={
            "username": "testuser2",
            "email": "test@example.com",
            "password": "testpassword",
            "role": "ADMIN",
            "school_id": str(school.id),
        },
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Email already registered"


def test_login(test_client: TestClient, db_session: Session):
    school = SchoolModel(name="Test School", code="TEST")
    db_session.add(school)
    db_session.commit()
    db_session.refresh(school)

    password = "testpassword"
    user = UserModel(
        username="testuser",
        email="test@example.com",
        password_hash=hash_password(password),
        role="ADMIN",
        school_id=school.id,
        is_active=True,
        is_verified=True,
    )
    db_session.add(user)
    db_session.commit()

    response = test_client.post(
        "/api/v1/auth/login",
        json={"email": user.email, "password": password},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


def test_login_incorrect_password(test_client: TestClient, db_session: Session):
    school = SchoolModel(name="Test School", code="TEST")
    db_session.add(school)
    db_session.commit()
    db_session.refresh(school)

    password = "testpassword"
    user = UserModel(
        username="testuser",
        email="test@example.com",
        password_hash=hash_password(password),
        role="ADMIN",
        school_id=school.id,
        is_active=True,
        is_verified=True,
    )
    db_session.add(user)
    db_session.commit()

    response = test_client.post(
        "/api/v1/auth/login",
        json={"email": user.email, "password": "wrongpassword"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect username or password"


def test_login_non_existent_email(test_client: TestClient, db_session: Session):
    response = test_client.post(
        "/api/v1/auth/login",
        json={"email": "nonexistent@example.com", "password": "password"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect username or password"


def test_login_inactive_user(test_client: TestClient, db_session: Session):
    school = SchoolModel(name="Test School", code="TEST")
    db_session.add(school)
    db_session.commit()
    db_session.refresh(school)

    password = "testpassword"
    user = UserModel(
        username="inactiveuser",
        email="inactive@example.com",
        password_hash=hash_password(password),
        role="ADMIN",
        school_id=school.id,
        is_active=False,
        is_verified=True,
    )
    db_session.add(user)
    db_session.commit()

    response = test_client.post(
        "/api/v1/auth/login",
        json={"email": user.email, "password": password},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "User is inactive"


def test_login_unverified_user(test_client: TestClient, db_session: Session):
    school = SchoolModel(name="Test School", code="TEST")
    db_session.add(school)
    db_session.commit()
    db_session.refresh(school)

    password = "testpassword"
    user = UserModel(
        username="unverifieduser",
        email="unverified@example.com",
        password_hash=hash_password(password),
        role="ADMIN",
        school_id=school.id,
        is_active=True,
        is_verified=False,
    )
    db_session.add(user)
    db_session.commit()

    response = test_client.post(
        "/api/v1/auth/login",
        json={"email": user.email, "password": password},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "User is not verified"


def test_refresh_token(test_client: TestClient, db_session: Session):
    school = SchoolModel(name="Test School", code="TEST")
    db_session.add(school)
    db_session.commit()
    db_session.refresh(school)

    password = "testpassword"
    user = UserModel(
        username="testuser",
        email="test@example.com",
        password_hash=hash_password(password),
        role="ADMIN",
        school_id=school.id,
        is_active=True,
        is_verified=True,
    )
    db_session.add(user)
    db_session.commit()

    login_response = test_client.post(
        "/api/v1/auth/login",
        json={"email": user.email, "password": password},
    )
    refresh_token = login_response.json()["refresh_token"]

    refresh_response = test_client.post(
        f"/api/v1/auth/refresh?refresh_token={refresh_token}"
    )
    assert refresh_response.status_code == 200
    data = refresh_response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_refresh_token_invalid(test_client: TestClient):
    response = test_client.post("/api/v1/auth/refresh?refresh_token=invalidtoken")
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid refresh token"