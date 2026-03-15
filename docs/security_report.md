# Security & Gap Analysis Report

## Executive Summary
A comprehensive security and gap analysis was performed on the backend (FastAPI) and frontend (React) codebase. The most critical finding is an unauthenticated privilege escalation vulnerability in the registration endpoint that allows anyone to create a `SUPERADMIN` account. Several other architectural and security improvements are recommended to harden the platform.

---

## 🛑 Critical Vulnerabilities

### 1. Unauthenticated Privilege Escalation (Broken Access Control)
- **Location**: [backend/app/api/v1/auth.py](file:///c:/Users/ashish/Desktop/nam-master/backend/app/api/v1/auth.py) -> `@router.post("/register")`
- **Issue**: The `/register` endpoint has no authentication (`dependencies=[]`) and accepts the `role` and `school_id` fields directly from the user payload ([UserCreate](file:///c:/Users/ashish/Desktop/nam-master/backend/app/schemas/user.py#14-16) schema). A malicious actor can send a payload with `"role": "SUPERADMIN"` and `"school_id": null` to instantly create a superadmin account and take over the entire platform.
- **Recommendation**: 
  - Restrict the `/register` endpoint to only allow `ADMIN` or `SUPERADMIN` to create accounts, OR strictly hardcode the allowed registration role to a lower-privileged role (like a pending parent/student) and ignore the `role` field from user input.
  - Require a `SUPERADMIN` to explicitly provision school admins.

---

## ⚠️ High Risk Issues

### 2. JWT Storage in LocalStorage (Cross-Site Scripting Risk)
- **Location**: [frontend/school-portal/src/store/authSlice.ts](file:///c:/Users/ashish/Desktop/nam-master/frontend/school-portal/src/store/authSlice.ts)
- **Issue**: The frontend stores the [access_token](file:///c:/Users/ashish/Desktop/nam-master/backend/app/core/security.py#30-36) directly in `localStorage` (`localStorage.setItem('token', action.payload)`). If the application is ever vulnerable to Cross-Site Scripting (XSS), attackers can easily steal the tokens and impersonate users.
- **Recommendation**: Store JWT tokens in `HttpOnly`, `Secure`, `SameSite=Strict` cookies instead of localStorage, so that JavaScript cannot access them maliciously.

### 3. Lack of Rate Limiting on Authentication
- **Location**: [backend/app/api/v1/auth.py](file:///c:/Users/ashish/Desktop/nam-master/backend/app/api/v1/auth.py)
- **Issue**: There are no rate limits on the `/login` and `/register` endpoints. This leaves the system vulnerable to brute-force attacks and credential stuffing.
- **Recommendation**: Implement IP-based rate limiting (e.g., using `slowapi`) to block excessive failed login attempts or rapid account creations.

---

## 🟡 Medium Risk & Architectural Gaps

### 4. Weak Password Policies
- **Location**: [backend/app/schemas/user.py](file:///c:/Users/ashish/Desktop/nam-master/backend/app/schemas/user.py) / [auth.py](file:///c:/Users/ashish/Desktop/nam-master/backend/app/api/v1/auth.py)
- **Issue**: The [UserCreate](file:///c:/Users/ashish/Desktop/nam-master/backend/app/schemas/user.py#14-16) Pydantic schema expects a `password: str` but does not enforce any complexity rules (length, uppercase, numbers, symbols). During bulk import, predefined default passwords like `"Parent@123"` are used without forcing a password reset on first login.
- **Recommendation**: Add a Pydantic validator for password strength and add an `is_first_login` flag that forces users to change their password upon their first successful authentication.

### 5. Overly Permissive CORS Configuration
- **Location**: [backend/app/core/config.py](file:///c:/Users/ashish/Desktop/nam-master/backend/app/core/config.py) & [main.py](file:///c:/Users/ashish/Desktop/nam-master/backend/app/main.py)
- **Issue**: `CORSMiddleware` is configured with `allow_origins=BACKEND_CORS_ORIGINS`, which defaults to localhost ports but could be misconfigured in production. More importantly, it uses `allow_methods=["*"], allow_headers=["*"]` which is overly permissive.
- **Recommendation**: Restrict allowed methods (e.g., `["GET", "POST", "PUT", "DELETE"]`) and headers to only what is strictly necessary.

### 6. Missing Email Verification Flow
- **Location**: [backend/app/api/v1/auth.py](file:///c:/Users/ashish/Desktop/nam-master/backend/app/api/v1/auth.py)
- **Issue**: The `is_verified` flag is heavily relied upon, but the codebase manually sets it to `True` during creation. There is no actual mechanism to send verification emails and validate user ownership of the email address.
- **Recommendation**: Implement an email sending service and require users to click an ephemeral magic link with a token before toggling `is_verified` to `True`.

---

## ✅ Secure Practices Highlight (What is done well)
- **Password Hashing**: Uses `argon2` via `PasswordHasher()`, which is a strong, modern memory-hard cryptographic hash.
- **Proper SQL Parameterization**: Even in raw SQL queries ([backup_service.py](file:///c:/Users/ashish/Desktop/nam-master/backend/app/services/backup_service.py)), string interpolation is restricted to hardcoded table names, and explicit values use SQLAlchemy parameter binding (`:school_id`), mitigating SQL injection.
- **Audit Logging**: The system correctly logs failed and successful login attempts for school users to an Audit Service, aiding incident response.
