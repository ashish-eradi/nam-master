from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.core.database import get_db
from app.schemas.miscellaneous_schema import (
    MiscellaneousFeeCategory,
    MiscellaneousFeeCategoryCreate,
    MiscellaneousFeeCategoryUpdate,
    MiscellaneousFeeOut,
    MiscellaneousFeeCreate,
    MiscellaneousFeeUpdate,
    MiscellaneousFeeAssignment,
    StudentMiscellaneousFeeStructureOut,
)
from app.models.miscellaneous import (
    MiscellaneousFeeCategory as MiscellaneousFeeCategoryModel,
    MiscellaneousFee as MiscellaneousFeeModel,
    StudentMiscellaneousFeeStructure as StudentMiscellaneousFeeStructureModel,
)
from app.models.student import Student as StudentModel
from app.core.permissions import is_admin
from app.core.utils import tenant_aware_query
from app.api.deps import get_current_user_school

router = APIRouter()


# --- Categories ---

@router.get("/categories", response_model=List[MiscellaneousFeeCategory], dependencies=[Depends(is_admin)])
def get_categories(db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    return tenant_aware_query(db, MiscellaneousFeeCategoryModel, school_id).all()


@router.post("/categories", response_model=MiscellaneousFeeCategory, dependencies=[Depends(is_admin)])
def create_category(
    category: MiscellaneousFeeCategoryCreate,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    db_category = MiscellaneousFeeCategoryModel(
        id=uuid.uuid4(),
        school_id=school_id,
        name=category.name,
        description=category.description,
    )
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category


@router.put("/categories/{category_id}", response_model=MiscellaneousFeeCategory, dependencies=[Depends(is_admin)])
def update_category(
    category_id: uuid.UUID,
    category: MiscellaneousFeeCategoryUpdate,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    db_category = tenant_aware_query(db, MiscellaneousFeeCategoryModel, school_id).filter(
        MiscellaneousFeeCategoryModel.id == category_id
    ).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
    for key, value in category.model_dump(exclude_unset=True).items():
        setattr(db_category, key, value)
    db.commit()
    db.refresh(db_category)
    return db_category


@router.delete("/categories/{category_id}", status_code=204, dependencies=[Depends(is_admin)])
def delete_category(
    category_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    db_category = tenant_aware_query(db, MiscellaneousFeeCategoryModel, school_id).filter(
        MiscellaneousFeeCategoryModel.id == category_id
    ).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
    # Block if any fees exist under this category
    fee_count = db.query(MiscellaneousFeeModel).filter(
        MiscellaneousFeeModel.category_id == category_id
    ).count()
    if fee_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete category: {fee_count} fee(s) exist under it")
    db.delete(db_category)
    db.commit()


# --- Fees ---

@router.get("/fees", response_model=List[MiscellaneousFeeOut], dependencies=[Depends(is_admin)])
def get_fees(db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    fees = db.query(MiscellaneousFeeModel).join(MiscellaneousFeeCategoryModel).filter(
        MiscellaneousFeeCategoryModel.school_id == school_id
    ).all()
    result = []
    for fee in fees:
        result.append(MiscellaneousFeeOut(
            id=fee.id,
            category_id=fee.category_id,
            category_name=fee.category.name if fee.category else None,
            amount=float(fee.amount),
            fund_id=fee.fund_id,
            academic_year=fee.academic_year,
        ))
    return result


@router.post("/fees", response_model=MiscellaneousFeeOut, dependencies=[Depends(is_admin)])
def create_fee(
    fee: MiscellaneousFeeCreate,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    category = tenant_aware_query(db, MiscellaneousFeeCategoryModel, school_id).filter(
        MiscellaneousFeeCategoryModel.id == fee.category_id
    ).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    db_fee = MiscellaneousFeeModel(id=uuid.uuid4(), **fee.model_dump())
    db.add(db_fee)
    db.commit()
    db.refresh(db_fee)
    return MiscellaneousFeeOut(
        id=db_fee.id,
        category_id=db_fee.category_id,
        category_name=category.name,
        amount=float(db_fee.amount),
        fund_id=db_fee.fund_id,
        academic_year=db_fee.academic_year,
    )


@router.put("/fees/{fee_id}", response_model=MiscellaneousFeeOut, dependencies=[Depends(is_admin)])
def update_fee(
    fee_id: uuid.UUID,
    fee: MiscellaneousFeeUpdate,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    db_fee = db.query(MiscellaneousFeeModel).join(MiscellaneousFeeCategoryModel).filter(
        MiscellaneousFeeModel.id == fee_id,
        MiscellaneousFeeCategoryModel.school_id == school_id
    ).first()
    if not db_fee:
        raise HTTPException(status_code=404, detail="Fee not found")
    for key, value in fee.model_dump(exclude_unset=True).items():
        setattr(db_fee, key, value)
    db.commit()
    db.refresh(db_fee)
    return MiscellaneousFeeOut(
        id=db_fee.id,
        category_id=db_fee.category_id,
        category_name=db_fee.category.name if db_fee.category else None,
        amount=float(db_fee.amount),
        fund_id=db_fee.fund_id,
        academic_year=db_fee.academic_year,
    )


@router.delete("/fees/{fee_id}", status_code=204, dependencies=[Depends(is_admin)])
def delete_fee(
    fee_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    db_fee = db.query(MiscellaneousFeeModel).join(MiscellaneousFeeCategoryModel).filter(
        MiscellaneousFeeModel.id == fee_id,
        MiscellaneousFeeCategoryModel.school_id == school_id
    ).first()
    if not db_fee:
        raise HTTPException(status_code=404, detail="Fee not found")
    db.delete(db_fee)
    db.commit()


# --- Assign fee to student ---

@router.post("/students/{student_id}/assign-fee", response_model=StudentMiscellaneousFeeStructureOut, dependencies=[Depends(is_admin)])
def assign_fee_to_student(
    student_id: uuid.UUID,
    assignment: MiscellaneousFeeAssignment,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    student = db.query(StudentModel).filter(
        StudentModel.id == student_id,
        StudentModel.school_id == school_id
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    misc_fee = db.query(MiscellaneousFeeModel).join(MiscellaneousFeeCategoryModel).filter(
        MiscellaneousFeeModel.id == assignment.miscellaneous_fee_id,
        MiscellaneousFeeCategoryModel.school_id == school_id
    ).first()
    if not misc_fee:
        raise HTTPException(status_code=404, detail="Fee not found")

    existing = db.query(StudentMiscellaneousFeeStructureModel).filter(
        StudentMiscellaneousFeeStructureModel.student_id == student_id,
        StudentMiscellaneousFeeStructureModel.miscellaneous_fee_id == assignment.miscellaneous_fee_id,
        StudentMiscellaneousFeeStructureModel.academic_year == assignment.academic_year
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Fee already assigned for this student and academic year")

    amount = misc_fee.amount
    db_structure = StudentMiscellaneousFeeStructureModel(
        id=uuid.uuid4(),
        student_id=student_id,
        miscellaneous_fee_id=assignment.miscellaneous_fee_id,
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


@router.get("/students/{student_id}/fees", response_model=List[StudentMiscellaneousFeeStructureOut], dependencies=[Depends(is_admin)])
def get_student_misc_fees(
    student_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    student = db.query(StudentModel).filter(
        StudentModel.id == student_id,
        StudentModel.school_id == school_id
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return db.query(StudentMiscellaneousFeeStructureModel).filter(
        StudentMiscellaneousFeeStructureModel.student_id == student_id
    ).all()
