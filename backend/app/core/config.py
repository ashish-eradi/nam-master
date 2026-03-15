from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    REFRESH_SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 600
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    # LICENSE_SECRET_KEY MUST be set via environment variable — no hardcoded default
    LICENSE_SECRET_KEY: str
    ENVIRONMENT: str = "development"
    # Fernet key for backup encryption — generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    # If not set, backups are stored unencrypted (acceptable in dev, not recommended in production)
    BACKUP_ENCRYPTION_KEY: str = ""

    class Config:
        env_file = ".env"

settings = Settings(_env_file='.env')

# CORS origins: read from env var CORS_ORIGINS (comma-separated) or fall back to local dev ports
_cors_env = os.getenv("CORS_ORIGINS", "")
if _cors_env.strip():
    BACKEND_CORS_ORIGINS = [o.strip() for o in _cors_env.split(",") if o.strip()]
else:
    # Development defaults — override with CORS_ORIGINS env var in production
    BACKEND_CORS_ORIGINS = [
        "http://localhost:8081",  # Family Portal
        "http://localhost:8082",  # School Portal
        "http://localhost:8083",  # SuperAdmin Portal
        "http://localhost:3000",
        "http://localhost:5173",
    ]
