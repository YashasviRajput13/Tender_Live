"""Database-backed task execution for deployments without a Celery worker."""

import logging
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from typing import Any

import models
from database import SessionLocal

logger = logging.getLogger(__name__)

_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="tender-task")
_stop_event = threading.Event()
_dispatcher_thread: threading.Thread | None = None
_running_tasks: set[str] = set()
_running_lock = threading.Lock()


def _task_registry() -> dict[str, Any]:
    from workers.discovery import run_tender_discovery
    from workers.document import process_tender_document
    from workers.eligibility import run_eligibility_matching
    from workers.report_gen import generate_reports

    return {
        "discovery": run_tender_discovery,
        "document_intel": process_tender_document,
        "analysis": run_eligibility_matching,
        "report": generate_reports,
    }


def _reset_interrupted_tasks() -> None:
    db = SessionLocal()
    try:
        db.query(models.AgentTask).filter(
            models.AgentTask.status == "running"
        ).update({"status": "pending"}, synchronize_session=False)
        db.commit()
    finally:
        db.close()


def _run_task(task_id: str, task_type: str, payload: dict[str, Any]) -> None:
    try:
        task_callable = _task_registry().get(task_type)
        if task_callable is None:
            raise ValueError(f"Unsupported persisted task type: {task_type}")

        task_callable.run(*payload.get("args", []), **payload.get("kwargs", {}))
    except Exception:
        logger.exception("Persisted task %s failed", task_id)
        db = SessionLocal()
        try:
            task = db.query(models.AgentTask).filter(
                models.AgentTask.id == task_id
            ).first()
            if task and task.status not in ("completed", "failed"):
                task.status = "failed"
                task.progress = 100
                db.commit()
        finally:
            db.close()
    finally:
        with _running_lock:
            _running_tasks.discard(task_id)


def _poll_tasks() -> None:
    while not _stop_event.is_set():
        db = SessionLocal()
        try:
            pending = (
                db.query(models.AgentTask)
                .filter(models.AgentTask.status == "pending")
                .order_by(models.AgentTask.created_at.asc())
                .limit(1)
                .first()
            )
            if pending:
                with _running_lock:
                    already_running = pending.id in _running_tasks
                    claimed = False
                    if not already_running:
                        claimed = (
                            db.query(models.AgentTask)
                            .filter(
                                models.AgentTask.id == pending.id,
                                models.AgentTask.status == "pending",
                            )
                            .update(
                                {"status": "running"},
                                synchronize_session=False,
                            )
                            == 1
                        )
                    if claimed:
                        _running_tasks.add(pending.id)
                if claimed:
                    db.commit()
                    _executor.submit(
                        _run_task,
                        pending.id,
                        pending.task_type,
                        pending.task_payload or {},
                    )
        except Exception:
            logger.exception("Task dispatcher poll failed")
        finally:
            db.close()
        _stop_event.wait(2)


def start() -> None:
    global _dispatcher_thread
    if _dispatcher_thread and _dispatcher_thread.is_alive():
        return
    _reset_interrupted_tasks()
    _stop_event.clear()
    _dispatcher_thread = threading.Thread(
        target=_poll_tasks, name="tender-task-dispatcher", daemon=True
    )
    _dispatcher_thread.start()
    logger.info("Database-backed task dispatcher started with one worker.")


def stop() -> None:
    _stop_event.set()
    _executor.shutdown(wait=False, cancel_futures=True)
