from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session, joinedload
from app.core.database import get_db
from app.schemas.user import UserLogin
from app.models.user import User as UserModel
from app.models.teacher import Teacher as TeacherModel
from app.core.security import verify_password, create_access_token, create_refresh_token, REFRESH_SECRET_KEY, ALGORITHM
from jose import jwt, JWTError
from app.services.audit_service import AuditService
from app.core.limiter import limiter
from app.core.config import settings

router = APIRouter()

@router.post("/login")
@limiter.limit("5/minute")
async def login(user: UserLogin, request: Request, db: Session = Depends(get_db)):
    db_user = db.query(UserModel).options(joinedload(UserModel.school)).filter(UserModel.email == user.email).first()
    if not db_user or not verify_password(user.password, db_user.password_hash):
        # Log failed login attempt if user exists
        if db_user and db_user.school_id:
            await AuditService.log_login(
                db=db,
                school_id=db_user.school_id,
                user_id=db_user.id,
                request=request,
                status="FAILED"
            )
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    if not db_user.is_active:
        raise HTTPException(status_code=401, detail="User is inactive")
    if not db_user.is_verified:
        raise HTTPException(status_code=401, detail="User is not verified")

    # Check if school is active (only for users who belong to a school)
    if db_user.school and not db_user.school.is_active:
        raise HTTPException(status_code=403, detail="Your school has been deactivated. Please contact the administrator.")

    # Check if school license is valid (skip for SUPERADMIN)
    if db_user.school and db_user.school.license_expires_at:
        from datetime import datetime, timezone
        if db_user.school.license_expires_at < datetime.now(timezone.utc):
            role_value = db_user.role.value if hasattr(db_user.role, 'value') else str(db_user.role)
            if role_value != "SUPERADMIN":
                raise HTTPException(status_code=403, detail="LICENSE_EXPIRED")

    access_token = create_access_token(data={"sub": db_user.email})
    refresh_token = create_refresh_token(data={"sub": db_user.email})

    # Build user profile
    user_profile = {
        "id": str(db_user.id),
        "email": db_user.email,
        "username": db_user.username,
        "full_name": db_user.full_name,
        "role": db_user.role.value if hasattr(db_user.role, 'value') else str(db_user.role),
        "school_id": str(db_user.school_id) if db_user.school_id else None,
        "school": {
            "id": str(db_user.school.id),
            "name": db_user.school.name,
            "logo_url": db_user.school.logo_url
        } if db_user.school else None,
        "employee_id": None
    }

    # If teacher, get employee_id
    if db_user.role.value == "TEACHER" or str(db_user.role) == "TEACHER":
        teacher = db.query(TeacherModel).filter(TeacherModel.user_id == db_user.id).first()
        if teacher:
            user_profile["employee_id"] = teacher.employee_id

    # If parent, get children data
    if db_user.role.value == "PARENT" or str(db_user.role) == "PARENT":
        from app.models.parent import Parent as ParentModel, ParentStudentRelation as ParentStudentRelationModel
        from app.models.student import Student as StudentModel

        parent = db.query(ParentModel).filter(
            ParentModel.user_id == db_user.id,
            ParentModel.school_id == db_user.school_id
        ).first()

        if parent:
            # Get all children linked to this parent
            relationships = db.query(ParentStudentRelationModel).options(
                joinedload(ParentStudentRelationModel.student).joinedload(StudentModel.class_)
            ).filter(
                ParentStudentRelationModel.parent_id == parent.id
            ).all()

            children = []
            for rel in relationships:
                student = rel.student
                children.append({
                    "id": str(student.id),
                    "first_name": student.first_name,
                    "last_name": student.last_name,
                    "admission_number": student.admission_number,
                    "class_": {
                        "name": student.class_.name if student.class_ else None,
                        "section": student.class_.section if student.class_ else None
                    } if student.class_ else None
                })

            user_profile["children"] = children

    # Log successful login
    if db_user.school_id:
        await AuditService.log_login(
            db=db,
            school_id=db_user.school_id,
            user_id=db_user.id,
            request=request,
            status="SUCCESS"
        )

    response = JSONResponse(content={
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user_profile
    })
    is_prod = settings.ENVIRONMENT == "production"
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite="none" if is_prod else "lax",
        secure=is_prod,
        max_age=60 * 60 * 8,  # 8 hours
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        samesite="none" if is_prod else "lax",
        secure=is_prod,
        max_age=60 * 60 * 24 * 7,  # 7 days
        path="/api/v1/auth/refresh",
    )
    return response

@router.post("/logout")
def logout(request: Request, db: Session = Depends(get_db)):
    from app.api.deps import get_current_user as _get_current_user
    try:
        _get_current_user(request, db)  # Validates the caller has a valid session
    except HTTPException:
        pass  # Still clear the cookie even if token is already expired
    response = JSONResponse(content={"message": "Logged out successfully"})
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/api/v1/auth/refresh")
    return response

@router.post("/refresh")
def refresh(request: Request, db: Session = Depends(get_db)):
    # Read refresh token from cookie or query param (backwards compat)
    token_value = request.cookies.get("refresh_token") or request.query_params.get("refresh_token")
    if not token_value:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    try:
        payload = jwt.decode(token_value, REFRESH_SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid refresh token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    user = db.query(UserModel).options(joinedload(UserModel.school)).filter(UserModel.email == email).first()
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    # Check if school is still active
    if user.school and not user.school.is_active:
        raise HTTPException(status_code=403, detail="Your school has been deactivated. Please contact the administrator.")

    # Check if school license is valid (skip for SUPERADMIN)
    if user.school and user.school.license_expires_at:
        from datetime import datetime, timezone
        if user.school.license_expires_at < datetime.now(timezone.utc):
            role_value = user.role.value if hasattr(user.role, 'value') else str(user.role)
            if role_value != "SUPERADMIN":
                raise HTTPException(status_code=403, detail="LICENSE_EXPIRED")

    access_token = create_access_token(data={"sub": user.email})
    response = JSONResponse(content={"access_token": access_token, "token_type": "bearer"})
    is_prod = settings.ENVIRONMENT == "production"
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite="none" if is_prod else "lax",
        secure=is_prod,
        max_age=60 * 60 * 8,
        path="/",
    )
    return response