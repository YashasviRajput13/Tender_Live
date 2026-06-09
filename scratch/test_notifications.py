import os
import sys
from datetime import datetime, timedelta
from sqlalchemy import text, inspect

# Add backend directory to Python path
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend"))

import models
from database import engine, SessionLocal
from notifications.manager import NotificationManager

def run_tests():
    print("=== STARTING INTELLIGENT NOTIFICATION SYSTEM TESTS ===")
    
    # Trigger database schema migrations
    from main import startup_db_init
    startup_db_init()
    
    db = SessionLocal()
    
    # 1. Inspect Database Schema
    inspector = inspect(engine)
    columns = [col["name"] for col in inspector.get_columns("notifications")]
    print(f"Current notification columns in database: {columns}")
    assert "company_id" in columns, "Migration failed: company_id is missing!"
    assert "priority" in columns, "Migration failed: priority is missing!"
    assert "type" in columns, "Migration failed: type is missing!"
    print("OK DB columns verified successfully.")
    
    # Ensure we have a mock company and tender to test with
    company = db.query(models.Company).first()
    if not company:
        # Create mock company
        print("Creating mock company for test...")
        user = db.query(models.User).first()
        if not user:
            user = models.User(email="test@tenderai.com", hashed_password="dummy_hash", role="company_user")
            db.add(user)
            db.commit()
        company = models.Company(user_id=user.id, name="Test NexaTech")
        db.add(company)
        db.commit()
        
    tender = db.query(models.Tender).first()
    if not tender:
        # Create mock tender
        print("Creating mock tender for test...")
        tender = models.Tender(tender_id="TEND-TEST-101", title="Test Smart City Setup", budget=10000000.0, source_name="GeM")
        db.add(tender)
        db.commit()

    print(f"Testing with Company: {company.name} (ID: {company.id}), Tender: {tender.title} (ID: {tender.id})")

    # 2. Test Evidence Compilation
    eligibility_result = {
        "eligibility": "eligible",
        "financial_match": {"status": "pass", "details": "Turnover matches requirement"},
        "technical_match": {"status": "pass", "details": "ISO certifications verified"},
        "experience_match": {"status": "pass", "details": "3 Smart City projects found"}
    }
    score_result = 85
    tender_data = {"deadline": "2026-07-07T00:00:00"}
    
    trigger_reason, evidence = NotificationManager.compile_evidence("HIGH_MATCH", eligibility_result, score_result, tender_data)
    print(f"Evidence compiled: {evidence}")
    assert len(evidence) > 0, "Evidence should not be empty!"
    assert "Eligibility verdict evaluated as ELIGIBLE." in evidence
    print("OK Deterministic Evidence compilation verified.")

    # 3. Test Priority and Promotion Logic
    # Normal risk alert
    priority_high = NotificationManager.calculate_priority("RISK_ALERT", {"eligibility": "partially_eligible"})
    print(f"Standard Risk Alert Priority: {priority_high}")
    assert priority_high == "HIGH", "Risk alert base priority should be HIGH"
    
    # Escalated to CRITICAL due to not_eligible
    priority_crit_1 = NotificationManager.calculate_priority("RISK_ALERT", {"eligibility": "not_eligible"})
    print(f"Not Eligible Risk Alert Priority: {priority_crit_1}")
    assert priority_crit_1 == "CRITICAL", "Should promote to CRITICAL if eligibility is not_eligible"
    
    # Escalated due to missing certifications in technical match details
    elig_result_cert = {
        "eligibility": "partially_eligible",
        "technical_match": {"status": "fail", "details": "Missing ISO 27001 Certification"}
    }
    priority_crit_2 = NotificationManager.calculate_priority("RISK_ALERT", elig_result_cert)
    print(f"Missing Cert Risk Alert Priority: {priority_crit_2}")
    assert priority_crit_2 == "CRITICAL", "Should promote to CRITICAL if certifications are missing"
    print("OK Notification Priority and promotion verified.")

    # 4. Clear existing test notifications for this company and tender to start clean
    db.query(models.Notification).filter(
        models.Notification.company_id == company.id,
        models.Notification.tender_id == tender.id
    ).delete()
    db.query(models.AuditLog).filter(
        models.AuditLog.user_id == company.user_id
    ).delete()
    db.commit()

    # 5. Test Notification Generation & Deduplication
    company_data = {"name": company.name}
    tender_data_full = {"tender_id": tender.tender_id, "title": tender.title, "budget": float(tender.budget) if tender.budget is not None else 0.0}
    
    print("Running send_notification_manager (First execution)...")
    success = NotificationManager.send_notification_manager(
        db=db,
        event_type="HIGH_MATCH",
        company_data=company_data,
        tender_data=tender_data_full,
        eligibility_result=eligibility_result,
        score_result=score_result
    )
    assert success is True, "First execution should succeed."
    
    # Count notifications in database
    notif_count = db.query(models.Notification).filter(
        models.Notification.company_id == company.id,
        models.Notification.tender_id == tender.id,
        models.Notification.type == "HIGH_MATCH"
    ).count()
    assert notif_count == 1, f"Expected 1 notification, found {notif_count}"
    
    # Verify Audit logs
    audit_log = db.query(models.AuditLog).filter(
        models.AuditLog.user_id == company.user_id,
        models.AuditLog.action == "notification_created"
    ).first()
    assert audit_log is not None, "Audit log notification_created was not created!"
    print(f"Audit log found: {audit_log.action} Details: {audit_log.details}")
    
    print("Running send_notification_manager (Second execution - Deduplication check)...")
    success_dedup = NotificationManager.send_notification_manager(
        db=db,
        event_type="HIGH_MATCH",
        company_data=company_data,
        tender_data=tender_data_full,
        eligibility_result=eligibility_result,
        score_result=score_result
    )
    assert success_dedup is True, "Deduplicated execution should return True gracefully."
    
    # Count should still be 1
    notif_count_after = db.query(models.Notification).filter(
        models.Notification.company_id == company.id,
        models.Notification.tender_id == tender.id,
        models.Notification.type == "HIGH_MATCH"
    ).count()
    assert notif_count_after == 1, f"Deduplication failed! Found {notif_count_after} notifications."
    print("OK Notification Deduplication verified.")

    # 6. Test Email Throttling
    # We clear the notifications table so it's not deduplicated, and clear previous email audit logs
    db.query(models.Notification).filter(
        models.Notification.company_id == company.id,
        models.Notification.tender_id == tender.id
    ).delete()
    db.query(models.AuditLog).filter(
        models.AuditLog.user_id == company.user_id,
        models.AuditLog.action == "email_sent"
    ).delete()
    db.commit()
    
    # Insert a dummy "email_sent" audit log from 2 hours ago
    email_audit = models.AuditLog(
        user_id=company.user_id,
        action="email_sent",
        details={"tender_id": tender.id, "company_id": company.id, "type": "HIGH_MATCH"},
        created_at=datetime.utcnow() - timedelta(hours=2)
    )
    db.add(email_audit)
    db.commit()
    
    print("Running send_notification_manager (Email Throttling check)...")
    success_throttle = NotificationManager.send_notification_manager(
        db=db,
        event_type="HIGH_MATCH",
        company_data=company_data,
        tender_data=tender_data_full,
        eligibility_result=eligibility_result,
        score_result=score_result
    )
    assert success_throttle is True
    
    # Check that notification was created but another email_sent audit log was NOT created (since it was throttled)
    email_sent_count = db.query(models.AuditLog).filter(
        models.AuditLog.user_id == company.user_id,
        models.AuditLog.action == "email_sent"
    ).count()
    # Should still be 1 (the one we manually added 2 hours ago), not 2!
    assert email_sent_count == 1, f"Throttling failed! Expected 1 email audit log, found {email_sent_count}"
    print("OK Email Throttling verified.")

    db.close()
    print("=== ALL TESTS PASSED SUCCESSFULLY ===")

if __name__ == "__main__":
    run_tests()
