import pytest
import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.school import School as SchoolModel
from faker import Faker
from app.core.security import hash_password
from app.models.user import User as UserModel
from app.main import app
from app.core.database import get_db
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.base import Base

fake = Faker()


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


@pytest.fixture(scope="function")
def authenticated_client(test_client, db_session):
    school = SchoolModel(name="Test School", code="TEST")
    db_session.add(school)
    db_session.commit()
    db_session.refresh(school)

    password = "testpassword"
    user = UserModel(
        username="superadmin_user",
        email="superadmin@test.com",
        password_hash=hash_password(password),
        role="SUPERADMIN",
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
    token = response.json()["access_token"]
    test_client.headers["Authorization"] = f"Bearer {token}"
    return test_client


def test_create_school(authenticated_client: TestClient, db_session: Session):
    code = fake.unique.pystr(min_chars=4, max_chars=4)
    response = authenticated_client.post(
        "/api/v1/schools/",
        json={"name": "New School", "code": code},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "New School"
    assert data["code"] == code
    assert "id" in data

    school_in_db = db_session.query(SchoolModel).filter(SchoolModel.id == uuid.UUID(data["id"])).first()
    assert school_in_db is not None

def test_read_schools(authenticated_client: TestClient, db_session: Session):
    code = fake.unique.pystr(min_chars=4, max_chars=4)
    school = SchoolModel(name="Test School", code=code)
    db_session.add(school)
    db_session.commit()

    response = authenticated_client.get("/api/v1/schools/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0

def test_read_school(authenticated_client: TestClient, db_session: Session):
    code = fake.unique.pystr(min_chars=4, max_chars=4)
    school = SchoolModel(name="Test School", code=code)
    db_session.add(school)
    db_session.commit()
    db_session.refresh(school)

    response = authenticated_client.get(f"/api/v1/schools/{str(school.id)}")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test School"

def test_update_school(authenticated_client: TestClient, db_session: Session):
    code = fake.unique.pystr(min_chars=4, max_chars=4)
    school = SchoolModel(name="Test School", code=code)
    db_session.add(school)
    db_session.commit()
    db_session.refresh(school)

    db_session.add(school)
    response = authenticated_client.put(
        f"/api/v1/schools/{str(school.id)}",
        json={"name": "Updated School", "code": code},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated School"

def test_create_school_duplicate_code(authenticated_client: TestClient, db_session: Session):
    code = fake.unique.pystr(min_chars=4, max_chars=4)
    school = SchoolModel(name="Test School", code=code)
    db_session.add(school)
    db_session.commit()

    response = authenticated_client.post(
        "/api/v1/schools/",
        json={"name": "Another School", "code": code},
    )
    assert response.status_code == 400

def test_read_non_existent_school(authenticated_client: TestClient):
    response = authenticated_client.get(f"/api/v1/schools/{uuid.uuid4()}")
    assert response.status_code == 404

def test_update_non_existent_school(authenticated_client: TestClient):
    response = authenticated_client.put(
        f"/api/v1/schools/{uuid.uuid4()}",
        json={"name": "Updated School", "code": "NEWSCHOOL"},
    )
    assert response.status_code == 404

def test_delete_school(authenticated_client: TestClient, db_session: Session):
    code = fake.unique.pystr(min_chars=4, max_chars=4)
    school = SchoolModel(name="Test School", code=code)
    db_session.add(school)
    db_session.commit()
    db_session.refresh(school)

    response = authenticated_client.delete(f"/api/v1/schools/{str(school.id)}")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test School"

    school_in_db = db_session.query(SchoolModel).filter(SchoolModel.id == school.id).first()
    assert school_in_db is None

def test_delete_non_existent_school(authenticated_client: TestClient):
    response = authenticated_client.delete(f"/api/v1/schools/{uuid.uuid4()}")
    assert response.status_code == 404

def test_unauthorized_access(test_client: TestClient, db_session: Session):
    # Create a non-superadmin user
    school = SchoolModel(name="Test School", code="TEST")
    db_session.add(school)
    db_session.commit()
    db_session.refresh(school)

    password = "testpassword"
    user = UserModel(
        username="test_user",
        email="test@test.com",
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
    token = response.json()["access_token"]
    test_client.headers["Authorization"] = f"Bearer {token}"

    response = test_client.get("/api/v1/schools/")
    assert response.status_code == 403

    response = test_client.post("/api/v1/schools/", json={"name": "New School", "code": "NEWSCHOOL"})
    assert response.status_code == 403

    response = test_client.get(f"/api/v1/schools/{uuid.uuid4()}")
    assert response.status_code == 403

    response = test_client.put(f"/api/v1/schools/{uuid.uuid4()}", json={"name": "Updated School"})
    assert response.status_code == 403

    response = test_client.delete(f"/api/v1/schools/{uuid.uuid4()}")
    assert response.status_code == 403