import uuid
import logging
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import models
import schemas
import auth
from database import get_db
from sse import sse_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/tasks", tags=["Task Workflows"])


@router.get("/stream/ticket")
def create_stream_ticket(
    current_user: models.User = Depends(auth.get_current_user),
):
    """Issue a short-lived token for browsers using the native EventSource API."""
    return {
        "token": auth.create_access_token(
            {"sub": current_user.email, "scope": "sse"},
            expires_delta=timedelta(minutes=2),
        )
    }


@router.post("/start", response_model=schemas.AgentTaskOut)
def start_task(
    req: schemas.TaskStartRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """
    Queue a durable workflow for the web-service task dispatcher.
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
        task_payload={"args": [task_id], "kwargs": {}},
    )
    db.add(new_task)
    logger.info(
        f"Received task start request. task_type={req.task_type}, user={current_user.email}"
    )

    if req.task_type == "discovery":
        new_task.task_payload = {"args": [task_id], "kwargs": {}}
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

        new_task.task_payload = {
            "args": [task_id, tender.id, company.id],
            "kwargs": {},
        }

    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported task type: {req.task_type}. Use 'discovery' or 'analysis'.",
        )

    db.commit()
    db.refresh(new_task)
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
    access_token: str = Query(...), db: Session = Depends(get_db)
):
    """
    Establish a Server-Sent Events stream for global system events (tender_discovered, activity_log).
    Authenticated with the same Bearer token as the rest of the API.
    """
    auth.get_current_user_from_token(access_token, db, required_scope="sse")

    return StreamingResponse(
        sse_manager.subscribe("dashboard_events"),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
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
async def stream_task_progress(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
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
        },
    )
