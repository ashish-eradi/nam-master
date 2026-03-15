import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User as UserModel
from app.models.school import School as SchoolModel
from app.models.attendance import Attendance as AttendanceModel
from app.models.student import Student as StudentModel
from app.core.security import create_access_token, hash_password
import uuid
from datetime import date

def test_mark_attendance(test_client: TestClient, db_session: Session):
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

    student_id = uuid.uuid4()
    class_id = uuid.uuid4()

    student = StudentModel(id=student_id, school_id=school.id, class_id=class_id, user_id=user.id, admission_number="123", roll_number="1", first_name="test", last_name="user", admission_date=date.today())
    db_session.add(student)
    db_session.commit()
    db_session.refresh(student)

    response = test_client.post(
        "/api/v1/attendance/mark",
        headers={"Authorization": f"Bearer {token}"},
        json={"student_id": str(student_id), "class_id": str(class_id), "date": str(date.today()), "status": "P", "school_id": str(school.id), "marked_by_user_id": str(user.id)}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["student_id"] == str(student_id)
    assert data["status"] == "P"

def test_get_class_attendance(test_client: TestClient, db_session: Session):
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

    student_id = uuid.uuid4()
    class_id = uuid.uuid4()

    student = StudentModel(id=student_id, school_id=school.id, class_id=class_id, user_id=user.id, admission_number="123", roll_number="1", first_name="test", last_name="user", admission_date=date.today())
    db_session.add(student)
    db_session.commit()
    db_session.refresh(student)

    attendance = AttendanceModel(student_id=student_id, class_id=class_id, date=date.today(), status="P", school_id=school.id, marked_by_user_id=user.id)
    db_session.add(attendance)
    db_session.commit()
    db_session.refresh(attendance)

    response = test_client.get(
        f"/api/v1/attendance/class/{str(class_id)}/date/{str(date.today())}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    assert data[0]["status"] == "P"

def test_bulk_mark_attendance(test_client: TestClient, db_session: Session):
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

    student_id1 = uuid.uuid4()
    student_id2 = uuid.uuid4()
    class_id = uuid.uuid4()

    student1 = StudentModel(id=student_id1, school_id=school.id, class_id=class_id, user_id=user.id, admission_number="123", roll_number="1", first_name="test", last_name="user", admission_date=date.today())
    student2 = StudentModel(id=student_id2, school_id=school.id, class_id=class_id, user_id=user.id, admission_number="456", roll_number="2", first_name="test2", last_name="user2", admission_date=date.today())
    db_session.add_all([student1, student2])
    db_session.commit()

    response = test_client.post(
        "/api/v1/attendance/bulk-mark",
        headers={"Authorization": f"Bearer {token}"},
        json={"class_id": str(class_id), "date": str(date.today()), "attendances": [{"student_id": str(student_id1), "status": "P"}, {"student_id": str(student_id2), "status": "A"}]}
    )
    assert response.status_code == 201


