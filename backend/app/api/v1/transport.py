from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.schemas.transport_schema import Route, RouteCreate, RouteUpdate, Vehicle, VehicleCreate, VehicleUpdate, StudentRoute, StudentRouteCreate, RouteFee, RouteFeeCreate, RouteFeeUpdate, StudentRouteFeeAssignment
from app.models.transport import Route as RouteModel, Vehicle as VehicleModel, StudentRoute as StudentRouteModel, RouteFee as RouteFeeModel, StudentRouteFeeStructure as StudentRouteFeeStructureModel
from app.models.student import Student as StudentModel
from decimal import Decimal
from app.services.installment_service import InstallmentService
from datetime import date
from app.core.permissions import is_admin
from app.core.utils import tenant_aware_query
from app.api.deps import get_current_user_school
import uuid

router = APIRouter()

@router.get("/routes", response_model=List[Route], dependencies=[Depends(is_admin)])
def read_routes(db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    return tenant_aware_query(db, RouteModel, school_id).all()

@router.post("/routes", response_model=Route, dependencies=[Depends(is_admin)])
def create_route(route: RouteCreate, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    route_data = route.model_dump()
    route_data['school_id'] = school_id  # Always use authenticated school
    db_route = RouteModel(**route_data)
    db.add(db_route)
    db.commit()
    db.refresh(db_route)
    return db_route

@router.put("/routes/{route_id}", response_model=Route, dependencies=[Depends(is_admin)])
def update_route(route_id: uuid.UUID, route: RouteUpdate, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    db_route = tenant_aware_query(db, RouteModel, school_id).filter(RouteModel.id == route_id).first()
    if not db_route:
        raise HTTPException(status_code=404, detail="Route not found")
    update_data = route.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_route, key, value)
    db.commit()
    db.refresh(db_route)
    return db_route

@router.delete("/routes/{route_id}", status_code=204, dependencies=[Depends(is_admin)])
def delete_route(route_id: uuid.UUID, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    db_route = tenant_aware_query(db, RouteModel, school_id).filter(RouteModel.id == route_id).first()
    if not db_route:
        raise HTTPException(status_code=404, detail="Route not found")

    # Delete all student routes for this route
    db.query(StudentRouteModel).filter(StudentRouteModel.route_id == route_id).delete()

    db.delete(db_route)
    db.commit()
    return {"detail": "Route deleted successfully"}


@router.get("/vehicles", response_model=List[Vehicle], dependencies=[Depends(is_admin)])
def read_vehicles(db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    return tenant_aware_query(db, VehicleModel, school_id).all()

@router.post("/vehicles", response_model=Vehicle, dependencies=[Depends(is_admin)])
def create_vehicle(vehicle: VehicleCreate, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    vehicle_data = vehicle.model_dump()
    vehicle_data['school_id'] = school_id  # Always use authenticated school
    db_vehicle = VehicleModel(**vehicle_data)
    db.add(db_vehicle)
    db.commit()
    db.refresh(db_vehicle)
    return db_vehicle

@router.put("/vehicles/{vehicle_id}", response_model=Vehicle, dependencies=[Depends(is_admin)])
def update_vehicle(vehicle_id: uuid.UUID, vehicle: VehicleUpdate, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    db_vehicle = tenant_aware_query(db, VehicleModel, school_id).filter(VehicleModel.id == vehicle_id).first()
    if not db_vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    update_data = vehicle.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_vehicle, key, value)
    db.commit()
    db.refresh(db_vehicle)
    return db_vehicle

@router.delete("/vehicles/{vehicle_id}", status_code=204, dependencies=[Depends(is_admin)])
def delete_vehicle(vehicle_id: uuid.UUID, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    db_vehicle = tenant_aware_query(db, VehicleModel, school_id).filter(VehicleModel.id == vehicle_id).first()
    if not db_vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    db.delete(db_vehicle)
    db.commit()
    return {"detail": "Vehicle deleted successfully"}


@router.post("/assign", response_model=StudentRoute, dependencies=[Depends(is_admin)])
def assign_student_to_route(student_route: StudentRouteCreate, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    db_student_route = StudentRouteModel(**student_route.model_dump(), school_id=school_id)
    db.add(db_student_route)
    db.commit()
    db.refresh(db_student_route)
    return db_student_route

@router.get("/student/{student_id}/route", response_model=StudentRoute, dependencies=[Depends(is_admin)])
def get_student_route(student_id: uuid.UUID, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    return tenant_aware_query(db, StudentRouteModel, school_id).filter(StudentRouteModel.student_id == student_id).first()


# --- Route Fee Endpoints ---

@router.get("/route-fees", response_model=List[RouteFee], dependencies=[Depends(is_admin)])
def get_route_fees(db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    """Get all route fees for the school."""
    from app.models.finance import Fund as FundModel
    route_fees = db.query(RouteFeeModel).join(RouteModel).filter(RouteModel.school_id == school_id).all()
    return route_fees


@router.post("/route-fees", response_model=RouteFee, dependencies=[Depends(is_admin)])
def create_route_fee(route_fee: RouteFeeCreate, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    """Create a new route fee — route must belong to the same school."""
    route = tenant_aware_query(db, RouteModel, school_id).filter(RouteModel.id == route_fee.route_id).first()
    if not route:
        raise HTTPException(status_code=404, detail="Route not found or does not belong to your school")
    db_route_fee = RouteFeeModel(id=uuid.uuid4(), **route_fee.model_dump())
    db.add(db_route_fee)
    db.commit()
    db.refresh(db_route_fee)
    return db_route_fee


@router.put("/route-fees/{route_fee_id}", response_model=RouteFee, dependencies=[Depends(is_admin)])
def update_route_fee(route_fee_id: uuid.UUID, route_fee: RouteFeeUpdate, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    """Update a route fee — verifies ownership via route's school_id."""
    db_route_fee = db.query(RouteFeeModel).join(RouteModel).filter(
        RouteFeeModel.id == route_fee_id,
        RouteModel.school_id == school_id
    ).first()
    if not db_route_fee:
        raise HTTPException(status_code=404, detail="Route fee not found")

    update_data = route_fee.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_route_fee, key, value)

    db.commit()
    db.refresh(db_route_fee)
    return db_route_fee


@router.delete("/route-fees/{route_fee_id}", status_code=204, dependencies=[Depends(is_admin)])
def delete_route_fee(route_fee_id: uuid.UUID, db: Session = Depends(get_db), school_id: str = Depends(get_current_user_school)):
    """Delete a route fee — verifies ownership via route's school_id."""
    db_route_fee = db.query(RouteFeeModel).join(RouteModel).filter(
        RouteFeeModel.id == route_fee_id,
        RouteModel.school_id == school_id
    ).first()
    if not db_route_fee:
        raise HTTPException(status_code=404, detail="Route fee not found")

    db.delete(db_route_fee)
    db.commit()
    return {"message": "Route fee deleted"}


@router.post("/students/{student_id}/assign-route-fee", dependencies=[Depends(is_admin)])
def assign_route_fee_to_student(
    student_id: uuid.UUID,
    assignment: StudentRouteFeeAssignment,
    db: Session = Depends(get_db),
    school_id: str = Depends(get_current_user_school)
):
    """Assign route fee to a student when they're assigned to a route."""
    student = db.query(StudentModel).filter(StudentModel.id == student_id, StudentModel.school_id == school_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    route_fee = db.query(RouteFeeModel).filter(RouteFeeModel.id == assignment.route_fee_id).first()
    if not route_fee:
        raise HTTPException(status_code=404, detail="Route fee not found")

    # Check if already assigned
    existing = db.query(StudentRouteFeeStructureModel).filter(
        StudentRouteFeeStructureModel.student_id == student_id,
        StudentRouteFeeStructureModel.route_fee_id == assignment.route_fee_id,
        StudentRouteFeeStructureModel.academic_year == assignment.academic_year
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Route fee already assigned for this academic year")

    # Create route fee structure
    route_fee_structure = StudentRouteFeeStructureModel(
        id=uuid.uuid4(),
        student_id=student_id,
        route_fee_id=assignment.route_fee_id,
        academic_year=assignment.academic_year,
        total_amount=Decimal(str(route_fee.amount)),
        discount_amount=Decimal('0'),
        final_amount=Decimal(str(route_fee.amount)),
        amount_paid=Decimal('0'),
        outstanding_amount=Decimal(str(route_fee.amount))
    )

    db.add(route_fee_structure)
    db.flush()

    # Create installments if requested
    if assignment.create_installments and route_fee.installment_type:
        InstallmentService.create_installments(
            db=db,
            student_fee_structure_id=route_fee_structure.id,
            installment_type=route_fee.installment_type,
            start_date=date.today(),
            total_amount=route_fee_structure.final_amount
        )

    db.commit()

    return {"message": "Route fee assigned successfully", "structure_id": str(route_fee_structure.id)}