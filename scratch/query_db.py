import sys
import os

# Set standard output encoding to utf-8 if possible
try:
    sys.stdout.reconfigure(encoding='utf-8')
except AttributeError:
    pass

# Add backend directory to Python path
sys.path.append(os.path.abspath("backend"))

from database import SessionLocal
import models

db = SessionLocal()

print("=== USERS ===")
users = db.query(models.User).all()
for u in users:
    print(f"ID: {u.id}, Email: {u.email}, Role: {u.role}")

print("\n=== COMPANIES ===")
companies = db.query(models.Company).all()
for c in companies:
    print(f"ID: {c.id}, Name: {c.name}, User ID: {c.user_id}")

print("\n=== AUDIT LOGS ===")
logs = db.query(models.AuditLog).order_by(models.AuditLog.created_at.desc()).limit(20).all()
for l in logs:
    print(f"ID: {l.id}, User ID: {l.user_id}, Action: {l.action}, Details: {l.details}, Created: {l.created_at}")

print("\n=== NOTIFICATIONS ===")
notifs = db.query(models.Notification).order_by(models.Notification.created_at.desc()).limit(20).all()
for n in notifs:
    # Safely encode and print to avoid CP1252 issues on Windows console
    title_safe = n.title.encode('ascii', 'replace').decode('ascii')
    message_safe = n.message.encode('ascii', 'replace').decode('ascii')
    print(f"ID: {n.id}, Company ID: {n.company_id}, Type: {n.type}, Title: {title_safe}, Created: {n.created_at}")

db.close()
