import logging
from datetime import datetime
from celery import shared_task
from database import SessionLocal
import models
from sse import sse_manager
import asyncio

logger = logging.getLogger(__name__)

@shared_task(name="workers.notifications.send_notification_task")
def send_notification_task(user_id: int, notification_id: int):
    """
    Worker task to simulate email dispatching and notify users.
    """
    db = SessionLocal()
    notif = db.query(models.Notification).filter(models.Notification.id == notification_id).first()
    user = db.query(models.User).filter(models.User.id == user_id).first()
    
    if not notif or not user:
        logger.error("Missing notification or user target in dispatch.")
        db.close()
        return False
        
    logger.info(f"Notification task triggered for User: {user.email}")
    
    try:
        # Simulate Email Dispatch in logs (satisfying real logging streams)
        logger.info(f"SIMULATED EMAIL DISPATCH OUTBOX:")
        logger.info(f"  TO: {user.email}")
        logger.info(f"  SUBJECT: TenderAI Notification Alert - {datetime.utcnow().strftime('%Y-%m-%d')}")
        logger.info(f"  BODY: Hello {user.full_name or 'User'},\n\nWe have updates for you:\n{notif.message}\n\nAccess your TenderAI Dashboard to review detailed AI reports.\n\nBest regards,\nTenderAI Agent Service")
        
        # Mark notification channel updated
        notif.channel = "email"
        db.commit()
        db.close()
        return True
    except Exception as e:
        logger.error(f"Failed in notification dispatch task: {str(e)}")
        db.close()
        return False
