import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User as UserModel
from app.models.school import School as SchoolModel
from app.models.student import Student as StudentModel
from app.models.library import Book as BookModel, BookTransaction as BookTransactionModel
from app.models.class_model import Class as ClassModel
from app.core.security import create_access_token, hash_password
from datetime import date, timedelta
import uuid

def test_library_flow(test_client: TestClient, db_session: Session):
    # 1. Setup: Create school, admin, student, class
    school = SchoolModel(name="Test School 36", code="TEST36")
    db_session.add(school)
    db_session.commit()

    admin_user = UserModel(
        username="test_admin_user36",
        email="test_admin_user36@test.com",
        password_hash=hash_password("test_password"),
        role="ADMIN",
        school_id=school.id,
        is_verified=True
    )
    db_session.add(admin_user)
    db_session.commit()

    student_user = UserModel(
        username="test_student_user36",
        email="test_student_user36@test.com",
        password_hash=hash_password("test_password"),
        role="STUDENT",
        school_id=school.id,
        is_verified=True
    )
    db_session.add(student_user)
    db_session.commit()

    class_ = ClassModel(name="Test Class 36", section="A", school_id=school.id, academic_year="2025-2026")
    db_session.add(class_)
    db_session.commit()

    student = StudentModel(
        user_id=student_user.id,
        first_name="Test",
        last_name="Student",
        admission_number="123456789012",
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

    # 2. Create Book
    book_data = {
        "title": "Test Book",
        "author": "Test Author",
        "total_copies": 5,
        "school_id": str(school.id)
    }
    response = test_client.post("/api/v1/library/books/", headers=headers, json=book_data)
    assert response.status_code == 200
    created_book = response.json()
    book_id = created_book["id"]

    # 3. Read Books
    response = test_client.get("/api/v1/library/books/", headers=headers)
    assert response.status_code == 200
    books = response.json()
    assert any(b["id"] == book_id for b in books)

    # 4. Update Book
    update_data = {"title": "Updated Test Book"}
    response = test_client.put(f"/api/v1/library/books/{book_id}", headers=headers, json=update_data)
    assert response.status_code == 200
    updated_book = response.json()
    assert updated_book["title"] == "Updated Test Book"

    # 5. Search Books
    response = test_client.get(f"/api/v1/library/books/search?query=Updated", headers=headers)
    assert response.status_code == 200
    searched_books = response.json()
    assert len(searched_books) > 0

    # 6. Checkout Book
    checkout_data = {
        "book_id": book_id,
        "student_id": str(student.id),
        "due_date": str(date.today() + timedelta(days=14)),
        "school_id": str(school.id)
    }
    response = test_client.post("/api/v1/library/checkout", headers=headers, json=checkout_data)
    assert response.status_code == 200
    transaction = response.json()
    transaction_id = transaction["id"]

    # 7. Get Student Books
    student_token_data = {"sub": student_user.email, "role": "STUDENT", "school_id": str(school.id)}
    student_token = create_access_token(data=student_token_data)
    student_headers = {"Authorization": f"Bearer {student_token}"}
    response = test_client.get(f"/api/v1/library/student/{student.id}/books", headers=student_headers)
    assert response.status_code == 200
    student_books = response.json()
    assert any(t["id"] == transaction_id for t in student_books)

    # 8. Return Book
    response = test_client.post(f"/api/v1/library/return/{transaction_id}", headers=headers)
    assert response.status_code == 200

    # 9. Get Overdue Books
    response = test_client.get("/api/v1/library/overdue", headers=headers)
    assert response.status_code == 200

    # 10. Delete Book
    response = test_client.delete(f"/api/v1/library/books/{book_id}", headers=headers)
    assert response.status_code == 204