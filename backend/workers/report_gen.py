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
def generate_reports(task_id: str, format_type: str = "pdf", company_id: int = None, tender_id: int = None):
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
            file_name = f"TenderAI_Analysis_Brief_{tender_id}_{timestamp_str}.pdf" if tender_id else f"TenderAI_Analysis_Brief_{timestamp_str}.pdf"
            file_path = os.path.join(settings.UPLOAD_DIR, file_name)
            
            # Fetch reports
            if tender_id:
                reports = db.query(models.EligibilityReport).filter(models.EligibilityReport.company_id == company.id, models.EligibilityReport.tender_id == tender_id).all()
            else:
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
            story.append(Paragraph(f"Industry: <b>{company.industry or 'N/A'}</b>", body_style))
            story.append(Paragraph(f"Annual Turnover: <b>{float(company.turnover or 0):,.2f} Lakhs</b>", body_style))
            story.append(Paragraph(f"MSME Status: <b>{'Registered' if company.msme_status else 'Not Registered'}</b>", body_style))
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
                
                req_analysis = r.requirements_analysis or {}
                
                # Title
                story.append(Paragraph(f"Tender Opportunity: {tender_obj.title}", h2_style))
                story.append(Spacer(1, 10))

                # 1. Basic Tender Information
                story.append(Paragraph("<b>1. Basic Tender Information</b>", h2_style))
                financial_info = r.timeline.get('financial_info', {}) if getattr(r, 'timeline', None) else {}
                # Enhance financial_info with parsed documents if missing
                emd_val = financial_info.get("emd", "Not specified")
                perf_val = financial_info.get("performance_security", "Not specified")
                
                for doc in tender_obj.documents:
                    if doc.parsed_json and "financial_requirements" in doc.parsed_json:
                        f_reqs = doc.parsed_json["financial_requirements"]
                        if emd_val == "Not specified" and f_reqs.get("earnest_money_deposit", "Not specified") != "Not specified":
                            emd_val = f_reqs.get("earnest_money_deposit")
                        if perf_val == "Not specified" and f_reqs.get("performance_security", "Not specified") != "Not specified":
                            perf_val = f_reqs.get("performance_security")
                            
                info_data = [
                    ["Tender Number / Reference Number:", tender_obj.tender_id],
                    ["Issuing Department:", tender_obj.department or "Not specified"],
                    ["Tender Type:", "Open Tender" if not tender_obj.source_name else tender_obj.source_name],
                    ["Tender Category:", "Not specified"],
                    ["Tender Value:", f"₹ {tender_obj.budget:,.2f}" if tender_obj.budget else "Not specified"],
                    ["Earnest Money Deposit (EMD):", emd_val],
                    ["Security Deposit / Performance Guarantee:", perf_val],
                    ["Tender Publishing Date:", tender_obj.created_at.strftime('%d %b %Y')],
                    ["Bid Submission End Date:", tender_obj.deadline.strftime('%d %b %Y') if tender_obj.deadline else "Not specified"],
                ]
                info_table = Table(info_data, colWidths=[200, 300])
                info_table.setStyle(TableStyle([
                    ('BACKGROUND', (0,0), (0,-1), colors.HexColor('#F1F5F9')),
                    ('TEXTCOLOR', (0,0), (-1,-1), colors.HexColor('#334155')),
                    ('ALIGN', (0,0), (-1,-1), 'LEFT'),
                    ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
                    ('FONTNAME', (1,0), (1,-1), 'Helvetica'),
                    ('FONTSIZE', (0,0), (-1,-1), 9),
                    ('BOTTOMPADDING', (0,0), (-1,-1), 6),
                    ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
                ]))
                story.append(info_table)
                story.append(Spacer(1, 15))

                # 2. Match Score
                story.append(Paragraph("<b>2. Match Score</b>", h2_style))
                story.append(Paragraph(f"<b>Overall Match Score: {r.opportunity_score}%</b>", body_style))
                story.append(Spacer(1, 6))
                score_data = [["Criteria", "Score / Status"]]
                for key, label in [('financial_match', 'Financial Eligibility'), ('technical_match', 'Technical Qualifications / Product Match'), ('experience_match', 'Experience Match'), ('location_match', 'Location Suitability')]:
                    match_info = req_analysis.get(key, {})
                    if match_info:
                        score_data.append([label, match_info.get('status', 'conditional').upper()])
                score_table = Table(score_data, colWidths=[250, 150])
                score_table.setStyle(TableStyle([
                    ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1E293B')),
                    ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
                    ('ALIGN', (0,0), (-1,-1), 'LEFT'),
                    ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0,0), (-1,-1), 9),
                    ('BOTTOMPADDING', (0,0), (-1,-1), 6),
                    ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
                ]))
                story.append(score_table)
                story.append(Spacer(1, 15))

                # 3. Tender Scope Summary
                story.append(Paragraph("<b>3. Tender Scope Summary</b>", h2_style))
                story.append(Paragraph(r.summary or "No summary available.", body_style))
                story.append(Spacer(1, 15))

                # 4. Required Products/Services
                story.append(Paragraph("<b>4. Required Products/Services</b>", h2_style))
                key_reqs = r.checklist.get("key_requirements", [])
                if key_reqs:
                    for req in key_reqs:
                        story.append(Paragraph(f"• {req}", body_style))
                else:
                    story.append(Paragraph("<i>No specific products/services extracted.</i>", body_style))
                story.append(Spacer(1, 15))

                # 5. Why This Tender Matches
                story.append(Paragraph("<b>5. Why This Tender Matches</b>", h2_style))
                reasons = []
                for key in ['financial_match', 'technical_match', 'experience_match', 'location_match']:
                    match_info = req_analysis.get(key, {})
                    if match_info.get('status') == 'pass':
                        reasons.append(f"✓ {match_info.get('details', '')}")
                if reasons:
                    for reason in reasons:
                        story.append(Paragraph(reason, body_style))
                else:
                    story.append(Paragraph("No direct matching criteria explicitly confirmed.", body_style))
                story.append(Spacer(1, 15))

                # 6. Eligibility Criteria
                story.append(Paragraph("<b>6. Eligibility Criteria</b>", h2_style))
                eligibility_criteria = []
                for key, label in [('financial_match', 'Financial'), ('technical_match', 'Technical'), ('experience_match', 'Experience'), ('location_match', 'Location')]:
                    match_info = req_analysis.get(key, {})
                    if match_info:
                        eligibility_criteria.append(f"<b>{label}:</b> {match_info.get('details', '')}")
                for ec in eligibility_criteria:
                    story.append(Paragraph(ec, body_style))
                story.append(Spacer(1, 15))

                # 7. Risk Analysis
                story.append(Paragraph("<b>7. Risk Analysis</b>", h2_style))
                risk_items = r.risk_analysis.get("risks", [])
                if risk_items:
                    story.append(Paragraph(f"Risk Level: <b>{'High' if len(risk_items) >= 3 else 'Medium'}</b>", body_style))
                    story.append(Spacer(1, 6))
                    for risk in risk_items:
                        story.append(Paragraph(f"❌ {risk}", body_style))
                else:
                    story.append(Paragraph("Risk Level: <b>Low</b> (No significant risks identified by AI)", body_style))
                story.append(Spacer(1, 15))

                # 8. Financial Information
                story.append(Paragraph("<b>8. Financial Information</b>", h2_style))
                financial_info = r.timeline.get('financial_info', {}) if getattr(r, 'timeline', None) else {}
                fin_data = [
                    ["Item", "Amount / Details"],
                    ["Tender Value", f"₹ {tender_obj.budget:,.2f}" if tender_obj.budget else "Not specified"],
                    ["EMD", emd_val],
                    ["Tender Fee", financial_info.get("tender_fee", "Not specified")],
                    ["Performance Security", perf_val],
                    ["Bid Validity Period", financial_info.get("bid_validity", "Not specified")]
                ]
                fin_table = Table(fin_data, colWidths=[200, 200])
                fin_table.setStyle(TableStyle([
                    ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1E293B')),
                    ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
                    ('ALIGN', (0,0), (-1,-1), 'LEFT'),
                    ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0,0), (-1,-1), 9),
                    ('BOTTOMPADDING', (0,0), (-1,-1), 6),
                    ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
                ]))
                story.append(fin_table)
                story.append(Spacer(1, 15))

                # 9. Important Deadlines
                story.append(Paragraph("<b>9. Important Deadlines</b>", h2_style))
                dl_data = [
                    ["Publish Date:", tender_obj.created_at.strftime('%d %b %Y')],
                    ["Last Submission:", tender_obj.deadline.strftime('%d %b %Y %H:%M') if tender_obj.deadline else "Not specified"],
                    ["Technical Opening:", "Not specified"]
                ]
                dl_table = Table(dl_data, colWidths=[200, 200])
                dl_table.setStyle(TableStyle([
                    ('BACKGROUND', (0,0), (0,-1), colors.HexColor('#F1F5F9')),
                    ('TEXTCOLOR', (0,0), (-1,-1), colors.HexColor('#334155')),
                    ('ALIGN', (0,0), (-1,-1), 'LEFT'),
                    ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
                    ('FONTNAME', (1,0), (1,-1), 'Helvetica'),
                    ('FONTSIZE', (0,0), (-1,-1), 9),
                    ('BOTTOMPADDING', (0,0), (-1,-1), 6),
                    ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
                ]))
                story.append(dl_table)
                story.append(Spacer(1, 15))

                # 10. Geographic Location
                story.append(Paragraph("<b>10. Geographic Location</b>", h2_style))
                story.append(Paragraph(f"<b>Delivery/Work Location:</b> {tender_obj.location or 'Not specified'}", body_style))
                story.append(Spacer(1, 15))

                # 11. Required Documents
                story.append(Paragraph("<b>11. Required Documents</b>", h2_style))
                checklist_items = r.checklist.get("submission_checklist", [])
                if checklist_items:
                    for item in checklist_items:
                        story.append(Paragraph(f"✓ {item}", body_style))
                else:
                    story.append(Paragraph("Not specified.", body_style))
                story.append(Spacer(1, 15))

                # 12. Contact Information
                story.append(Paragraph("<b>12. Contact Information</b>", h2_style))
                story.append(Paragraph(f"<b>Authority Source:</b> {tender_obj.source_name}", body_style))
                if tender_obj.source_url:
                    story.append(Paragraph(f"<b>Source URL:</b> <a href='{tender_obj.source_url}' color='blue'>{tender_obj.source_url}</a>", body_style))
                else:
                    story.append(Paragraph("<i>Source URL not specified.</i>", body_style))
                story.append(Spacer(1, 15))

                # 13. Competitor & Win Probability
                story.append(Paragraph("<b>13. Competitor & Win Probability</b>", h2_style))
                story.append(Paragraph(f"Win Probability: <b>{r.confidence_score*100:.1f}%</b> (Estimated based on initial compliance mapping)", body_style))
                story.append(Paragraph("<i>Note: Advanced competitor pricing models are currently building historical datasets.</i>", body_style))
                story.append(Spacer(1, 15))

                # 14. AI Recommendation
                story.append(Paragraph("<b>14. AI Recommendation</b>", h2_style))
                recommendation = "STRONGLY RECOMMENDED" if r.eligibility.lower() == 'eligible' else ("MODERATELY RECOMMENDED" if r.eligibility.lower() == 'partially_eligible' else "NOT RECOMMENDED")
                color = "green" if r.eligibility.lower() == 'eligible' else ("orange" if r.eligibility.lower() == 'partially_eligible' else "red")
                story.append(Paragraph(f"AI Recommendation: <font color='{color}'><b>{recommendation}</b></font>", body_style))
                story.append(Paragraph(f"Confidence Score: {r.confidence_score*100:.1f}%", body_style))
                
                recs_reason = []
                if r.eligibility.lower() == 'eligible':
                    recs_reason.append("All primary eligibility criteria satisfied.")
                    if not risk_items: recs_reason.append("Low compliance risk.")
                else:
                    recs_reason.append("Does not meet all primary eligibility thresholds.")
                
                story.append(Spacer(1, 6))
                story.append(Paragraph("<b>Reason:</b>", body_style))
                for rec in recs_reason:
                    story.append(Paragraph(f"• {rec}", body_style))

                story.append(Spacer(1, 25))
                story.append(PageBreak())
                
            doc.build(story)
            logger.info(f"PDF Analysis Brief compiled successfully: {file_path}")

        elif format_type.lower() == "excel":
            file_name = f"TenderAI_Catalog_{tender_id}_{timestamp_str}.xlsx" if tender_id else f"TenderAI_Catalog_{timestamp_str}.xlsx"
            file_path = os.path.join(settings.UPLOAD_DIR, file_name)
            
            # Build dataset using Pandas
            if tender_id:
                reports = db.query(models.EligibilityReport).filter(models.EligibilityReport.company_id == company.id, models.EligibilityReport.tender_id == tender_id).all()
            else:
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
