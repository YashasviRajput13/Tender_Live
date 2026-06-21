import os
import uuid
import logging
import threading
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import models, schemas, auth
from database import get_db
from config import settings
from workers.report_gen import generate_reports
from services.evaluation_report_pdf import generate_evaluation_report

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/reports", tags=["Report Management"])

@router.post("", response_model=schemas.AgentTaskOut)
def trigger_report_compilation(
    format: str = Query("pdf", description="pdf or excel"),
    tender_id: int = Query(None, description="Optional tender ID for a specific tender report"),
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

    # Trigger worker task (with local thread fallback if Redis/Celery is unavailable)
    try:
        generate_reports.delay(task_id, format_type, company.id, tender_id)
        logger.info(f"Triggered background {format_type.upper()} report generation. Task ID: {task_id}")
    except Exception as celery_err:
        logger.warning(f"Redis/Celery unavailable for report task, falling back to local thread: {str(celery_err)}")
        threading.Thread(
            target=generate_reports.run,
            args=(task_id, format_type, company.id, tender_id),
            daemon=True
        ).start()
        logger.info(f"Started local report generation thread for Task ID: {task_id}")

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

@router.get("/evaluation/{tender_id}")
def download_evaluation_report(
    tender_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Download a detailed Evaluation Criteria Report (10 pages) for a specific tender.
    """
    tender = db.query(models.Tender).filter(models.Tender.id == tender_id).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")

    company = db.query(models.Company).filter(models.Company.user_id == current_user.id).first()
    if not company:
        raise HTTPException(
            status_code=400,
            detail="Company Profile not found. Please create one to generate reports."
        )

    report = db.query(models.EligibilityReport).filter(
        models.EligibilityReport.tender_id == tender.id,
        models.EligibilityReport.company_id == company.id
    ).first()

    # Even if report is None, we generate the PDF with calculated fallback defaults
    safe_tender_id = tender.tender_id.replace('/', '_')
    file_name = f"TenderLive_Evaluation_Report_{safe_tender_id}.pdf"
    file_path = os.path.join(settings.UPLOAD_DIR, file_name)

    # Generate the PDF
    try:
        generate_evaluation_report(tender, company, report, file_path)
    except Exception as e:
        logger.error(f"Error generating evaluation report: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate the evaluation report.")

    return FileResponse(
        file_path,
        media_type="application/pdf",
        filename=file_name,
        headers={"Content-Disposition": f'attachment; filename="{file_name}"'}
    )
