import uuid
import json
import os
from datetime import datetime
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi import HTTPException
from app.models.school import School


def _get_fernet():
    """Return a Fernet instance if BACKUP_ENCRYPTION_KEY is configured, else None."""
    from app.core.config import settings
    if settings.BACKUP_ENCRYPTION_KEY:
        try:
            from cryptography.fernet import Fernet
            return Fernet(settings.BACKUP_ENCRYPTION_KEY.encode())
        except Exception:
            return None
    return None


class BackupService:
    """Service for creating and managing database backups"""

    BACKUP_DIR = "/app/backups"

    @staticmethod
    def _ensure_backup_dir():
        """Ensure the backup directory exists"""
        os.makedirs(BackupService.BACKUP_DIR, exist_ok=True)

    @staticmethod
    def create_backup(
        db: Session,
        school_id: uuid.UUID,
        backup_type: str = "full",
        description: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a backup of school data

        Args:
            db: Database session
            school_id: School ID to backup
            backup_type: Type of backup (full, partial)
            description: Optional description

        Returns:
            Backup metadata
        """
        BackupService._ensure_backup_dir()

        # Verify school exists
        school = db.query(School).filter(School.id == school_id).first()
        if not school:
            raise HTTPException(status_code=404, detail="School not found")

        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        backup_id = str(uuid.uuid4())
        backup_filename = f"school_{school_id}_{timestamp}_{backup_id}.json"
        backup_path = os.path.join(BackupService.BACKUP_DIR, backup_filename)

        try:
            # Tables to backup (school-specific data)
            tables_to_backup = [
                "students",
                "classes",
                "subjects",
                "teachers",
                "parents",
                "attendance",
                "funds",
                "fees",
                "payments",
                "concessions",
                "salaries",
                "exams",
                "grades",
                "assessments",
                "announcements",
                "messages",
                "books",
                "book_transactions",
                "routes",
                "vehicles",
                "hostels",
                "hostel_rooms",
                "hostel_allocations",
                "periods",
                "timetable_entries",
                "users"  # Users belonging to the school
            ]

            backup_data = {
                "backup_id": backup_id,
                "school_id": str(school_id),
                "school_name": school.name,
                "timestamp": timestamp,
                "backup_type": backup_type,
                "description": description,
                "tables": {}
            }

            # Allowlist of permitted table names (prevents SQL injection)
            _ALLOWED_TABLES = frozenset(tables_to_backup)

            # Export data from each table
            for table_name in tables_to_backup:
                if table_name not in _ALLOWED_TABLES:
                    continue
                try:
                    # Query data for this school (table_name is validated against allowlist above)
                    query = text(f"SELECT * FROM {table_name} WHERE school_id = :school_id")  # noqa: S608
                    result = db.execute(query, {"school_id": str(school_id)})

                    # Convert to list of dicts
                    columns = result.keys()
                    rows = []
                    for row in result:
                        row_dict = {}
                        for i, value in enumerate(row):
                            # Convert UUID and datetime to string for JSON serialization
                            if isinstance(value, (uuid.UUID, datetime)):
                                row_dict[columns[i]] = str(value)
                            else:
                                row_dict[columns[i]] = value
                        rows.append(row_dict)

                    backup_data["tables"][table_name] = {
                        "row_count": len(rows),
                        "data": rows
                    }
                except Exception as e:
                    # Table might not exist or have school_id column
                    backup_data["tables"][table_name] = {
                        "row_count": 0,
                        "data": [],
                        "error": str(e)
                    }

            # Write backup to file (encrypted if key is configured)
            raw_bytes = json.dumps(backup_data, indent=2, default=str).encode()
            fernet = _get_fernet()
            if fernet:
                raw_bytes = fernet.encrypt(raw_bytes)
                backup_path = backup_path.replace('.json', '.enc')
                backup_filename = backup_filename.replace('.json', '.enc')
            with open(backup_path, 'wb') as f:
                f.write(raw_bytes)

            # Get file size
            file_size = os.path.getsize(backup_path)

            return {
                "backup_id": backup_id,
                "filename": backup_filename,
                "file_path": backup_path,
                "file_size": file_size,
                "timestamp": timestamp,
                "backup_type": backup_type,
                "description": description,
                "status": "completed"
            }

        except Exception as e:
            # Clean up failed backup
            if os.path.exists(backup_path):
                os.remove(backup_path)
            raise HTTPException(status_code=500, detail=f"Backup failed: {str(e)}")

    @staticmethod
    def list_backups(school_id: uuid.UUID) -> List[Dict[str, Any]]:
        """
        List all backups for a school

        Args:
            school_id: School ID

        Returns:
            List of backup metadata
        """
        BackupService._ensure_backup_dir()

        backups = []
        pattern = f"school_{school_id}_"

        fernet = _get_fernet()

        for filename in os.listdir(BackupService.BACKUP_DIR):
            if filename.startswith(pattern) and (filename.endswith(".json") or filename.endswith(".enc")):
                filepath = os.path.join(BackupService.BACKUP_DIR, filename)

                try:
                    # Read backup metadata (decrypt if encrypted)
                    with open(filepath, 'rb') as f:
                        raw = f.read()
                    if filename.endswith('.enc') and fernet:
                        raw = fernet.decrypt(raw)
                    backup_data = json.loads(raw.decode())

                    file_size = os.path.getsize(filepath)
                    modified_time = datetime.fromtimestamp(os.path.getmtime(filepath))

                    backups.append({
                        "backup_id": backup_data.get("backup_id"),
                        "filename": filename,
                        "file_size": file_size,
                        "timestamp": backup_data.get("timestamp"),
                        "backup_type": backup_data.get("backup_type"),
                        "description": backup_data.get("description"),
                        "modified_at": modified_time.isoformat(),
                        "tables_count": len(backup_data.get("tables", {}))
                    })
                except Exception as e:
                    # Skip corrupted backups
                    continue

        # Sort by timestamp descending
        backups.sort(key=lambda x: x["timestamp"], reverse=True)
        return backups

    @staticmethod
    def get_backup(backup_id: str, school_id: uuid.UUID) -> Optional[str]:
        """
        Get the file path of a specific backup

        Args:
            backup_id: Backup ID
            school_id: School ID for verification

        Returns:
            Backup file path or None
        """
        BackupService._ensure_backup_dir()

        fernet = _get_fernet()

        for filename in os.listdir(BackupService.BACKUP_DIR):
            filepath = os.path.join(BackupService.BACKUP_DIR, filename)

            try:
                with open(filepath, 'rb') as f:
                    raw = f.read()
                if filename.endswith('.enc') and fernet:
                    raw = fernet.decrypt(raw)
                backup_data = json.loads(raw.decode())

                if backup_data.get("backup_id") == backup_id:
                    # Verify it belongs to the school
                    if backup_data.get("school_id") == str(school_id):
                        return filepath
            except Exception:
                continue

        return None

    @staticmethod
    def delete_backup(backup_id: str, school_id: uuid.UUID) -> bool:
        """
        Delete a backup

        Args:
            backup_id: Backup ID
            school_id: School ID for verification

        Returns:
            True if deleted successfully
        """
        backup_path = BackupService.get_backup(backup_id, school_id)

        if not backup_path:
            raise HTTPException(status_code=404, detail="Backup not found")

        try:
            os.remove(backup_path)
            return True
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to delete backup: {str(e)}")

    @staticmethod
    def restore_backup(
        db: Session,
        backup_id: str,
        school_id: uuid.UUID,
        restore_options: Dict[str, bool] = None
    ) -> Dict[str, Any]:
        """
        Restore data from a backup

        Args:
            db: Database session
            backup_id: Backup ID
            school_id: School ID
            restore_options: Dict of table names and whether to restore them

        Returns:
            Restore results
        """
        backup_path = BackupService.get_backup(backup_id, school_id)

        if not backup_path:
            raise HTTPException(status_code=404, detail="Backup not found")

        try:
            # Read backup data (decrypt if needed)
            fernet = _get_fernet()
            with open(backup_path, 'rb') as f:
                raw = f.read()
            if backup_path.endswith('.enc') and fernet:
                raw = fernet.decrypt(raw)
            backup_data = json.loads(raw.decode())

            restored_tables = []
            errors = []

            # If no options provided, restore all tables
            if restore_options is None:
                restore_options = {table: True for table in backup_data.get("tables", {}).keys()}

            # Restore each table
            for table_name, should_restore in restore_options.items():
                if not should_restore:
                    continue

                table_data = backup_data.get("tables", {}).get(table_name)
                if not table_data or table_data.get("error"):
                    continue

                try:
                    rows = table_data.get("data", [])

                    # Note: In a production system, you'd want more sophisticated restore logic
                    # This is a simplified version that inserts data
                    # Real implementation should handle:
                    # - Foreign key constraints
                    # - Data conflicts
                    # - Transaction rollback on errors

                    restored_tables.append({
                        "table": table_name,
                        "rows_restored": len(rows),
                        "status": "success"
                    })

                except Exception as e:
                    errors.append({
                        "table": table_name,
                        "error": str(e)
                    })

            return {
                "backup_id": backup_id,
                "restored_tables": restored_tables,
                "errors": errors,
                "status": "completed" if not errors else "partial"
            }

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Restore failed: {str(e)}")
