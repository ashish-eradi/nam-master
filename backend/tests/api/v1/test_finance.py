import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User as UserModel
from app.models.school import School as SchoolModel
from app.models.student import Student as StudentModel
from app.models.class_model import Class as ClassModel
from app.models.finance import Fund as FundModel, Fee as FeeModel, ClassFee as ClassFeeModel, Payment as PaymentModel, Concession as ConcessionModel, Salary as SalaryModel
from app.core.security import create_access_token, hash_password
from datetime import date
import uuid

def test_finance_flow(test_client: TestClient, db_session: Session):
    # 1. Setup: Create school, admin, student, class, teacher
    school = SchoolModel(name="Test School 40", code="TEST40")
    db_session.add(school)
    db_session.commit()

    admin_user = UserModel(
        username="test_admin_user40",
        email="test_admin_user40@test.com",
        password_hash=hash_password("test_password"),
        role="ADMIN",
        school_id=school.id,
        is_verified=True
    )
    teacher_user = UserModel(
        username="test_teacher_user40",
        email="test_teacher_user40@test.com",
        password_hash=hash_password("test_password"),
        role="TEACHER",
        school_id=school.id,
        is_verified=True
    )
    db_session.add_all([admin_user, teacher_user])
    db_session.commit()

    class_ = ClassModel(name="Test Class 40", section="A", school_id=school.id, academic_year="2025-2026")
    db_session.add(class_)
    db_session.commit()

    student_user = UserModel(
        username="test_student_user40",
        email="test_student_user40@test.com",
        password_hash=hash_password("test_password"),
        role="STUDENT",
        school_id=school.id,
        is_verified=True
    )
    db_session.add(student_user)
    db_session.commit()

    student = StudentModel(
        user_id=student_user.id,
        first_name="Test",
        last_name="Student",
        admission_number="1234567890123456",
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

    # 2. Fund Management
    fund_data = {"name": "Test Fund", "school_id": str(school.id), "receipt_number_start": 100}
    response = test_client.post("/api/v1/finance/funds", headers=headers, json=fund_data)
    assert response.status_code == 200
    created_fund = response.json()
    fund_id = created_fund["id"]

    response = test_client.get("/api/v1/finance/funds", headers=headers)
    assert response.status_code == 200
    assert any(f["id"] == fund_id for f in response.json())

    update_fund_data = {"name": "Updated Test Fund"}
    response = test_client.put(f"/api/v1/finance/funds/{fund_id}", headers=headers, json=update_fund_data)
    assert response.status_code == 200
    assert response.json()["name"] == "Updated Test Fund"

    # 3. Fee Management
    fee_data = {"fee_name": "Test Fee", "school_id": str(school.id), "fund_id": fund_id}
    response = test_client.post("/api/v1/finance/fees", headers=headers, json=fee_data)
    assert response.status_code == 200
    created_fee = response.json()
    fee_id = created_fee["id"]

    response = test_client.get("/api/v1/finance/fees", headers=headers)
    assert response.status_code == 200
    assert any(f["id"] == fee_id for f in response.json())

    update_fee_data = {"fee_name": "Updated Test Fee"}
    response = test_client.put(f"/api/v1/finance/fees/{fee_id}", headers=headers, json=update_fee_data)
    assert response.status_code == 200
    assert response.json()["fee_name"] == "Updated Test Fee"

    # 4. ClassFee Management
    class_fee_data = {"fee_id": fee_id, "class_id": str(class_.id), "amount": 1000, "installment_type": "Monthly", "academic_year": "2025-2026"}
    response = test_client.post("/api/v1/finance/class-fees", headers=headers, json=class_fee_data)
    assert response.status_code == 200

    response = test_client.get(f"/api/v1/finance/class-fees/{class_.id}", headers=headers)
    assert response.status_code == 200
    assert len(response.json()) > 0

    # 5. Payment Management
    payment_data = {"student_id": str(student.id), "school_id": str(school.id), "fund_id": fund_id, "amount_paid": 500, "payment_date": str(date.today()), "payment_mode": "Cash"}
    response = test_client.post("/api/v1/finance/payments", headers=headers, json=payment_data)
    assert response.status_code == 200
    created_payment = response.json()
    payment_id = created_payment["id"]

    response = test_client.get("/api/v1/finance/payments", headers=headers)
    assert response.status_code == 200
    assert any(p["id"] == payment_id for p in response.json())

    response = test_client.get(f"/api/v1/finance/payments/{payment_id}", headers=headers)
    assert response.status_code == 200

    # 6. Concession Management
    concession_data = {"student_id": str(student.id), "fee_id": fee_id, "discount_amount": 100, "school_id": str(school.id), "academic_year": "2025-2026"}
    response = test_client.post("/api/v1/finance/concessions", headers=headers, json=concession_data)
    assert response.status_code == 200
    created_concession = response.json()
    concession_id = created_concession["id"]

    response = test_client.get("/api/v1/finance/concessions", headers=headers)
    assert response.status_code == 200
    assert any(c["id"] == concession_id for c in response.json())

    response = test_client.get(f"/api/v1/finance/concessions/{concession_id}", headers=headers)
    assert response.status_code == 200

    # 7. Salary Management
    salary_data = {"teacher_id": str(teacher_user.id), "school_id": str(school.id), "month": "2025-10", "basic_salary": 40000, "allowances": 5000, "deductions": 2000, "net_salary": 43000}
    response = test_client.post("/api/v1/finance/salaries", headers=headers, json=salary_data)
    assert response.status_code == 200
    created_salary = response.json()
    salary_id = created_salary["id"]

    response = test_client.get("/api/v1/finance/salaries", headers=headers)
    assert response.status_code == 200
    assert any(s["id"] == salary_id for s in response.json())

    response = test_client.get(f"/api/v1/finance/salaries/{salary_id}", headers=headers)
    assert response.status_code == 200

    # 8. Deletion
    response = test_client.delete(f"/api/v1/finance/concessions/{concession_id}", headers=headers)
    assert response.status_code == 204

    response = test_client.delete(f"/api/v1/finance/payments/{payment_id}", headers=headers)
    assert response.status_code == 204

    response = test_client.delete(f"/api/v1/finance/fees/{fee_id}", headers=headers)
    assert response.status_code == 204

    response = test_client.delete(f"/api/v1/finance/salaries/{salary_id}", headers=headers)
    assert response.status_code == 204