import os
import logging
import threading
from datetime import datetime
from decimal import Decimal
from celery import shared_task
from database import SessionLocal
import models
from config import settings
import pandas as pd
from sse import trigger_task_update
import asyncio

# ReportLab libraries for PDF assembly
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

logger = logging.getLogger(__name__)

def _fire_task_update(task_id, progress, status, agent, message, logs):
    """Run trigger_task_update in a fresh event loop — safe to call from threads."""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(trigger_task_update(task_id, progress, status, agent, message, logs))
    except Exception as e:
        logger.warning(f"SSE update failed (non-critical): {str(e)}")
    finally:
        try:
            loop.close()
        except Exception:
            pass

@shared_task(name="workers.report_gen.generate_reports")
def generate_reports(task_id: str, format_type: str = "pdf", company_id: int = None):
    """
    Generate PDF or Excel report files summarizing crawled tenders and multi-agent scores.
    """
    db = SessionLocal()
    task = db.query(models.AgentTask).filter(models.AgentTask.id == task_id).first()
    
    if not task:
        logger.error(f"Task with ID {task_id} not found in database.")
        db.close()
        return False

    task.status = "running"
    task.current_agent = "completed"
    task.progress = 10
    log_messages = [{"timestamp": str(datetime.utcnow()), "level": "INFO", "message": f"Report Generation started. Format: {format_type.upper()}"}]
    task.log_messages = log_messages
    db.commit()
    
    _fire_task_update(task_id, 10, "running", "completed", "Generating reports...", log_messages)

    try:
        # Fetch target company
        if company_id:
            company = db.query(models.Company).filter(models.Company.id == company_id).first()
        else:
            company = db.query(models.Company).first()

        if not company:
            raise ValueError("No active Company Profile found to map reports against.")

        timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        if format_type.lower() == "pdf":
            file_name = f"TenderAI_Analysis_Brief_{timestamp_str}.pdf"
            file_path = os.path.join(settings.UPLOAD_DIR, file_name)
            
            # Fetch all analyzed reports
            reports = db.query(models.EligibilityReport).filter(models.EligibilityReport.company_id == company.id).all()
            
            log_messages.append({"timestamp": str(datetime.utcnow()), "level": "INFO", "message": f"Assembling {len(reports)} tender matches into PDF briefing templates..."})
            task.log_messages = log_messages
            db.commit()
            _fire_task_update(task_id, 40, "running", "completed", "Assembling PDF components...", log_messages)

            # Build ReportLab Doc
            doc = SimpleDocTemplate(file_path, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
            story = []
            
            styles = getSampleStyleSheet()
            
            # Define custom styles
            title_style = ParagraphStyle(
                'CoverTitle',
                parent=styles['Heading1'],
                fontSize=24,
                textColor=colors.HexColor('#0F172A'),
                spaceAfter=15
            )
            h2_style = ParagraphStyle(
                'SectionHeader',
                parent=styles['Heading2'],
                fontSize=16,
                textColor=colors.HexColor('#1E293B'),
                spaceBefore=15,
                spaceAfter=8
            )
            body_style = ParagraphStyle(
                'RegularBody',
                parent=styles['Normal'],
                fontSize=10,
                textColor=colors.HexColor('#334155'),
                spaceAfter=6
            )
            
            # Cover Page
            story.append(Paragraph("TenderAI Opportunity Assessment Brief", title_style))
            story.append(Paragraph(f"Prepared for: <b>{company.name}</b>", body_style))
            story.append(Paragraph(f"Generated on: {datetime.now().strftime('%d-%b-%Y %H:%M')}", body_style))
            story.append(Paragraph(f"Active Opportunity matches evaluated: <b>{len(reports)}</b>", body_style))
            story.append(Spacer(1, 15))
            
            # Core Opportunity Overview Table
            table_data = [["Tender ID", "Title", "Eligibility", "Opportunity Score"]]
            for r in reports:
                tender_obj = db.query(models.Tender).filter(models.Tender.id == r.tender_id).first()
                if tender_obj:
                    table_data.append([
                        tender_obj.tender_id,
                        tender_obj.title[:40] + "..." if len(tender_obj.title) > 40 else tender_obj.title,
                        r.eligibility.upper(),
                        f"{r.opportunity_score}/100"
                    ])
                    
            opp_table = Table(table_data, colWidths=[100, 220, 100, 100])
            opp_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1E293B')),
                ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
                ('ALIGN', (0,0), (-1,-1), 'LEFT'),
                ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                ('BOTTOMPADDING', (0,0), (-1,0), 6),
                ('BACKGROUND', (0,1), (-1,-1), colors.HexColor('#F8FAFC')),
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
                ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F1F5F9')]),
                ('FONTSIZE', (0,0), (-1,-1), 9),
            ]))
            story.append(opp_table)
            story.append(Spacer(1, 15))
            story.append(PageBreak())
            
            # Detailed Breakdown Page for each
            for r in reports:
                tender_obj = db.query(models.Tender).filter(models.Tender.id == r.tender_id).first()
                if not tender_obj:
                    continue
                    
                story.append(Paragraph(f"Tender Opportunity: {tender_obj.tender_id}", h2_style))
                story.append(Paragraph(f"<b>Title:</b> {tender_obj.title}", body_style))
                story.append(Paragraph(f"<b>Department:</b> {tender_obj.department}", body_style))
                story.append(Paragraph(f"<b>Budget:</b> ₹ {tender_obj.budget:,.2f}" if tender_obj.budget else "<b>Budget:</b> Not specified", body_style))
                story.append(Paragraph(f"<b>Eligibility Verdict:</b> <font color='red'><b>{r.eligibility.upper()}</b></font> (Confidence Score: {r.confidence_score*100:.1f}%)", body_style))
                story.append(Paragraph(f"<b>Opportunity Match Rating:</b> <b>{r.opportunity_score}/100</b>", body_style))
                story.append(Spacer(1, 8))
                
                # Executive summary
                story.append(Paragraph("<b>AI Summary & Action Requirements:</b>", body_style))
                story.append(Paragraph(r.summary or "No summary available.", body_style))
                story.append(Spacer(1, 6))
                
                # Compliance Checklist
                checklist_items = r.checklist.get("submission_checklist", [])
                if checklist_items:
                    story.append(Paragraph("<b>Required Submission Checklist Documents:</b>", body_style))
                    for item in checklist_items[:5]: # top 5
                        story.append(Paragraph(f"• {item}", body_style))
                
                # Risk Analysis
                risk_items = r.risk_analysis.get("risks", [])
                if risk_items:
                    story.append(Spacer(1, 6))
                    story.append(Paragraph("<b>Identified Bid & Execution Risks:</b>", body_style))
                    for risk in risk_items[:4]:
                        story.append(Paragraph(f"• {risk}", body_style))
                        
                story.append(Spacer(1, 15))
                story.append(Paragraph("-" * 80, body_style))
                story.append(Spacer(1, 10))
                
            doc.build(story)
            logger.info(f"PDF Analysis Brief compiled successfully: {file_path}")

        elif format_type.lower() == "excel":
            file_name = f"TenderAI_Catalog_{timestamp_str}.xlsx"
            file_path = os.path.join(settings.UPLOAD_DIR, file_name)
            
            # Build dataset using Pandas
            reports = db.query(models.EligibilityReport).filter(models.EligibilityReport.company_id == company.id).all()
            
            log_messages.append({"timestamp": str(datetime.utcnow()), "level": "INFO", "message": f"Mapping {len(reports)} matching items into Excel catalogs..."})
            task.log_messages = log_messages
            db.commit()
            _fire_task_update(task_id, 40, "running", "completed", "Assembling Excel columns...", log_messages)

            records = []
            for r in reports:
                tender_obj = db.query(models.Tender).filter(models.Tender.id == r.tender_id).first()
                if tender_obj:
                    records.append({
                        "Tender ID": tender_obj.tender_id,
                        "Title": tender_obj.title,
                        "Department": tender_obj.department,
                        "Location": tender_obj.location,
                        "Budget (INR)": float(tender_obj.budget) if tender_obj.budget else None,
                        "Deadline": tender_obj.deadline.strftime("%Y-%m-%d %H:%M") if tender_obj.deadline else "Not specified",
                        "Eligibility Status": r.eligibility.upper(),
                        "Confidence Score": r.confidence_score,
                        "Opportunity Suitability Score": r.opportunity_score,
                        "Discovery Date": tender_obj.created_at.strftime("%Y-%m-%d")
                    })
                    
            df = pd.DataFrame(records)
            df.to_excel(file_path, index=False, sheet_name="Tender Opportunities")
            logger.info(f"Excel Opportunity Catalog compiled successfully: {file_path}")
            
        else:
            raise ValueError(f"Unsupported report format: {format_type}")

        # Complete task
        log_messages.append({"timestamp": str(datetime.utcnow()), "level": "INFO", "message": f"Report generated successfully: {file_name}"})
        task.progress = 100
        task.status = "completed"
        task.current_agent = "completed"
        task.log_messages = log_messages
        db.commit()
        
        _fire_task_update(task_id, 100, "completed", "completed", f"Report compiled: {file_name}", log_messages)
        
        # Save reference file name to result context if needed, or simply return it
        db.close()
        return file_name

    except Exception as e:
        logger.exception("Failed in generate_reports task")
        log_messages.append({"timestamp": str(datetime.utcnow()), "level": "ERROR", "message": f"Error rendering report sheet: {str(e)}"})
        task.status = "failed"
        task.progress = 100
        task.current_agent = "completed"
        task.log_messages = log_messages
        db.commit()
        
        _fire_task_update(task_id, 100, "failed", "completed", f"Report compilation failed: {str(e)}", log_messages)
        db.close()
        return False
