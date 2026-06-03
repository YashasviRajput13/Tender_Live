from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from decimal import Decimal
import models, schemas, auth
from database import get_db

router = APIRouter(prefix="/api/tenders", tags=["Tenders Database"])

@router.get("", response_model=List[schemas.TenderOut])
def list_tenders(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
    source: Optional[str] = Query(None, description="Filter by GeM or CPPP"),
    status: Optional[str] = Query(None, description="Filter by status discovered, processing, analyzed"),
    min_budget: Optional[Decimal] = Query(None, description="Min budget threshold"),
    max_budget: Optional[Decimal] = Query(None, description="Max budget threshold"),
    search: Optional[str] = Query(None, description="Search by title or ID")
):
    """
    Fetch crawled tenders using dynamic filter parameters.
    """
    query = db.query(models.Tender)
    
    if source:
        query = query.filter(models.Tender.source_name.ilike(source))
    if status:
        query = query.filter(models.Tender.status == status)
    if min_budget:
        query = query.filter(models.Tender.budget >= min_budget)
    if max_budget:
        query = query.filter(models.Tender.budget <= max_budget)
    if search:
        query = query.filter(
            (models.Tender.title.ilike(f"%{search}%")) |
            (models.Tender.tender_id.ilike(f"%{search}%")) |
            (models.Tender.department.ilike(f"%{search}%"))
        )
        
    tenders = query.order_by(models.Tender.created_at.desc()).all()
    return tenders

@router.get("/{tender_id}", response_model=dict)
def get_tender_detail(
    tender_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Get full details for a specific tender, including its AI eligibility report (if available).
    """
    tender = db.query(models.Tender).filter(models.Tender.id == tender_id).first()
    if not tender:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tender record not found."
        )
        
    company = db.query(models.Company).filter(models.Company.user_id == current_user.id).first()
    report = None
    if company:
        report = db.query(models.EligibilityReport).filter(
            models.EligibilityReport.tender_id == tender.id,
            models.EligibilityReport.company_id == company.id
        ).first()
        
    # Serialize response manually to merge tender fields with eligibility report
    tender_schema = schemas.TenderOut.model_validate(tender)
    
    report_data = None
    if report:
        report_data = schemas.EligibilityReportOut.model_validate(report)
        
    return {
        "tender": tender_schema,
        "eligibility_report": report_data
    }
