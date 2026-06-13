from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc
from typing import List, Optional
from decimal import Decimal
import models, schemas, auth
from database import get_db
import os
from datetime import datetime
from fastapi.responses import FileResponse
from config import settings
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

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
    query = db.query(models.Tender).options(joinedload(models.Tender.eligibility_reports))

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

    tenders = query.all()

    # Sort: analyzed tenders by opportunity_score desc, then unanalyzed by created_at desc
    def sort_key(t):
        best_score = max((r.opportunity_score for r in t.eligibility_reports), default=-1)
        return (best_score, t.created_at.timestamp())

    tenders.sort(key=sort_key, reverse=True)
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

@router.get("/{tender_id}/summary/download")
def download_single_tender_summary(
    tender_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Download a dynamically generated PDF summary for a specific tender.
    """
    tender = db.query(models.Tender).filter(models.Tender.id == tender_id).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")

    company = db.query(models.Company).filter(models.Company.user_id == current_user.id).first()
    report = None
    if company:
        report = db.query(models.EligibilityReport).filter(
            models.EligibilityReport.tender_id == tender.id,
            models.EligibilityReport.company_id == company.id
        ).first()

    has_ai_report = report is not None

    safe_tender_id = tender.tender_id.replace('/', '_')
    file_name = f"Tender_Summary_{safe_tender_id}.pdf"
    file_path = os.path.join(settings.UPLOAD_DIR, file_name)

    doc = SimpleDocTemplate(file_path, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    story = []
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle('CoverTitle', parent=styles['Heading1'], fontSize=20, textColor=colors.HexColor('#0F172A'), spaceAfter=15)
    h2_style = ParagraphStyle('SectionHeader', parent=styles['Heading2'], fontSize=14, textColor=colors.HexColor('#1E293B'), spaceBefore=15, spaceAfter=8)
    body_style = ParagraphStyle('RegularBody', parent=styles['Normal'], fontSize=10, textColor=colors.HexColor('#334155'), spaceAfter=6)

    # Header
    story.append(Paragraph("TenderAI Exclusive Summary", title_style))
    story.append(Paragraph(f"Generated on: {datetime.now().strftime('%d-%b-%Y %H:%M')}", body_style))
    story.append(Spacer(1, 15))

    # Basic Info
    story.append(Paragraph("<b>Tender Information</b>", h2_style))
    info_data = [
        ["Tender ID:", tender.tender_id],
        ["Tender Title:", tender.title],
        ["Organization Name:", tender.department or "Not specified"],
        ["Budget:", f"₹ {tender.budget:,.2f}" if tender.budget else "Not specified"],
        ["Deadline:", tender.deadline.strftime('%d %b %Y %H:%M') if tender.deadline else "Not specified"],
        ["Source Portal:", tender.source_name],
    ]
    info_table = Table(info_data, colWidths=[150, 350])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,-1), colors.HexColor('#F1F5F9')),
        ('TEXTCOLOR', (0,0), (-1,-1), colors.HexColor('#334155')),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 15))

    if tender.source_url:
        story.append(Paragraph(f"<b>Source URL:</b> <a href='{tender.source_url}' color='blue'>{tender.source_url}</a>", body_style))
        story.append(Spacer(1, 15))

    # AI Exec Summary
    story.append(Paragraph("<b>AI Executive Summary</b>", h2_style))
    if has_ai_report:
        story.append(Paragraph(report.summary or "No summary available.", body_style))
    else:
        story.append(Paragraph("<i>AI Summary unavailable, tender data exported successfully.</i>", body_style))
    story.append(Spacer(1, 15))

    # Eligibility Criteria
    story.append(Paragraph("<b>Eligibility Criteria</b>", h2_style))
    story.append(Paragraph(tender.eligibility_criteria or "None specified in basic data.", body_style))
    story.append(Spacer(1, 15))

    # Key Risks
    story.append(Paragraph("<b>Key Risks</b>", h2_style))
    if has_ai_report:
        risks = report.risk_analysis.get("risks", []) if getattr(report, "risk_analysis", None) else []
        if risks:
            for r in risks:
                story.append(Paragraph(f"• {r}", body_style))
        else:
            story.append(Paragraph("No significant risks identified.", body_style))
    else:
        story.append(Paragraph("<i>AI Risk Assessment unavailable.</i>", body_style))
    story.append(Spacer(1, 15))

    # AI Recommendation
    story.append(Paragraph("<b>AI Recommendation</b>", h2_style))
    if has_ai_report:
        recommendation = "STRONGLY RECOMMENDED" if report.eligibility.lower() == 'eligible' else ("MODERATELY RECOMMENDED" if report.eligibility.lower() == 'partially_eligible' else "NOT RECOMMENDED")
        color = "green" if report.eligibility.lower() == 'eligible' else ("orange" if report.eligibility.lower() == 'partially_eligible' else "red")
        story.append(Paragraph(f"Suitability Score: <b>{report.opportunity_score}/100</b>", body_style))
        story.append(Paragraph(f"Decision: <font color='{color}'><b>{recommendation}</b></font>", body_style))
    else:
        story.append(Paragraph("<i>AI Recommendation unavailable.</i>", body_style))

    doc.build(story)
    
    return FileResponse(
        file_path,
        media_type="application/pdf",
        filename=file_name,
        headers={"Content-Disposition": f'attachment; filename="{file_name}"'}
    )
