import logging
from celery import shared_task
from database import SessionLocal
from notifications.manager import NotificationManager

logger = logging.getLogger(__name__)

@shared_task(name="workers.notifications.send_notification_task")

def send_notification_task(
    event_type: str,
    company_data: dict,
    tender_data: dict,
    eligibility_result: dict,
    score_result: int
):
    
    logger.info("=" * 80)
    logger.info(f"NOTIFICATION TASK RECEIVED: {event_type}")
    logger.info("=" * 80)
    """
    Asynchronous task to run rules and dispatch notifications.
    """
    logger.info(f"Notification worker task received for type: {event_type}")
    db = SessionLocal()
    try:
        success = NotificationManager.send_notification_manager(
            db=db,
            event_type=event_type,
            company_data=company_data,
            tender_data=tender_data,
            eligibility_result=eligibility_result,
            score_result=score_result
        )
        return success
    except Exception as e:
        logger.exception(f"Exception during notification delivery: {str(e)}")
        return False
    finally:
        db.close()
