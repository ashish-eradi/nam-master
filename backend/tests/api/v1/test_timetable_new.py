import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User as UserModel
from app.models.school import School as SchoolModel
from app.models.timetable import Period as PeriodModel, TimetableEntry as TimetableEntryModel
from app.models.class_model import Class as ClassModel
from app.models.subject import Subject as SubjectModel
from app.models.teacher import Teacher as TeacherModel
from app.core.security import create_access_token, hash_password
from app.main import app
from app.core.database import get_db
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.base import Base
import uuid
from datetime import time

# Setup fixtures (similar to test_auth.py and test_schools.py)
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
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()

@pytest.fixture
def create_test_user(db_session):
    def _create_test_user(role: str, school: SchoolModel, email: str = "test@test.com", username: str = "testuser"):
        user = UserModel(
            username=username,
            email=email,
            password_hash=hash_password("testpassword"),
            role=role,
            school_id=school.id,
            is_active=True,
            is_verified=True,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user
    return _create_test_user

@pytest.fixture
def get_auth_token():
    def _get_auth_token(client: TestClient, email: str, password: str = "testpassword"):
        response = client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": password},
        )
        return response.json()["access_token"]
    return _get_auth_token

@pytest.fixture
def create_school(db_session):
    def _create_school(name: str = "Test School", code: str = "TS1"):
        school = SchoolModel(name=name, code=code)
        db_session.add(school)
        db_session.commit()
        db_session.refresh(school)
        return school
    return _create_school

@pytest.fixture
def create_class_fixture(db_session):
    def _create_class(school: SchoolModel, name: str = "Class 1", section: str = "A", academic_year: str = "2025-2026"):
        class_obj = ClassModel(name=name, section=section, school_id=school.id, academic_year=academic_year)
        db_session.add(class_obj)
        db_session.commit()
        db_session.refresh(class_obj)
        return class_obj
    return _create_class

@pytest.fixture
def create_subject_fixture(db_session):
    def _create_subject(school: SchoolModel, name: str = "Math", code: str = "MA101"):
        subject = SubjectModel(name=name, code=code, school_id=school.id)
        db_session.add(subject)
        db_session.commit()
        db_session.refresh(subject)
        return subject
    return _create_subject

@pytest.fixture
def create_teacher_fixture(db_session, create_test_user):
    def _create_teacher(school: SchoolModel, email: str = "teacher@test.com", username: str = "teacheruser"):
        user = create_test_user(role="TEACHER", school=school, email=email, username=username)
        teacher = TeacherModel(user_id=user.id, employee_id=f"EMP-{uuid.uuid4().hex[:8]}", school_id=school.id)
        db_session.add(teacher)
        db_session.commit()
        db_session.refresh(teacher)
        return teacher
    return _create_teacher

