import os
import sys
from celery import Celery

# Add current workspace directory to Python path to ensure module imports resolve correctly inside docker containers
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")

celery_instance = Celery(
    "tenderai_workers",
    broker=REDIS_URL,
    backend=REDIS_URL
)

celery_instance.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    # Configure task routing queues
    task_routes={
        "workers.discovery.run_tender_discovery": {"queue": "discovery"},
        "workers.document.process_tender_document": {"queue": "celery"},
        "workers.eligibility.run_eligibility_matching": {"queue": "celery"},
        "workers.report_gen.generate_reports": {"queue": "celery"},
        "workers.notifications.send_notification_task": {"queue": "celery"},
    },
    # Ensure tasks are acknowledged only after execution completes
    task_acks_late=True,
    worker_prefetch_multiplier=1
)

# Autodiscover tasks from the workers package
celery_instance.autodiscover_tasks([
    "workers.discovery",
    "workers.document",
    "workers.eligibility",
    "workers.report_gen",
    "workers.notifications"
])
