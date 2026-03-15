from pydantic import BaseModel, Field
import uuid
from typing import Optional, List

# Schema for Route
class RouteBase(BaseModel):
    route_name: str = Field(..., max_length=100)
    route_number: Optional[str] = Field(None, max_length=20)
    pickup_points: Optional[str] = None

class RouteCreate(RouteBase):
    school_id: uuid.UUID

class RouteUpdate(RouteBase):
    pass

class Route(RouteBase):
    id: uuid.UUID
    school_id: uuid.UUID

    class Config:
        orm_mode = True

# Schema for Vehicle
class VehicleBase(BaseModel):
    vehicle_number: str = Field(..., max_length=20)
    vehicle_type: Optional[str] = Field(None, max_length=50)
    capacity: Optional[int] = None
    driver_name: Optional[str] = Field(None, max_length=100)
    driver_phone: Optional[str] = Field(None, max_length=20)
    route_id: Optional[uuid.UUID] = None

class VehicleCreate(VehicleBase):
    school_id: uuid.UUID

class VehicleUpdate(VehicleBase):
    pass

class Vehicle(VehicleBase):
    id: uuid.UUID
    school_id: uuid.UUID

    class Config:
        orm_mode = True

# Schema for StudentRoute
class StudentRouteBase(BaseModel):
    student_id: uuid.UUID
    route_id: uuid.UUID
    pickup_point: Optional[str] = Field(None, max_length=200)
    academic_year: str

class StudentRouteCreate(StudentRouteBase):
    pass

class StudentRoute(StudentRouteBase):
    id: uuid.UUID
    school_id: uuid.UUID

    class Config:
        orm_mode = True

# Schema for RouteFee
class RouteFeeBase(BaseModel):
    route_id: uuid.UUID
    amount: float
    installment_type: Optional[str] = None
    fund_id: uuid.UUID
    academic_year: str

class RouteFeeCreate(RouteFeeBase):
    pass

class RouteFeeUpdate(BaseModel):
    amount: Optional[float] = None
    installment_type: Optional[str] = None
    fund_id: Optional[uuid.UUID] = None
    academic_year: Optional[str] = None

class RouteFee(RouteFeeBase):
    id: uuid.UUID

    class Config:
        orm_mode = True

# Schema for StudentRouteFeeAssignment
class StudentRouteFeeAssignment(BaseModel):
    route_fee_id: uuid.UUID
    academic_year: str
    create_installments: bool = False