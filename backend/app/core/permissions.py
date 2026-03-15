from fastapi import Depends, HTTPException
from typing import List
from app.models.user import User
from app.api.deps import get_current_user

class RoleChecker:
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_user)):
        if current_user.role not in self.allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user

# Pre-configured dependency instances
is_superadmin = RoleChecker(["SUPERADMIN"])
is_admin = RoleChecker(["ADMIN"])
is_teacher = RoleChecker(["TEACHER"])
is_student = RoleChecker(["STUDENT"])
is_parent = RoleChecker(["PARENT"])

# Combined roles
is_admin_or_superadmin = RoleChecker(["ADMIN", "SUPERADMIN"])
is_admin_or_teacher = RoleChecker(["ADMIN", "TEACHER", "SUPERADMIN"])
