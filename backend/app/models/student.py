import uuid
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy import Column, String, Date, Boolean, ForeignKey, Enum, DateTime
from app.db.base import Base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.enums import Gender, StudentStatus, RollNumberAssignmentType

class Student(Base):
    __tablename__ = "students"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    admission_number = Column(String(50), unique=True, nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    date_of_birth = Column(Date)
    gender = Column(Enum(Gender))
    blood_group = Column(String(5))
    aadhar_number = Column(String(12), nullable=True)
    address = Column(String, nullable=True)
    area = Column(String(100), nullable=True)
    class_id = Column(UUID(as_uuid=True), ForeignKey("classes.id"))
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.id"), nullable=False)
    roll_number = Column(String(20))
    roll_number_assignment_type = Column(Enum(RollNumberAssignmentType), default=RollNumberAssignmentType.MANUAL)
    admission_date = Column(Date, nullable=False)
    academic_year = Column(String(10))
    transport_required = Column(Boolean, default=False)
    hostel_required = Column(Boolean, default=False)
    status = Column(Enum(StudentStatus), default=StudentStatus.ACTIVE)
    photo_url = Column(String, nullable=True)
    documents = Column(JSONB, default={})  # Store document metadata as JSON
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    school = relationship("School", back_populates="students")
    class_ = relationship("Class", back_populates="students")
    attendance = relationship("Attendance", back_populates="student")
    grades = relationship("Grade", back_populates="student")
    payments = relationship("Payment", back_populates="student")
    concessions = relationship("Concession", back_populates="student")
    parents = relationship("ParentStudentRelation", back_populates="student")
    book_transactions = relationship("BookTransaction", back_populates="student")
    student_routes = relationship("StudentRoute", back_populates="student")
    hostel_allocations = relationship("HostelAllocation", back_populates="student")
    fee_structures = relationship("StudentFeeStructure", back_populates="student")
    route_fee_structures = relationship("StudentRouteFeeStructure", back_populates="student")
    hostel_fee_structures = relationship("StudentHostelFeeStructure", back_populates="student")
    miscellaneous_fee_structures = relationship("StudentMiscellaneousFeeStructure", back_populates="student")
    exam_marks = relationship("StudentExamMarks", back_populates="student")
