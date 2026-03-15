import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User as UserModel
from app.models.school import School as SchoolModel
from app.models.student import Student as StudentModel
from app.models.transport import Route as RouteModel, Vehicle as VehicleModel, StudentRoute as StudentRouteModel
from app.models.class_model import Class as ClassModel
from app.core.security import create_access_token, hash_password
from datetime import date
import uuid

def test_transport_flow(test_client: TestClient, db_session: Session):
    # 1. Setup: Create school, admin, student, class
    school = SchoolModel(name="Test School 37", code="TEST37")
    db_session.add(school)
    db_session.commit()

    admin_user = UserModel(
        username="test_admin_user37",
        email="test_admin_user37@test.com",
        password_hash=hash_password("test_password"),
        role="ADMIN",
        school_id=school.id,
        is_verified=True
    )
    db_session.add(admin_user)
    db_session.commit()

    student_user = UserModel(
        username="test_student_user37",
        email="test_student_user37@test.com",
        password_hash=hash_password("test_password"),
        role="STUDENT",
        school_id=school.id,
        is_verified=True
    )
    db_session.add(student_user)
    db_session.commit()

    class_ = ClassModel(name="Test Class 37", section="A", school_id=school.id, academic_year="2025-2026")
    db_session.add(class_)
    db_session.commit()

    student = StudentModel(
        user_id=student_user.id,
        first_name="Test",
        last_name="Student",
        admission_number="1234567890123",
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

    # 2. Create Route
    route_data = {
        "route_name": "Test Route",
        "school_id": str(school.id)
    }
    response = test_client.post("/api/v1/transport/routes/", headers=headers, json=route_data)
    assert response.status_code == 200
    created_route = response.json()
    route_id = created_route["id"]

    # 3. Read Routes
    response = test_client.get("/api/v1/transport/routes/", headers=headers)
    assert response.status_code == 200
    routes = response.json()
    assert any(r["id"] == route_id for r in routes)

    # 4. Update Route
    update_data = {"route_name": "Updated Test Route"}
    response = test_client.put(f"/api/v1/transport/routes/{route_id}", headers=headers, json=update_data)
    assert response.status_code == 200
    updated_route = response.json()
    assert updated_route["route_name"] == "Updated Test Route"

    # 5. Create Vehicle
    vehicle_data = {
        "vehicle_number": "TEST-1234",
        "school_id": str(school.id)
    }
    response = test_client.post("/api/v1/transport/vehicles/", headers=headers, json=vehicle_data)
    assert response.status_code == 200
    created_vehicle = response.json()
    vehicle_id = created_vehicle["id"]

    # 6. Read Vehicles
    response = test_client.get("/api/v1/transport/vehicles/", headers=headers)
    assert response.status_code == 200
    vehicles = response.json()
    assert any(v["id"] == vehicle_id for v in vehicles)

    # 7. Update Vehicle
    update_data = {"vehicle_number": "TEST-5678"}
    response = test_client.put(f"/api/v1/transport/vehicles/{vehicle_id}", headers=headers, json=update_data)
    assert response.status_code == 200
    updated_vehicle = response.json()
    assert updated_vehicle["vehicle_number"] == "TEST-5678"

    # 8. Assign Student to Route
    assign_data = {
        "student_id": str(student.id),
        "route_id": route_id,
        "academic_year": "2025-2026"
    }
    response = test_client.post("/api/v1/transport/assign", headers=headers, json=assign_data)
    assert response.status_code == 200

    # 9. Get Student Route
    response = test_client.get(f"/api/v1/transport/student/{student.id}/route", headers=headers)
    assert response.status_code == 200
    student_route = response.json()
    assert student_route["student_id"] == str(student.id)

    # 10. Delete Vehicle
    response = test_client.delete(f"/api/v1/transport/vehicles/{vehicle_id}", headers=headers)
    assert response.status_code == 204

    # 11. Delete Route
    response = test_client.delete(f"/api/v1/transport/routes/{route_id}", headers=headers)
    assert response.status_code == 204