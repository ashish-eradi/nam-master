from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import uuid
from app.core.database import get_db
from app.schemas.communication_schema import Message, MessageCreate, MessageUpdate
from app.models.communication import Message as MessageModel
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()

@router.get("", response_model=List[Message])
def read_messages(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(MessageModel).filter(MessageModel.recipient_id == current_user.id).order_by(MessageModel.created_at.desc()).all()

@router.get("/sent", response_model=List[Message])
def read_sent_messages(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(MessageModel).filter(MessageModel.sender_id == current_user.id).order_by(MessageModel.created_at.desc()).all()

@router.post("", response_model=Message)
def create_message(message: MessageCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_message = MessageModel(
        **message.dict(),
        sender_id=current_user.id
    )
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    return db_message

@router.get("/{message_id}", response_model=Message)
def read_message(message_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    message = db.query(MessageModel).filter(MessageModel.id == message_id, MessageModel.recipient_id == current_user.id).first()
    if message is None:
        raise HTTPException(status_code=404, detail="Message not found")
    return message

@router.put("/{message_id}/read", response_model=Message)
def mark_message_as_read(message_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_message = db.query(MessageModel).filter(MessageModel.id == message_id, MessageModel.recipient_id == current_user.id).first()
    if db_message is None:
        raise HTTPException(status_code=404, detail="Message not found")
    db_message.is_read = True
    db.commit()
    db.refresh(db_message)
    return db_message