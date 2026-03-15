from pydantic import BaseModel, Field
import uuid
from typing import Optional
from datetime import date

# Schema for Book
class BookBase(BaseModel):
    isbn: Optional[str] = Field(None, max_length=20)
    title: str = Field(..., max_length=200)
    author: Optional[str] = Field(None, max_length=100)
    publisher: Optional[str] = Field(None, max_length=100)
    publication_year: Optional[int] = None
    category: Optional[str] = Field(None, max_length=50)
    total_copies: int = 1

class BookCreate(BookBase):
    school_id: uuid.UUID

class BookUpdate(BookBase):
    available_copies: Optional[int] = None

class Book(BookBase):
    id: uuid.UUID
    school_id: uuid.UUID
    available_copies: int

    class Config:
        orm_mode = True

# Schema for BookTransaction
class BookTransactionBase(BaseModel):
    book_id: uuid.UUID
    student_id: uuid.UUID
    due_date: date
    return_date: Optional[date] = None
    fine_amount: float = 0.0

class BookTransactionCreate(BookTransactionBase):
    school_id: uuid.UUID

class BookTransaction(BookTransactionBase):
    id: uuid.UUID
    school_id: uuid.UUID
    issued_by_user_id: uuid.UUID

    class Config:
        orm_mode = True