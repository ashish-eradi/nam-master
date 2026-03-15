import pytest
import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.school import School as SchoolModel
from app.models.student import Student as StudentModel
from app.models.user import User as UserModel
from app.models.class_model import Class as ClassModel
from faker import Faker
from app.core.security import hash_password
from app.main import app
from app.core.database import get_db
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.base import Base
from datetime import date

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
        username="admin_user",
        email="admin@test.com",
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
    return test_client


def test_student_crud_flow(authenticated_client: TestClient, db_session: Session):
    # 1. Create a class for the student
    school_id = db_session.query(SchoolModel).first().id
    class_ = ClassModel(name="Test Class", section="A", school_id=school_id, academic_year="2025-2026")
    db_session.add(class_)
    db_session.commit()
    db_session.refresh(class_)

    # 2. Create a student
    email = fake.email()
    admission_number = fake.unique.pystr(min_chars=8, max_chars=8)
    student_data = {
        "email": email,
        "password": "testpassword",
        "first_name": "John",
        "last_name": "Doe",
        "admission_number": admission_number,
        "admission_date": str(date.today()),
        "school_id": str(school_id),
        "date_of_birth": str(date.today()),
        "gender": "Male",
        "class_id": str(class_.id),
        "academic_year": "2025-2026",
    }
    response = authenticated_client.post("/api/v1/students/", json=student_data)
    assert response.status_code == 200
    created_student = response.json()
    assert created_student["email"] == email
    student_id = created_student["id"]

    # 3. Read the student
    response = authenticated_client.get(f"/api/v1/students/{student_id}")
    assert response.status_code == 200
    read_student = response.json()
    assert read_student["first_name"] == "John"

    # 4. Update the student
    update_data = {"first_name": "Jane"}
    response = authenticated_client.put(f"/api/v1/students/{student_id}", json=update_data)
    assert response.status_code == 200
    updated_student = response.json()
    assert updated_student["first_name"] == "Jane"

    # 5. Read all students
    response = authenticated_client.get("/api/v1/students/")
    assert response.status_code == 200
    assert len(response.json()) > 0

    # 6. Delete the student
    response = authenticated_client.delete(f"/api/v1/students/{student_id}")
    assert response.status_code == 200

    # 7. Verify the student is deleted
    response = authenticated_client.get(f"/api/v1/students/{student_id}")
    assert response.status_code == 404

def test_create_student_duplicate_email(authenticated_client: TestClient, db_session: Session):
    # 1. Create a class for the student
    school_id = db_session.query(SchoolModel).first().id
    class_ = ClassModel(name="Test Class", section="A", school_id=school_id, academic_year="2025-2026")
    db_session.add(class_)
    db_session.commit()
    db_session.refresh(class_)
    class_id = class_.id

    # 2. Create a student
    email = fake.email()
    admission_number = fake.unique.pystr(min_chars=8, max_chars=8)
    student_data = {
        "email": email,
        "password": "testpassword",
        "first_name": "John",
        "last_name": "Doe",
        "admission_number": admission_number,
        "admission_date": str(date.today()),
        "school_id": str(school_id),
        "date_of_birth": str(date.today()),
        "gender": "Male",
        "class_id": str(class_id),
        "academic_year": "2025-2026",
    }
    response = authenticated_client.post("/api/v1/students/", json=student_data)
    assert response.status_code == 200

    # 3. Try to create another student with the same email
    admission_number_2 = fake.unique.pystr(min_chars=8, max_chars=8)
    student_data_2 = {
        "email": email,
        "password": "testpassword",
        "first_name": "Jane",
        "last_name": "Doe",
        "admission_number": admission_number_2,
        "admission_date": str(date.today()),
        "school_id": str(school_id),
        "date_of_birth": str(date.today()),
        "gender": "Female",
        "class_id": str(class_id),
        "academic_year": "2025-2026",
    }
    response = authenticated_client.post("/api/v1/students/", json=student_data_2)
    assert response.status_code == 400