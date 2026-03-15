from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import uuid
from app.core.database import get_db
from app.schemas.hostel_schema import Hostel, HostelCreate, HostelUpdate, HostelRoom, HostelRoomCreate, HostelRoomUpdate, HostelAllocation, HostelAllocationCreate, HostelAllocationUpdate, HostelFee, HostelFeeCreate, HostelFeeUpdate, AllocationDetail, HostelFeeAssignment, StudentHostelFeeStructureOut
from app.models.hostel import Hostel as HostelModel, HostelRoom as HostelRoomModel, HostelAllocation as HostelAllocationModel, HostelFee as HostelFeeModel, StudentHostelFeeStructure as StudentHostelFeeStructureModel
from app.models.student import Student as StudentModel
from app.core.permissions import is_admin
from app.core.utils import tenant_aware_query
from app.api.deps import get_current_user_school

router = APIRouter()

@router.get("", response_model=List[Hostel], dependencies=[Depends(is_admin)])
def read_hostels(db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    return tenant_aware_query(db, HostelModel, school_id).all()

@router.post("", response_model=Hostel, dependencies=[Depends(is_admin)])
def create_hostel(hostel: HostelCreate, db: Session = Depends(get_db)):
    db_hostel = HostelModel(**hostel.model_dump(), total_rooms=0)
    db.add(db_hostel)
    db.commit()
    db.refresh(db_hostel)
    return db_hostel

@router.put("/{hostel_id}", response_model=Hostel, dependencies=[Depends(is_admin)])
def update_hostel(hostel_id: uuid.UUID, hostel: HostelUpdate, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    db_hostel = tenant_aware_query(db, HostelModel, school_id).filter(HostelModel.id == hostel_id).first()
    if not db_hostel:
        raise HTTPException(status_code=404, detail="Hostel not found")
    update_data = hostel.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_hostel, key, value)
    db.commit()
    db.refresh(db_hostel)
    return db_hostel

@router.delete("/{hostel_id}", status_code=204, dependencies=[Depends(is_admin)])
def delete_hostel(hostel_id: uuid.UUID, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    db_hostel = tenant_aware_query(db, HostelModel, school_id).filter(HostelModel.id == hostel_id).first()
    if not db_hostel:
        raise HTTPException(status_code=404, detail="Hostel not found")
    db.delete(db_hostel)
    db.commit()
    return {"detail": "Hostel deleted successfully"}


@router.get("/{hostel_id}/rooms", response_model=List[HostelRoom], dependencies=[Depends(is_admin)])
def read_hostel_rooms(hostel_id: uuid.UUID, db: Session = Depends(get_db)):
    return db.query(HostelRoomModel).filter(HostelRoomModel.hostel_id == hostel_id).all()

@router.post("/rooms", response_model=HostelRoom, dependencies=[Depends(is_admin)])
def create_hostel_room(room: HostelRoomCreate, db: Session = Depends(get_db)):
    db_room = HostelRoomModel(**room.model_dump())
    db.add(db_room)
    db.commit()
    db.refresh(db_room)
    return db_room

@router.put("/rooms/{room_id}", response_model=HostelRoom, dependencies=[Depends(is_admin)])
def update_hostel_room(room_id: uuid.UUID, room: HostelRoomUpdate, db: Session = Depends(get_db)):
    db_room = db.query(HostelRoomModel).filter(HostelRoomModel.id == room_id).first()
    if not db_room:
        raise HTTPException(status_code=404, detail="Room not found")
    update_data = room.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_room, key, value)
    db.commit()
    db.refresh(db_room)
    return db_room

@router.delete("/rooms/{room_id}", status_code=204, dependencies=[Depends(is_admin)])
def delete_hostel_room(room_id: uuid.UUID, db: Session = Depends(get_db)):
    db_room = db.query(HostelRoomModel).filter(HostelRoomModel.id == room_id).first()
    if not db_room:
        raise HTTPException(status_code=404, detail="Room not found")

    # Delete all allocations for this room
    db.query(HostelAllocationModel).filter(HostelAllocationModel.room_id == room_id).delete()

    db.delete(db_room)
    db.commit()
    return {"detail": "Room deleted successfully"}


from datetime import datetime

@router.get("/allocations", response_model=List[AllocationDetail], dependencies=[Depends(is_admin)])
def get_all_allocations(db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    allocations = (
        db.query(HostelAllocationModel)
        .join(HostelRoomModel, HostelAllocationModel.room_id == HostelRoomModel.id)
        .join(HostelModel, HostelRoomModel.hostel_id == HostelModel.id)
        .filter(HostelModel.school_id == school_id, HostelAllocationModel.status == 'ACTIVE')
        .all()
    )
    result = []
    for a in allocations:
        student = db.query(StudentModel).filter(StudentModel.id == a.student_id).first()
        room = db.query(HostelRoomModel).filter(HostelRoomModel.id == a.room_id).first()
        hostel = db.query(HostelModel).filter(HostelModel.id == room.hostel_id).first()
        result.append(AllocationDetail(
            id=a.id,
            student_id=a.student_id,
            student_name=f"{student.first_name} {student.last_name}" if student else "Unknown",
            admission_number=student.admission_number if student else "",
            gender=student.gender.value if student and student.gender else None,
            room_id=a.room_id,
            room_number=room.room_number,
            hostel_id=hostel.id,
            hostel_name=hostel.name,
            hostel_type=hostel.hostel_type,
            allocation_date=a.allocation_date,
            academic_year=a.academic_year,
            status=a.status,
        ))
    return result

@router.post("/allocate", response_model=HostelAllocation, dependencies=[Depends(is_admin)])
def allocate_student_to_room(allocation: HostelAllocationCreate, db: Session = Depends(get_db)):
    # Check student not already allocated
    existing = db.query(HostelAllocationModel).filter(
        HostelAllocationModel.student_id == allocation.student_id,
        HostelAllocationModel.status == 'ACTIVE'
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Student is already allocated to a room")

    room = db.query(HostelRoomModel).filter(HostelRoomModel.id == allocation.room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room.occupied_count >= room.capacity:
        raise HTTPException(status_code=400, detail="Room is full")

    # Gender check
    hostel = db.query(HostelModel).filter(HostelModel.id == room.hostel_id).first()
    student = db.query(StudentModel).filter(StudentModel.id == allocation.student_id).first()
    if hostel and student and student.gender:
        student_gender = student.gender.value if hasattr(student.gender, 'value') else str(student.gender)
        hostel_type = hostel.hostel_type  # "Boys" or "Girls"
        if hostel_type == "Boys" and student_gender != "Male":
            raise HTTPException(status_code=400, detail=f"Only male students can be allocated to a Boys hostel")
        if hostel_type == "Girls" and student_gender != "Female":
            raise HTTPException(status_code=400, detail=f"Only female students can be allocated to a Girls hostel")

    db_allocation = HostelAllocationModel(**allocation.model_dump())
    room.occupied_count += 1
    db.add(db_allocation)
    db.commit()
    db.refresh(db_allocation)
    return db_allocation

@router.post("/vacate/{allocation_id}", response_model=HostelAllocation, dependencies=[Depends(is_admin)])
def vacate_student_from_room(allocation_id: uuid.UUID, db: Session = Depends(get_db)):
    db_allocation = db.query(HostelAllocationModel).filter(HostelAllocationModel.id == allocation_id).first()
    if not db_allocation:
        raise HTTPException(status_code=404, detail="Allocation not found")
    if db_allocation.status == "VACATED":
        raise HTTPException(status_code=400, detail="Student already vacated")

    db_allocation.status = "VACATED"
    room = db.query(HostelRoomModel).filter(HostelRoomModel.id == db_allocation.room_id).first()
    if room and room.occupied_count > 0:
        room.occupied_count -= 1
    
    db.commit()
    db.refresh(db_allocation)
    return db_allocation

@router.get("/student/{student_id}/allocation", response_model=HostelAllocation, dependencies=[Depends(is_admin)])
def get_student_allocation(student_id: uuid.UUID, db: Session = Depends(get_db)):
    allocation = db.query(HostelAllocationModel).filter(HostelAllocationModel.student_id == student_id, HostelAllocationModel.status == 'ACTIVE').first()
    if not allocation:
        raise HTTPException(status_code=404, detail="Student has no active allocation")
    return allocation

# --- Hostel Fees ---

@router.get("/fees", response_model=List[HostelFee], dependencies=[Depends(is_admin)])
def get_hostel_fees(db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    return db.query(HostelFeeModel).join(HostelModel).filter(HostelModel.school_id == school_id).all()

@router.post("/fees", response_model=HostelFee, dependencies=[Depends(is_admin)])
def create_hostel_fee(fee: HostelFeeCreate, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    hostel = tenant_aware_query(db, HostelModel, school_id).filter(HostelModel.id == fee.hostel_id).first()
    if not hostel:
        raise HTTPException(status_code=404, detail="Hostel not found")
    db_fee = HostelFeeModel(id=uuid.uuid4(), **fee.model_dump())
    db.add(db_fee)
    db.commit()
    db.refresh(db_fee)
    return db_fee

@router.put("/fees/{fee_id}", response_model=HostelFee, dependencies=[Depends(is_admin)])
def update_hostel_fee(fee_id: uuid.UUID, fee: HostelFeeUpdate, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    db_fee = db.query(HostelFeeModel).join(HostelModel).filter(HostelFeeModel.id == fee_id, HostelModel.school_id == school_id).first()
    if not db_fee:
        raise HTTPException(status_code=404, detail="Hostel fee not found")
    for key, value in fee.model_dump(exclude_unset=True).items():
        setattr(db_fee, key, value)
    db.commit()
    db.refresh(db_fee)
    return db_fee

@router.delete("/fees/{fee_id}", status_code=204, dependencies=[Depends(is_admin)])
def delete_hostel_fee(fee_id: uuid.UUID, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    db_fee = db.query(HostelFeeModel).join(HostelModel).filter(HostelFeeModel.id == fee_id, HostelModel.school_id == school_id).first()
    if not db_fee:
        raise HTTPException(status_code=404, detail="Hostel fee not found")
    db.delete(db_fee)
    db.commit()

# --- Assign hostel fee to student ---

@router.post("/students/{student_id}/assign-fee", response_model=StudentHostelFeeStructureOut, dependencies=[Depends(is_admin)])
def assign_hostel_fee_to_student(
    student_id: uuid.UUID,
    assignment: HostelFeeAssignment,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    student = db.query(StudentModel).filter(StudentModel.id == student_id, StudentModel.school_id == school_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    hostel_fee = db.query(HostelFeeModel).join(HostelModel).filter(
        HostelFeeModel.id == assignment.hostel_fee_id,
        HostelModel.school_id == school_id
    ).first()
    if not hostel_fee:
        raise HTTPException(status_code=404, detail="Hostel fee not found")

    # Check not already assigned for same fee + year
    existing = db.query(StudentHostelFeeStructureModel).filter(
        StudentHostelFeeStructureModel.student_id == student_id,
        StudentHostelFeeStructureModel.hostel_fee_id == assignment.hostel_fee_id,
        StudentHostelFeeStructureModel.academic_year == assignment.academic_year
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Hostel fee already assigned for this student and academic year")

    amount = hostel_fee.amount
    db_structure = StudentHostelFeeStructureModel(
        id=uuid.uuid4(),
        student_id=student_id,
        hostel_fee_id=assignment.hostel_fee_id,
        academic_year=assignment.academic_year,
        total_amount=amount,
        discount_amount=0,
        final_amount=amount,
        amount_paid=0,
        outstanding_amount=amount,
    )
    db.add(db_structure)
    db.commit()
    db.refresh(db_structure)
    return db_structure
