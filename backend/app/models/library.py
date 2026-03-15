import uuid
from sqlalchemy import Column, String, ForeignKey, DECIMAL, Date, Integer, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

class Book(Base):
    __tablename__ = "books"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    isbn = Column(String(20), unique=True)
    title = Column(String(200), nullable=False)
    author = Column(String(100))
    publisher = Column(String(100))
    publication_year = Column(Integer)
    category = Column(String(50))
    total_copies = Column(Integer, default=1)
    available_copies = Column(Integer, default=1)
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    school = relationship("School", back_populates="books")
    transactions = relationship("BookTransaction", back_populates="book")

class BookTransaction(Base):
    __tablename__ = "book_transactions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    book_id = Column(UUID(as_uuid=True), ForeignKey("books.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False)
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.id"), nullable=False)
    checkout_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False)
    return_date = Column(Date)
    fine_amount = Column(DECIMAL(8, 2), default=0.00)
    status = Column(String(20))
    issued_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    book = relationship("Book", back_populates="transactions")
    student = relationship("Student", back_populates="book_transactions")
    school = relationship("School", back_populates="book_transactions")
    issued_by = relationship("User", back_populates="issued_book_transactions")