# Tests for Periods
def test_create_period(test_client: TestClient, db_session: Session, create_school, create_test_user, get_auth_token):
    school = create_school()
    admin_user = create_test_user(role="ADMIN", school=school, email="admin@test.com")
    admin_token = get_auth_token(test_client, admin_user.email)

    response = test_client.post(
        "/api/v1/timetable/periods",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"school_id": str(school.id), "period_number": 1, "start_time": "09:00:00", "end_time": "09:45:00"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["period_number"] == 1
    assert data["start_time"] == "09:00:00"
    assert data["end_time"] == "09:45:00"
    assert "id" in data

def test_create_period_unauthorized(test_client: TestClient, db_session: Session, create_school, create_test_user, get_auth_token):
    school = create_school()
    teacher_user = create_test_user(role="TEACHER", school=school, email="teacher@test.com")
    teacher_token = get_auth_token(test_client, teacher_user.email)

    response = test_client.post(
        "/api/v1/timetable/periods",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json={"school_id": str(school.id), "period_number": 2, "start_time": "10:00:00", "end_time": "10:45:00"}
    )
    assert response.status_code == 403

def test_read_periods(test_client: TestClient, db_session: Session, create_school, create_test_user, get_auth_token):
    school = create_school(name="School A", code="SA1")
    admin_user = create_test_user(role="ADMIN", school=school, email="adminA@test.com")
    admin_token = get_auth_token(test_client, admin_user.email)

    period1 = PeriodModel(school_id=school.id, period_number=1, start_time=time(9,0,0), end_time=time(9,45,0))
    period2 = PeriodModel(school_id=school.id, period_number=2, start_time=time(10,0,0), end_time=time(10,45,0))
    db_session.add(period1)
    db_session.add(period2)
    db_session.commit()

    response = test_client.get(
        "/api/v1/timetable/periods",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["period_number"] == 1
    assert data[1]["period_number"] == 2

def test_read_periods_multi_tenancy(test_client: TestClient, db_session: Session, create_school, create_test_user, get_auth_token):
    school_a = create_school(name="School A", code="SA2")
    school_b = create_school(name="School B", code="SB1")

    admin_a = create_test_user(role="ADMIN", school=school_a, email="admin_a@test.com")
    admin_a_token = get_auth_token(test_client, admin_a.email)

    period_a = PeriodModel(school_id=school_a.id, period_number=1, start_time=time(9,0,0), end_time=time(9,45,0))
    period_b = PeriodModel(school_id=school_b.id, period_number=1, start_time=time(9,0,0), end_time=time(9,45,0))
    db_session.add(period_a)
    db_session.add(period_b)
    db_session.commit()

    response = test_client.get(
        "/api/v1/timetable/periods",
        headers={"Authorization": f"Bearer {admin_a_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["school_id"] == str(school_a.id)

def test_update_period(test_client: TestClient, db_session: Session, create_school, create_test_user, get_auth_token):
    school = create_school(name="School C", code="SC1")
    admin_user = create_test_user(role="ADMIN", school=school, email="adminC@test.com")
    admin_token = get_auth_token(test_client, admin_user.email)

    period = PeriodModel(school_id=school.id, period_number=1, start_time=time(9,0,0), end_time=time(9,45,0))
    db_session.add(period)
    db_session.commit()
    db_session.refresh(period)

    response = test_client.put(
        f"/api/v1/timetable/periods/{period.id}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"end_time": "10:00:00"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["end_time"] == "10:00:00"

def test_delete_period(test_client: TestClient, db_session: Session, create_school, create_test_user, get_auth_token):
    school = create_school(name="School D", code="SD1")
    admin_user = create_test_user(role="ADMIN", school=school, email="adminD@test.com")
    admin_token = get_auth_token(test_client, admin_user.email)

    period = PeriodModel(school_id=school.id, period_number=1, start_time=time(9,0,0), end_time=time(9,45,0))
    db_session.add(period)
    db_session.commit()
    db_session.refresh(period)

    response = test_client.delete(
        f"/api/v1/timetable/periods/{period.id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 204

    response = test_client.get(
        "/api/v1/timetable/periods",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert period.id not in [p['id'] for p in data]

# Tests for Timetable Entries
def test_create_timetable_entry(test_client: TestClient, db_session: Session, create_school, create_test_user, get_auth_token, create_class_fixture, create_subject_fixture, create_teacher_fixture):
    school = create_school(name="School E", code="SE1")
    admin_user = create_test_user(role="ADMIN", school=school, email="adminE@test.com")
    admin_token = get_auth_token(test_client, admin_user.email)
    
    class_obj = create_class_fixture(school=school)
    subject_obj = create_subject_fixture(school=school)
    teacher_obj = create_teacher_fixture(school=school)
    
    period = PeriodModel(school_id=school.id, period_number=1, start_time=time(9,0,0), end_time=time(9,45,0))
    db_session.add(period)
    db_session.commit()
    db_session.refresh(period)

    response = test_client.post(
        "/api/v1/timetable/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "class_id": str(class_obj.id),
            "subject_id": str(subject_obj.id),
            "teacher_id": str(teacher_obj.id),
            "period_id": str(period.id),
            "day_of_week": 1,
            "school_id": str(school.id),
            "academic_year": "2025-2026"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["day_of_week"] == 1
    assert data["class_id"] == str(class_obj.id)

def test_create_timetable_entry_teacher_conflict(test_client: TestClient, db_session: Session, create_school, create_test_user, get_auth_token, create_class_fixture, create_subject_fixture, create_teacher_fixture):
    school = create_school(name="School F", code="SF1")
    admin_user = create_test_user(role="ADMIN", school=school, email="adminF@test.com")
    admin_token = get_auth_token(test_client, admin_user.email)
    
    class_obj1 = create_class_fixture(school=school, name="Class X")
    class_obj2 = create_class_fixture(school=school, name="Class Y")
    subject_obj = create_subject_fixture(school=school)
    teacher_obj = create_teacher_fixture(school=school)
    
    period = PeriodModel(school_id=school.id, period_number=1, start_time=time(9,0,0), end_time=time(9,45,0))
    db_session.add(period)
    db_session.commit()
    db_session.refresh(period)

    # First entry
    test_client.post(
        "/api/v1/timetable/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "class_id": str(class_obj1.id),
            "subject_id": str(subject_obj.id),
            "teacher_id": str(teacher_obj.id),
            "period_id": str(period.id),
            "day_of_week": 1,
            "school_id": str(school.id),
            "academic_year": "2025-2026"
        }
    )

    # Second entry with same teacher, period, day
    response = test_client.post(
        "/api/v1/timetable/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "class_id": str(class_obj2.id),
            "subject_id": str(subject_obj.id),
            "teacher_id": str(teacher_obj.id),
            "period_id": str(period.id),
            "day_of_week": 1,
            "school_id": str(school.id),
            "academic_year": "2025-2026"
        }
    )
    assert response.status_code == 409
    assert response.json()["detail"] == "Teacher is already booked for this period."
def test_create_timetable_entry_class_conflict(test_client: TestClient, db_session: Session, create_school, create_test_user, get_auth_token, create_class_fixture, create_subject_fixture, create_teacher_fixture):
    school = create_school(name="School G", code="SG1")
    admin_user = create_test_user(role="ADMIN", school=school, email="adminG@test.com")
    admin_token = get_auth_token(test_client, admin_user.email)
    
    class_obj = create_class_fixture(school=school)
    subject_obj1 = create_subject_fixture(school=school, name="Physics")
    subject_obj2 = create_subject_fixture(school=school, name="Chemistry")
    teacher_obj1 = create_teacher_fixture(school=school, email="teacher1@test.com", username="teacher1")
    teacher_obj2 = create_teacher_fixture(school=school, email="teacher2@test.com", username="teacher2")
    
    period = PeriodModel(school_id=school.id, period_number=1, start_time=time(9,0,0), end_time=time(9,45,0))
    db_session.add(period)
    db_session.commit()
    db_session.refresh(period)

    # First entry
    test_client.post(
        "/api/v1/timetable/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "class_id": str(class_obj.id),
            "subject_id": str(subject_obj1.id),
            "teacher_id": str(teacher_obj1.id),
            "period_id": str(period.id),
            "day_of_week": 1,
            "school_id": str(school.id),
            "academic_year": "2025-2026"
        }
    )

    # Second entry with same class, period, day
    response = test_client.post(
        "/api/v1/timetable/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "class_id": str(class_obj.id),
            "subject_id": str(subject_obj2.id),
            "teacher_id": str(teacher_obj2.id),
            "period_id": str(period.id),
            "day_of_week": 1,
            "school_id": str(school.id),
            "academic_year": "2025-2026"
        }
    )
    assert response.status_code == 409
    assert response.json()["detail"] == "Class is already scheduled for this period."
def test_read_class_timetable(test_client: TestClient, db_session: Session, create_school, create_test_user, get_auth_token, create_class_fixture, create_subject_fixture, create_teacher_fixture):
    school = create_school(name="School H", code="SH1")
    admin_user = create_test_user(role="ADMIN", school=school, email="adminH@test.com")
    admin_token = get_auth_token(test_client, admin_user.email)
    
    class_obj = create_class_fixture(school=school)
    subject_obj = create_subject_fixture(school=school)
    teacher_obj = create_teacher_fixture(school=school)
    
    period = PeriodModel(school_id=school.id, period_number=1, start_time=time(9,0,0), end_time=time(9,45,0))
    db_session.add(period)
    db_session.commit()
    db_session.refresh(period)

    entry = TimetableEntryModel(
        class_id=class_obj.id,
        subject_id=subject_obj.id,
        teacher_id=teacher_obj.id,
        period_id=period.id,
        day_of_week=1,
        school_id=school.id,
        academic_year="2025-2026"
    )
    db_session.add(entry)
    db_session.commit()

    response = test_client.get(
        f"/api/v1/timetable/class/{class_obj.id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["class_id"] == str(class_obj.id)

def test_update_timetable_entry(test_client: TestClient, db_session: Session, create_school, create_test_user, get_auth_token, create_class_fixture, create_subject_fixture, create_teacher_fixture):
    school = create_school(name="School I", code="SI1")
    admin_user = create_test_user(role="ADMIN", school=school, email="adminI@test.com")
    admin_token = get_auth_token(test_client, admin_user.email)
    
    class_obj = create_class_fixture(school=school)
    subject_obj = create_subject_fixture(school=school)
    teacher_obj = create_teacher_fixture(school=school)
    
    period = PeriodModel(school_id=school.id, period_number=1, start_time=time(9,0,0), end_time=time(9,45,0))
    db_session.add(period)
    db_session.commit()
    db_session.refresh(period)

    entry = TimetableEntryModel(
        class_id=class_obj.id,
        subject_id=subject_obj.id,
        teacher_id=teacher_obj.id,
        period_id=period.id,
        day_of_week=1,
        school_id=school.id,
        academic_year="2025-2026"
    )
    db_session.add(entry)
    db_session.commit()
    db_session.refresh(entry)

    response = test_client.put(
        f"/api/v1/timetable/{entry.id}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"day_of_week": 2}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["day_of_week"] == 2

def test_delete_timetable_entry(test_client: TestClient, db_session: Session, create_school, create_test_user, get_auth_token, create_class_fixture, create_subject_fixture, create_teacher_fixture):
    school = create_school(name="School J", code="SJ1")
    admin_user = create_test_user(role="ADMIN", school=school, email="adminJ@test.com")
    admin_token = get_auth_token(test_client, admin_user.email)
    
    class_obj = create_class_fixture(school=school)
    subject_obj = create_subject_fixture(school=school)
    teacher_obj = create_teacher_fixture(school=school)
    
    period = PeriodModel(school_id=school.id, period_number=1, start_time=time(9,0,0), end_time=time(9,45,0))
    db_session.add(period)
    db_session.commit()
    db_session.refresh(period)

    entry = TimetableEntryModel(
        class_id=class_obj.id,
        subject_id=subject_obj.id,
        teacher_id=teacher_obj.id,
        period_id=period.id,
        day_of_week=1,
        school_id=school.id,
        academic_year="2025-2026"
    )
    db_session.add(entry)
    db_session.commit()
    db_session.refresh(entry)

    response = test_client.delete(
        f"/api/v1/timetable/{entry.id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 204

    response = test_client.get(
        f"/api/v1/timetable/class/{class_obj.id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 0