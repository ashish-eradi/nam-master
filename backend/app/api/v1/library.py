from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.schemas.library_schema import Book, BookCreate, BookUpdate, BookTransaction, BookTransactionCreate
from app.models.library import Book as BookModel, BookTransaction as BookTransactionModel
from app.core.permissions import is_admin, is_admin_or_teacher, is_student
from app.core.utils import tenant_aware_query
from app.api.deps import get_current_user_school, get_current_user
from app.models.user import User
import uuid
from datetime import date

router = APIRouter()

@router.get("/books", response_model=List[Book], dependencies=[Depends(is_admin_or_teacher)])
def read_books(db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    return tenant_aware_query(db, BookModel, school_id).all()

@router.post("/books", response_model=Book, dependencies=[Depends(is_admin)])
def create_book(book: BookCreate, db: Session = Depends(get_db)):
    db_book = BookModel(**book.model_dump(), available_copies=book.total_copies)
    db.add(db_book)
    db.commit()
    db.refresh(db_book)
    return db_book

@router.put("/books/{book_id}", response_model=Book, dependencies=[Depends(is_admin)])
def update_book(book_id: uuid.UUID, book: BookUpdate, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    db_book = tenant_aware_query(db, BookModel, school_id).filter(BookModel.id == book_id).first()
    if not db_book:
        raise HTTPException(status_code=404, detail="Book not found")
    update_data = book.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_book, key, value)
    db.commit()
    db.refresh(db_book)
    return db_book

@router.delete("/books/{book_id}", status_code=204, dependencies=[Depends(is_admin)])
def delete_book(book_id: uuid.UUID, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    db_book = tenant_aware_query(db, BookModel, school_id).filter(BookModel.id == book_id).first()
    if not db_book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    # Delete all transactions for this book
    db.query(BookTransactionModel).filter(BookTransactionModel.book_id == book_id).delete()

    db.delete(db_book)
    db.commit()
    return {"detail": "Book deleted successfully"}

@router.get("/books/search", response_model=List[Book], dependencies=[Depends(is_admin_or_teacher)])
def search_books(query: str, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    return tenant_aware_query(db, BookModel, school_id).filter(BookModel.title.ilike(f"%{query}%") | BookModel.author.ilike(f"%{query}%")).all()

@router.post("/checkout", response_model=BookTransaction, dependencies=[Depends(is_admin)])
def checkout_book(transaction: BookTransactionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_book = db.query(BookModel).filter(BookModel.id == transaction.book_id).first()
    if not db_book or db_book.available_copies == 0:
        raise HTTPException(status_code=400, detail="Book not available")
    
    db_transaction = BookTransactionModel(
        **transaction.model_dump(),
        checkout_date=date.today(),
        status="ISSUED",
        issued_by_user_id=current_user.id
    )
    db_book.available_copies -= 1
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    return db_transaction

@router.post("/return/{transaction_id}", response_model=BookTransaction, dependencies=[Depends(is_admin)])
def return_book(transaction_id: uuid.UUID, db: Session = Depends(get_db)):
    db_transaction = db.query(BookTransactionModel).filter(BookTransactionModel.id == transaction_id).first()
    if not db_transaction or db_transaction.status != "ISSUED":
        raise HTTPException(status_code=400, detail="Invalid transaction")

    db_book = db.query(BookModel).filter(BookModel.id == db_transaction.book_id).first()
    if db_book:
        db_book.available_copies += 1

    db_transaction.return_date = date.today()
    db_transaction.status = "RETURNED"
    db.commit()
    db.refresh(db_transaction)
    return db_transaction

@router.get("/student/{student_id}/books", response_model=List[BookTransaction], dependencies=[Depends(is_student)])
def get_student_books(student_id: uuid.UUID, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    return tenant_aware_query(db, BookTransactionModel, school_id).filter(BookTransactionModel.student_id == student_id).all()

@router.get("/overdue", response_model=List[BookTransaction], dependencies=[Depends(is_admin)])
def get_overdue_books(db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    return tenant_aware_query(db, BookTransactionModel, school_id).filter(BookTransactionModel.due_date < date.today(), BookTransactionModel.status == "ISSUED").all()