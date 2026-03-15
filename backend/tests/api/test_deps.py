
import pytest
from fastapi import HTTPException
from jose import jwt
from app.api.deps import get_current_user, get_current_user_school
from app.core.security import SECRET_KEY, ALGORITHM
from unittest.mock import MagicMock

def test_get_current_user_invalid_token():
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(token="invalid_token", db=MagicMock())
    assert exc_info.value.status_code == 401

def test_get_current_user_no_email():
    token = jwt.encode({}, SECRET_KEY, algorithm=ALGORITHM)
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(token=token, db=MagicMock())
    assert exc_info.value.status_code == 401

def test_get_current_user_user_not_found():
    db_session = MagicMock()
    db_session.query.return_value.filter.return_value.first.return_value = None
    token = jwt.encode({"sub": "test@test.com"}, SECRET_KEY, algorithm=ALGORITHM)
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(token=token, db=db_session)
    assert exc_info.value.status_code == 401

def test_get_current_user_school_superadmin():
    user = MagicMock()
    user.role = "SUPERADMIN"
    school_id = get_current_user_school(current_user=user)
    assert school_id is None

def test_get_current_user_school_non_superadmin():
    user = MagicMock()
    user.role = "ADMIN"
    user.school_id = "test_school_id"
    school_id = get_current_user_school(current_user=user)
    assert school_id == "test_school_id"
