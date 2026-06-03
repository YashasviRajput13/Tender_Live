import os
import uuid
import shutil
import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
import models, schemas, auth
from database import get_db
from config import settings
from workers.document import process_tender_document

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/documents", tags=["Document Analyzer"])

@router.post("/analyze", response_model=schemas.AgentTaskOut)
def upload_tender_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Upload a tender PDF document, create a database tender record,
    and trigger the background AI layout parser task.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file format. Only PDF files are supported."
        )

    # 1. Save uploaded file to persistent storage directory
    file_id = str(uuid.uuid4())
    safe_filename = f"{file_id}_{file.filename}"
    saved_file_path = os.path.join(settings.UPLOAD_DIR, safe_filename)
    
    try:
        with open(saved_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        logger.info(f"File uploaded successfully and saved at: {saved_file_path}")
    except Exception as e:
        logger.error(f"Failed to save uploaded file: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save file: {str(e)}"
        )

    # 2. Create shell Tender record to map findings to
    # We populate basic identifiers; full details will be filled by the AI document agent.
    shell_tender = models.Tender(
        tender_id=f"UPLOAD-{file_id[:8].upper()}",
        title=f"Uploaded Document: {file.filename}",
        source_name="Manual Upload",
        status="discovered"
    )
    db.add(shell_tender)
    db.commit()
    db.refresh(shell_tender)

    # 3. Create Celery task
    task_id = str(uuid.uuid4())
    new_task = models.AgentTask(
        id=task_id,
        task_type="document_intel",
        status="pending",
        progress=0,
        current_agent="document_intel"
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)

    # 4. Trigger Celery worker pipeline
    process_tender_document.delay(task_id, shell_tender.id, saved_file_path)
    logger.info(f"Triggered background Document analysis task {task_id} for Tender {shell_tender.id}")

    return new_task
