import threading
import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import models
import schemas
import auth
from database import get_db
from sse import sse_manager
from workers.discovery import run_tender_discovery
from workers.eligibility import run_eligibility_matching

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/tasks", tags=["Task Workflows"])


@router.post("/start", response_model=schemas.AgentTaskOut)
def start_task(
    req: schemas.TaskStartRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """
    Launch long-running Celery worker workflows (discovery scraper, eligibility analyzer).
    """
    task_id = str(uuid.uuid4())

    new_task = models.AgentTask(
        id=task_id,
        task_type=req.task_type,
        status="pending",
        progress=0,
        current_agent="scraper"
        if req.task_type == "discovery"
        else "eligibility_agent",
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    logger.info(
        f"Received task start request. task_type={req.task_type}, user={current_user.email}"
    )

    # 1. Trigger Discovery
    if req.task_type == "discovery":
        try:
            run_tender_discovery.delay(task_id)
            logger.info(f"Triggered background Tender Discovery. Task ID: {task_id}")
        except Exception as e:
            logger.warning(
                f"Redis/Celery unavailable, falling back to local discovery execution: {str(e)}"
            )
            threading.Thread(
                target=run_tender_discovery.run, args=(task_id,), daemon=True
            ).start()
            logger.info(f"Started local discovery thread for Task ID: {task_id}")

    # 2. Trigger Eligibility & Multi-agent Analysis
    elif req.task_type == "analysis":
        if not req.target_id:
            raise HTTPException(
                status_code=400,
                detail="target_id (tender database primary key) is required for analysis task.",
            )
        try:
            tender_db_id = int(req.target_id)
        except ValueError:
            raise HTTPException(
                status_code=400, detail="target_id must be a valid integer."
            )

        tender = (
            db.query(models.Tender).filter(models.Tender.id == tender_db_id).first()
        )
        if not tender:
            raise HTTPException(status_code=404, detail="Tender target not found.")

        company = (
            db.query(models.Company)
            .filter(models.Company.user_id == current_user.id)
            .first()
        )
        if not company:
            raise HTTPException(
                status_code=400, detail="Please create a Company Profile first."
            )

        # Trigger Celery match pipeline
        try:
            run_eligibility_matching.delay(task_id, tender.id, company.id)
            logger.info(
                f"Triggered background Multi-agent Analysis on Tender {tender.id}. Task ID: {task_id}"
            )
        except Exception as e:
            logger.warning(
                f"Redis/Celery unavailable, falling back to local analysis execution: {str(e)}"
            )
            threading.Thread(
                target=run_eligibility_matching.run,
                args=(task_id, tender.id, company.id),
                daemon=True,
            ).start()
            logger.info(f"Started local analysis thread for Task ID: {task_id}")

    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported task type: {req.task_type}. Use 'discovery' or 'analysis'.",
        )

    return new_task


@router.get("", response_model=List[schemas.AgentTaskOut])
def list_tasks(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """
    List all agent workflow tasks for the dashboard.
    """
    tasks = (
        db.query(models.AgentTask).order_by(models.AgentTask.created_at.desc()).all()
    )
    return tasks


@router.get("/stream/dashboard")
async def stream_dashboard_events(
    access_token: Optional[str] = Query(None), db: Session = Depends(get_db)
):
    """
    Establish a Server-Sent Events stream for global system events (tender_discovered, activity_log).
    Authenticated via access_token query parameter (EventSource API cannot set Authorization headers).
    Token is validated softly — expired tokens still receive the stream since task progress
    events are non-sensitive. The frontend handles re-auth separately via normal API 401s.
    """
    if access_token:
        try:
            auth.get_current_user_from_token(access_token, db)
        except Exception:
            logger.warning(
                "SSE stream: access_token invalid or expired — serving stream anyway."
            )
    else:
        logger.warning("SSE stream: no access_token provided.")

    return StreamingResponse(
        sse_manager.subscribe("dashboard_events"),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*",
        },
    )


@router.get("/{task_id}", response_model=schemas.AgentTaskOut)
def get_task_status(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """
    Check current state of an active worker task.
    """
    task = db.query(models.AgentTask).filter(models.AgentTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
    return task


@router.get("/{task_id}/stream")
async def stream_task_progress(task_id: str, db: Session = Depends(get_db)):
    """
    Establish a Server-Sent Events stream tracking single task execution.
    """
    task = db.query(models.AgentTask).filter(models.AgentTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")

    return StreamingResponse(
        sse_manager.subscribe(f"task:{task_id}"),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*",
        },
    )
