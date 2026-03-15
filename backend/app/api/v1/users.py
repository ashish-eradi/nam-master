from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.core.database import get_db
from app.schemas.user import User, UserCreate, UserUpdate
from app.models.user import User as UserModel
from app.core.permissions import is_superadmin
from app.core.security import hash_password
from app.models.enums import Role

router = APIRouter()

@router.get("", response_model=List[User], dependencies=[Depends(is_superadmin)])
def read_users(db: Session = Depends(get_db)):
    """
    Retrieve all users.
    """
    users = db.query(UserModel).all()
    return users

@router.post("", response_model=User, dependencies=[Depends(is_superadmin)])
def create_user(user_in: UserCreate, db: Session = Depends(get_db)):
    """
    Create a new user.
    """
    db_user = db.query(UserModel).filter(UserModel.email == user_in.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Enforce school_id for non-SUPERADMIN roles
    if user_in.role != Role.SUPERADMIN and user_in.school_id is None:
        raise HTTPException(status_code=400, detail="School ID is required for non-SUPERADMIN users")

    hashed_password = hash_password(user_in.password)
    db_user = UserModel(**user_in.model_dump(exclude={"password"}), password_hash=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.get("/{user_id}", response_model=User, dependencies=[Depends(is_superadmin)])
def read_user(user_id: uuid.UUID, db: Session = Depends(get_db)):
    """
    Retrieve a single user by ID.
    """
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/{user_id}", response_model=User, dependencies=[Depends(is_superadmin)])
def update_user(user_id: uuid.UUID, user_in: UserUpdate, db: Session = Depends(get_db)):
    """
    Update a user's details.
    """
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = user_in.model_dump(exclude_unset=True)
    if "password" in update_data:
        update_data["password_hash"] = hash_password(update_data["password"])
        del update_data["password"]
    
    for field, value in update_data.items():
        setattr(user, field, value)
    
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.delete("/{user_id}", response_model=User, dependencies=[Depends(is_superadmin)])
def delete_user(user_id: uuid.UUID, db: Session = Depends(get_db)):
    """
    Delete a user by ID.
    """
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(user)
    db.commit()
    return user
