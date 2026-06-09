import sys
import os

# Add backend directory to Python path
sys.path.append(os.path.abspath("backend"))

from database import SessionLocal
import models

db = SessionLocal()

print("Deleting all 'email_sent' audit logs to reset throttling...")
num_deleted = db.query(models.AuditLog).filter(models.AuditLog.action == "email_sent").delete()
db.commit()

print(f"Successfully deleted {num_deleted} 'email_sent' audit log record(s).")
db.close()