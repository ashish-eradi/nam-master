import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User as UserModel
from app.models.school import School as SchoolModel
from app.models.student import Student as StudentModel
from app.models.hostel import Hostel as HostelModel, HostelRoom as HostelRoomModel, HostelAllocation as HostelAllocationModel
from app.models.class_model import Class as ClassModel
from app.core.security import create_access_token, hash_password
from datetime import date
import uuid

def test_hostel_flow(test_client: TestClient, db_session: Session):
    # 1. Setup: Create school, admin, student, class
    school = SchoolModel(name="Test School 38", code="TEST38")
    db_session.add(school)
    db_session.commit()

    admin_user = UserModel(
        username="test_admin_user38",
        email="test_admin_user38@test.com",
        password_hash=hash_password("test_password"),
        role="ADMIN",
        school_id=school.id,
        is_verified=True
    )
    db_session.add(admin_user)
    db_session.commit()

    student_user = UserModel(
        username="test_student_user38",
        email="test_student_user38@test.com",
        password_hash=hash_password("test_password"),
        role="STUDENT",
        school_id=school.id,
        is_verified=True
    )
    db_session.add(student_user)
    db_session.commit()

    class_ = ClassModel(name="Test Class 38", section="A", school_id=school.id, academic_year="2025-2026")
    db_session.add(class_)
    db_session.commit()

    student = StudentModel(
        user_id=student_user.id,
        first_name="Test",
        last_name="Student",
        admission_number="12345678901234",
        admission_date=date.today(),
        school_id=school.id,
        date_of_birth=date.today(),
        gender="Male",
        class_id=class_.id,
        academic_year="2025-2026",
    )
    db_session.add(student)
    db_session.commit()

    token_data = {"sub": admin_user.email, "role": "ADMIN", "school_id": str(school.id)}
    token = create_access_token(data=token_data)
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Hostel
    hostel_data = {
        "name": "Test Hostel",
        "hostel_type": "Boys",
        "school_id": str(school.id)
    }
    response = test_client.post("/api/v1/hostel/", headers=headers, json=hostel_data)
    assert response.status_code == 200
    created_hostel = response.json()
    hostel_id = created_hostel["id"]

    # 3. Read Hostels
    response = test_client.get("/api/v1/hostel/", headers=headers)
    assert response.status_code == 200
    hostels = response.json()
    assert any(h["id"] == hostel_id for h in hostels)

    # 4. Update Hostel
    update_data = {"name": "Updated Test Hostel"}
    response = test_client.put(f"/api/v1/hostel/{hostel_id}", headers=headers, json=update_data)
    assert response.status_code == 200
    updated_hostel = response.json()
    assert updated_hostel["name"] == "Updated Test Hostel"

    # 5. Create Hostel Room
    room_data = {
        "room_number": "101",
        "hostel_id": hostel_id,
        "capacity": 4
    }
    response = test_client.post("/api/v1/hostel/rooms", headers=headers, json=room_data)
    assert response.status_code == 200
    created_room = response.json()
    room_id = created_room["id"]

    # 6. Read Hostel Rooms
    response = test_client.get(f"/api/v1/hostel/{hostel_id}/rooms", headers=headers)
    assert response.status_code == 200
    rooms = response.json()
    assert any(r["id"] == room_id for r in rooms)

    # 7. Update Hostel Room
    update_data = {"capacity": 5}
    response = test_client.put(f"/api/v1/hostel/rooms/{room_id}", headers=headers, json=update_data)
    assert response.status_code == 200
    updated_room = response.json()
    assert updated_room["capacity"] == 5

    # 8. Allocate Student to Room
    allocation_data = {
        "student_id": str(student.id),
        "room_id": room_id,
        "allocation_date": str(date.today()),
        "academic_year": "2025-2026"
    }
    response = test_client.post("/api/v1/hostel/allocate", headers=headers, json=allocation_data)
    assert response.status_code == 200
    allocation = response.json()
    allocation_id = allocation["id"]

    # 9. Get Student Allocation
    response = test_client.get(f"/api/v1/hostel/student/{student.id}/allocation", headers=headers)
    assert response.status_code == 200
    student_allocation = response.json()
    assert student_allocation["id"] == allocation_id

    # 10. Vacate Student from Room
    response = test_client.post(f"/api/v1/hostel/vacate/{allocation_id}", headers=headers)
    assert response.status_code == 200

    # 11. Delete Hostel Room
    response = test_client.delete(f"/api/v1/hostel/rooms/{room_id}", headers=headers)
    assert response.status_code == 204

    # 12. Delete Hostel
    response = test_client.delete(f"/api/v1/hostel/{hostel_id}", headers=headers)
    assert response.status_code == 204