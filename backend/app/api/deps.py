import logging
import traceback
from fastapi import Depends, HTTPException, status, Request
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.core.security import SECRET_KEY, ALGORITHM

logger = logging.getLogger(__name__)

def get_current_user(request: Request, db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )

    # Try HttpOnly cookie first, then fall back to Authorization header
    token_value = request.cookies.get("access_token")
    if not token_value:
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            logger.warning("No access_token cookie or Authorization header found.")
            raise credentials_exception
        try:
            token_type, token_value = auth_header.split()
            if token_type.lower() != "bearer":
                logger.warning(f"Invalid token type: {token_type}")
                raise credentials_exception
        except ValueError:
            logger.warning("Token split error.")
            raise credentials_exception

    try:
        payload = jwt.decode(token_value, SECRET_KEY, algorithms=[ALGORITHM]) # Removed leeway=10
        email: str = payload.get("sub")
        if email is None:
            logger.warning("Email (sub) claim missing from token payload.")
            raise credentials_exception
        logger.info(f"Decoded email from token: '{email}'")
    except JWTError as e:
        logger.error(f"JWT decoding error: {e}. Full traceback: {traceback.format_exc()}") # Added traceback
        raise credentials_exception
    
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        logger.warning(f"User with email '{email}' not found in database.")
        raise credentials_exception
    
    logger.info(f"User '{user.email}' successfully authenticated.")
    return user

def get_current_user_school(current_user: User = Depends(get_current_user)):
    if current_user.role == "SUPERADMIN":
        return None
    return current_user.school_id


def check_school_license(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Dependency that checks if the user's school has a valid license.
    SUPERADMINs are exempt from license checks."""
    role_value = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
    if role_value == "SUPERADMIN":
        return current_user
    if current_user.school_id:
        from app.models.school import School
        from datetime import datetime, timezone
        school = db.query(School).filter(School.id == current_user.school_id).first()
        if school and school.license_expires_at:
            if school.license_expires_at < datetime.now(timezone.utc):
                raise HTTPException(status_code=403, detail="LICENSE_EXPIRED")
    return current_user
