from fastapi import FastAPI, Request, status, Depends
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import logging
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.limiter import limiter

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from app.api.v1 import auth
from app.db.base import Base
from app.core.database import engine

# Removed: from app.core.config import settings
from app.core.config import BACKEND_CORS_ORIGINS # Import the hardcoded origins

app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Content-Type", "Authorization", "Accept", "X-Requested-With"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"Request: {request.method} {request.url}")
    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        try:
            body = await request.json()
            _REDACT_KEYS = {"password", "password_hash", "token", "access_token", "refresh_token", "sms_api_key", "api_key", "auth_token", "account_sid"}
            if isinstance(body, dict):
                body = {k: ("***" if k in _REDACT_KEYS else v) for k, v in body.items()}
            logger.info(f"Request body: {body}")
        except Exception:
            logger.info("Could not parse JSON body")
    response = await call_next(request)
    return response

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"Validation error for {request.method} {request.url}: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()},
    )

from app.api.v1 import auth, schools, students, classes, subjects, attendance, finance, finance_extended, exams, announcements, messages, parents, library, transport, hostel, timetable, reports, dashboard, teachers, uploads, calendar, audit_logs, backups, role_dashboards, bulk_operations, licenses, miscellaneous, notifications, whatsapp_webhook
from app.api.v1 import users

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(schools.router, prefix="/api/v1/schools", tags=["schools"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(students.router, prefix="/api/v1/students", tags=["students"])
app.include_router(classes.router, prefix="/api/v1/classes", tags=["classes"])
app.include_router(subjects.router, prefix="/api/v1/subjects", tags=["subjects"])
app.include_router(attendance.router, prefix="/api/v1/attendance", tags=["attendance"])
app.include_router(finance.router, prefix="/api/v1/finance", tags=["finance"])
app.include_router(finance_extended.router, prefix="/api/v1/finance-extended", tags=["finance-extended"])
app.include_router(exams.router, prefix="/api/v1/exams", tags=["exams"])
app.include_router(announcements.router, prefix="/api/v1/announcements", tags=["announcements"])
app.include_router(messages.router, prefix="/api/v1/messages", tags=["messages"])
app.include_router(parents.router, prefix="/api/v1/parents", tags=["parents"])
app.include_router(library.router, prefix="/api/v1/library", tags=["library"])
app.include_router(transport.router, prefix="/api/v1/transport", tags=["transport"])
app.include_router(hostel.router, prefix="/api/v1/hostel", tags=["hostel"])
app.include_router(miscellaneous.router, prefix="/api/v1/miscellaneous", tags=["miscellaneous"])
app.include_router(timetable.router, prefix="/api/v1/timetable", tags=["timetable"])
app.include_router(calendar.router, prefix="/api/v1/calendar", tags=["calendar"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["reports"])
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["dashboard"])
app.include_router(teachers.router, prefix="/api/v1/teachers", tags=["teachers"])
app.include_router(uploads.router, prefix="/api/v1/uploads", tags=["uploads"])
app.include_router(audit_logs.router, prefix="/api/v1/audit-logs", tags=["audit-logs"])
app.include_router(backups.router, prefix="/api/v1/backups", tags=["backups"])
app.include_router(role_dashboards.router, prefix="/api/v1/role-dashboards", tags=["role-dashboards"])
app.include_router(bulk_operations.router, prefix="/api/v1/bulk-operations", tags=["bulk-operations"])
app.include_router(licenses.router, prefix="/api/v1/licenses", tags=["licenses"])
app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["notifications"])
app.include_router(whatsapp_webhook.router, prefix="/api/v1/webhook", tags=["webhook"])

UPLOAD_DIR = Path("/app/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

@app.get("/api/v1/health")
def health_check():
    return {"status": "ok"}

@app.get("/")
def read_root():
    return {"Hello": "World"}
