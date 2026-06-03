import os
import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import models, schemas, auth
from database import get_db
from config import settings
from workers.report_gen import generate_reports

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/reports", tags=["Report Management"])

@router.post("", response_model=schemas.AgentTaskOut)
def trigger_report_compilation(
    format: str = Query("pdf", description="pdf or excel"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Trigger background compilation of matching opportunities into a downloadable PDF or Excel sheet.
    """
    format_type = format.lower()
    if format_type not in ("pdf", "excel"):
        raise HTTPException(
            status_code=400,
            detail="Unsupported format type. Use 'pdf' or 'excel'."
        )

    company = db.query(models.Company).filter(models.Company.user_id == current_user.id).first()
    if not company:
        raise HTTPException(
            status_code=400,
            detail="Company Profile not found. Please create one to generate reports."
        )

    # Create task tracker
    task_id = str(uuid.uuid4())
    new_task = models.AgentTask(
        id=task_id,
        task_type="report",
        status="pending",
        progress=0,
        current_agent="completed"
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)

    # Trigger worker task
    generate_reports.delay(task_id, format_type, company.id)
    logger.info(f"Triggered background {format_type.upper()} report generation. Task ID: {task_id}")

    return new_task

@router.get("/download")
def download_report_file(
    file_name: str,
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Download a completed PDF or Excel catalog.
    """
    # Prevent directory traversal attacks by validating file prefix
    if not (file_name.startswith("TenderAI_Analysis_Brief_") or file_name.startswith("TenderAI_Catalog_")):
        raise HTTPException(
            status_code=403,
            detail="Forbidden. Access to system paths restricted."
        )
        
    file_path = os.path.join(settings.UPLOAD_DIR, file_name)
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=404,
            detail="Requested report file not found. It may have expired."
        )
        
    media_type = "application/pdf" if file_name.endswith(".pdf") else "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    
    return FileResponse(
        file_path,
        media_type=media_type,
        filename=file_name
    )
