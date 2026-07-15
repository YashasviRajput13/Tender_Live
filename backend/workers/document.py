import os
import logging
import threading
from datetime import datetime
from celery import shared_task
from database import SessionLocal
import models
from services.document_agent import DocumentAgent
from sse import trigger_task_update
import asyncio

logger = logging.getLogger(__name__)


def _fire_task_update(task_id, progress, status, agent, message, logs):
    """Run trigger_task_update in a fresh event loop — safe to call from threads."""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(
            trigger_task_update(task_id, progress, status, agent, message, logs)
        )
    except Exception as e:
        logger.warning(f"SSE update failed (non-critical): {str(e)}")
    finally:
        try:
            loop.close()
        except Exception:
            pass


@shared_task(name="workers.document.process_tender_document")
def process_tender_document(task_id: str, tender_db_id: int, file_path: str):
    """
    Extract text from tender PDF, run AI parsing, save structured content,
    and trigger eligibility analysis.
    """
    db = SessionLocal()
    task = db.query(models.AgentTask).filter(models.AgentTask.id == task_id).first()

    if not task:
        logger.error(f"Task with ID {task_id} not found in database.")
        db.close()
        return False

    tender = db.query(models.Tender).filter(models.Tender.id == tender_db_id).first()
    if not tender:
        logger.error(f"Tender with ID {tender_db_id} not found in database.")
        db.close()
        return False

    task.status = "running"
    task.current_agent = "document_intel"
    task.progress = 10
    log_messages = [
        {
            "timestamp": str(datetime.utcnow()),
            "level": "INFO",
            "message": f"Document Processing started for file: {os.path.basename(file_path)}",
        }
    ]
    task.log_messages = log_messages
    db.commit()

    _fire_task_update(
        task_id,
        10,
        "running",
        "document_intel",
        "Document processing started",
        log_messages,
    )

    try:
        # Check if file exists
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Tender PDF not found at: {file_path}")

        log_messages.append(
            {
                "timestamp": str(datetime.utcnow()),
                "level": "INFO",
                "message": "Extracting text layers and running OCR...",
            }
        )
        task.log_messages = log_messages
        db.commit()
        _fire_task_update(
            task_id,
            30,
            "running",
            "document_intel",
            "Extracting PDF text layers...",
            log_messages,
        )

        # Run document agent
        agent = DocumentAgent()
        structured_data = agent.analyze_document(file_path)

        log_messages.append(
            {
                "timestamp": str(datetime.utcnow()),
                "level": "INFO",
                "message": "Gemini PDF analysis finished. Parsing fields...",
            }
        )
        task.log_messages = log_messages
        db.commit()
        _fire_task_update(
            task_id,
            70,
            "running",
            "document_intel",
            "Structuring criteria JSON...",
            log_messages,
        )

        # Save to Tender Documents
        doc_record = models.TenderDocument(
            tender_id=tender.id,
            file_name=os.path.basename(file_path),
            file_path=file_path,
            doc_type="PDF",
            size_bytes=os.path.getsize(file_path),
            parsed_json=structured_data,
        )
        db.add(doc_record)

        # Update tender fields if they are empty
        if (
            structured_data.get("tender_title")
            and structured_data.get("tender_title") != "Unknown"
        ):
            tender.title = f"Analyzed: {structured_data.get('tender_title')}"
        if structured_data.get("qualification_criteria"):
            tender.eligibility_criteria = "\n".join(
                structured_data.get("qualification_criteria")
            )

        tender.status = "processing"
        db.commit()

        log_messages.append(
            {
                "timestamp": str(datetime.utcnow()),
                "level": "INFO",
                "message": "Document record saved successfully.",
            }
        )
        task.progress = 100
        task.status = "completed"
        task.current_agent = "completed"
        task.log_messages = log_messages
        db.commit()

        _fire_task_update(
            task_id,
            100,
            "completed",
            "completed",
            "Document analyzed. Triggering eligibility pipeline...",
            log_messages,
        )

        # Auto-trigger Eligibility Worker Task!
        # Create a new AgentTask for Eligibility Analysis
        eligibility_task = models.AgentTask(
            task_type="analysis",
            status="pending",
            progress=0,
            current_agent="eligibility_agent",
        )
        db.add(eligibility_task)
        db.commit()

        from workers.eligibility import run_eligibility_matching

        try:
            run_eligibility_matching.delay(eligibility_task.id, tender.id)
            logger.info(f"Triggered eligibility task {eligibility_task.id} via Celery.")
        except Exception as celery_err:
            logger.warning(
                f"Redis unavailable for eligibility dispatch, falling back to thread: {str(celery_err)}"
            )
            threading.Thread(
                target=run_eligibility_matching.run,
                args=(eligibility_task.id, tender.id),
                daemon=True,
            ).start()

        db.close()
        return True

    except Exception as e:
        logger.exception("Failed in process_tender_document task")
        log_messages.append(
            {
                "timestamp": str(datetime.utcnow()),
                "level": "ERROR",
                "message": f"Error parsing document: {str(e)}",
            }
        )
        task.status = "failed"
        task.progress = 100
        task.current_agent = "completed"
        task.log_messages = log_messages
        db.commit()

        _fire_task_update(
            task_id,
            100,
            "failed",
            "completed",
            f"Document processing failed: {str(e)}",
            log_messages,
        )
        db.close()
        return False
