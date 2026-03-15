
import asyncio
from app.core.database import SessionLocal, engine
from app.db.base import Base
from app.models.user import User
from app.models.school import School
from app.models.class_model import Class
from app.models.student import Student
from app.models.enums import Gender, StudentStatus
from app.core.security import hash_password
import datetime

def seed_data():
    # Tables are created by Alembic migrations, not here
    print("Starting database seeding...")

    with SessionLocal() as db:
        # Create SuperAdmin
        superadmin = db.query(User).filter(User.email == "superadmin@example.com").first()
        if superadmin is None:
            superadmin = User(
                email="superadmin@example.com",
                username="superadmin",
                password_hash=hash_password("Super@123"),
                role="SUPERADMIN",
                is_active=True,
                is_verified=True,
            )
            db.add(superadmin)
            db.commit()
            db.refresh(superadmin)
            print(f"SuperAdmin created with email: {superadmin.email} (password: Super@123)")
        else:
            print(f"SuperAdmin already exists: {superadmin.email}")

        # Create School
        school = db.query(School).filter(School.name == "Niladri School").first()
        if school is None:
            school = School(
                name="Niladri School",
                code="NILS",
                address="123 Main St",
                city="Anytown",
                state="CA",
                pincode="12345",
                contact_phone="555-555-5555",
                contact_email="contact@niladrischool.com",
                principal_name="Dr. Smith",
            )
            db.add(school)
            db.commit()
            db.refresh(school)
            print(f"School created with name: {school.name}")
        else:
            print(f"School already exists: {school.name}")
        
        # Create Teacher
        teacher_user = db.query(User).filter(User.email == "teacher@niladrischool.com").first()
        if teacher_user is None:
            teacher_user = User(
                email="teacher@niladrischool.com",
                username="teacher",
                password_hash=hash_password("Teacher@123"),
                role="TEACHER",
                school_id=school.id,
                is_active=True,
                is_verified=True,
            )
            db.add(teacher_user)
            db.commit()
            db.refresh(teacher_user)
            print(f"Teacher user created with email: {teacher_user.email} (password: Teacher@123)")
        else:
            print(f"Teacher user already exists: {teacher_user.email}")

        # Create Class
        class_10A = db.query(Class).filter(Class.name == "Grade 10", Class.section == "A", Class.school_id == school.id).first()
        if class_10A is None:
            class_10A = Class(
                name="Grade 10",
                section="A",
                grade_level=10,
                school_id=school.id,
                academic_year="2025-2026",
                class_teacher_id=teacher_user.id,
            )
            db.add(class_10A)
            db.commit()
            db.refresh(class_10A)
            print(f"Class '{class_10A.name}-{class_10A.section}' created for school: {school.name}")
        else:
            print(f"Class '{class_10A.name}-{class_10A.section}' already exists for school: {school.name}")

        # Create Student (students are data records only, no user account)
        student_record = db.query(Student).filter(Student.admission_number == "2025001", Student.school_id == school.id).first()
        if student_record is None:
            student_record = Student(
                admission_number="2025001",
                first_name="John",
                last_name="Doe",
                date_of_birth=datetime.date(2010, 5, 15),
                gender=Gender.MALE,
                class_id=class_10A.id,
                school_id=school.id,
                roll_number="001",
                admission_date=datetime.date(2025, 8, 1),
                academic_year="2025-2026",
                status=StudentStatus.ACTIVE,
            )
            db.add(student_record)
            db.commit()
            db.refresh(student_record)
            print(f"Student '{student_record.first_name} {student_record.last_name}' created for class {class_10A.name}-{class_10A.section}")
        else:
            print(f"Student '{student_record.first_name} {student_record.last_name}' already exists.")

        print("Database seeding complete.")

if __name__ == "__main__":
    seed_data()
