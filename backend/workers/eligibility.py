import logging
from datetime import datetime
from celery import shared_task
from database import SessionLocal
import models
from services.eligibility_agent import EligibilityAgent
from services.summary_agent import SummaryAgent
from services.scoring_agent import ScoringAgent
from sse import trigger_task_update, sse_manager
import asyncio

logger = logging.getLogger(__name__)

@shared_task(name="workers.eligibility.run_eligibility_matching")
def run_eligibility_matching(task_id: str, tender_db_id: int, company_db_id: int = None):
    """
    Run eligibility matching, opportunity scoring, and tender summarization sequentially.
    """
    db = SessionLocal()
    task = db.query(models.AgentTask).filter(models.AgentTask.id == task_id).first()
    
    if not task:
        logger.error(f"Task with ID {task_id} not found in database.")
        db.close()
        return False
        
    tender = db.query(models.Tender).filter(models.Tender.id == tender_db_id).first()
    if not tender:
        logger.error(f"Tender with ID {tender_db_id} not found in database.")
        db.close()
        return False

    # Fetch active company profile
    if company_db_id:
        company = db.query(models.Company).filter(models.Company.id == company_db_id).first()
    else:
        # Default to first seeded company profile
        company = db.query(models.Company).first()
        
    if not company:
        logger.error("No company profile found in database. Cannot run alignment.")
        log_messages = [{"timestamp": str(datetime.utcnow()), "level": "ERROR", "message": "No active Company Profile found. Please configure company details."}]
        task.status = "failed"
        task.progress = 100
        task.log_messages = log_messages
        db.commit()
        db.close()
        return False

    task.status = "running"
    task.current_agent = "eligibility_agent"
    task.progress = 10
    log_messages = [{"timestamp": str(datetime.utcnow()), "level": "INFO", "message": f"AI Multi-Agent Pipeline started. Evaluator target: {company.name}"}]
    task.log_messages = log_messages
    db.commit()
    
    asyncio.run(trigger_task_update(task_id, 10, "running", "eligibility_agent", "Starting AI eligibility analysis...", log_messages))

    try:
        # Prepare tender dict for AI consumption
        tender_data = {
            "title": tender.title,
            "tender_id": tender.tender_id,
            "department": tender.department,
            "location": tender.location,
            "budget": float(tender.budget) if tender.budget else None,
            "deadline": tender.deadline.isoformat() if tender.deadline else None,
            "eligibility_criteria": tender.eligibility_criteria or "",
            "raw_html": tender.raw_html or ""
        }
        
        # Prepare company dict for AI consumption
        company_data = {
            "name": company.name,
            "industry": company.industry,
            "turnover": float(company.turnover) if company.turnover else None,
            "msme_status": company.msme_status,
            "certifications": company.certifications or "",
            "geographic_coverage": company.geographic_coverage or [],
            "required_categories": company.required_categories or [],
            "past_projects": company.past_projects or []
        }

        # 1. RUN ELIGIBILITY AGENT
        log_messages.append({"timestamp": str(datetime.utcnow()), "level": "INFO", "message": "Invoking Eligibility Agent. Evaluating criteria..."})
        task.log_messages = log_messages
        db.commit()
        asyncio.run(trigger_task_update(task_id, 30, "running", "eligibility_agent", "Eligibility Agent executing...", log_messages))
        
        eligibility_agent = EligibilityAgent()
        eligibility_res = eligibility_agent.analyze(company_data, tender_data)
        
        log_messages.append({"timestamp": str(datetime.utcnow()), "level": "INFO", "message": f"Eligibility matched: {eligibility_res.get('eligibility')} (Confidence: {eligibility_res.get('confidence_score')})"})
        task.current_agent = "summary_agent"
        task.log_messages = log_messages
        task.progress = 40
        db.commit()
        asyncio.run(trigger_task_update(task_id, 40, "running", "summary_agent", f"Eligibility Agent completed: {eligibility_res.get('eligibility')}", log_messages))

        # 2. RUN SUMMARIZATION AGENT
        log_messages.append({"timestamp": str(datetime.utcnow()), "level": "INFO", "message": "Invoking Summarization Agent. Distilling risks and milestones..."})
        task.log_messages = log_messages
        db.commit()
        asyncio.run(trigger_task_update(task_id, 60, "running", "summary_agent", "Summarization Agent executing...", log_messages))
        
        summary_agent = SummaryAgent()
        summary_res = summary_agent.summarize(tender_data)
        
        log_messages.append({"timestamp": str(datetime.utcnow()), "level": "INFO", "message": "Summarization finished. Document timeline mapped."})
        task.current_agent = "scoring_agent"
        task.log_messages = log_messages
        task.progress = 70
        db.commit()
        asyncio.run(trigger_task_update(task_id, 70, "running", "scoring_agent", "Summarization complete. Scoring tender...", log_messages))

        # 3. RUN OPPORTUNITY SCORING AGENT
        log_messages.append({"timestamp": str(datetime.utcnow()), "level": "INFO", "message": "Invoking Opportunity Scoring Agent. Calculating suitability scale..."})
        task.log_messages = log_messages
        db.commit()
        asyncio.run(trigger_task_update(task_id, 80, "running", "scoring_agent", "Opportunity Scoring Agent executing...", log_messages))
        
        scoring_agent = ScoringAgent()
        score_res = scoring_agent.calculate(company_data, tender_data, eligibility_res)
        
        log_messages.append({"timestamp": str(datetime.utcnow()), "level": "INFO", "message": f"Opportunity Score calculated: {score_res}/100."})
        task.log_messages = log_messages
        task.progress = 90
        db.commit()
        asyncio.run(trigger_task_update(task_id, 90, "running", "scoring_agent", f"Scoring finished. Score: {score_res}/100", log_messages))

        # 4. SAVE COMPREHENSIVE ELIGIBILITY REPORT
        # Clear old reports for this tender to prevent duplication
        db.query(models.EligibilityReport).filter(
            models.EligibilityReport.tender_id == tender.id,
            models.EligibilityReport.company_id == company.id
        ).delete()
        
        report = models.EligibilityReport(
            tender_id=tender.id,
            company_id=company.id,
            eligibility=eligibility_res.get("eligibility", "partially_eligible"),
            confidence_score=float(eligibility_res.get("confidence_score", 0.5)),
            opportunity_score=score_res,
            summary=summary_res.get("executive_summary", ""),
            requirements_analysis={
                "financial_match": eligibility_res.get("financial_match"),
                "technical_match": eligibility_res.get("technical_match"),
                "experience_match": eligibility_res.get("experience_match"),
                "overall_rationale": eligibility_res.get("overall_rationale")
            },
            risk_analysis={
                "risks": summary_res.get("risks", []),
                "msme_advantage": eligibility_res.get("msme_advantage")
            },
            timeline=summary_res.get("timeline", {}),
            checklist={
                "submission_checklist": summary_res.get("submission_checklist", []),
                "key_requirements": summary_res.get("key_requirements", [])
            }
        )
        db.add(report)
        
        # Update Tender status
        tender.status = "analyzed"
        db.commit()

        # Update Task to Completed
        log_messages.append({"timestamp": str(datetime.utcnow()), "level": "INFO", "message": "Multi-agent report compiled and persisted in PostgreSQL."})
        task.status = "completed"
        task.progress = 100
        task.current_agent = "completed"
        task.log_messages = log_messages
        db.commit()
        
        asyncio.run(trigger_task_update(task_id, 100, "completed", "completed", "Multi-agent analysis completed successfully.", log_messages))
        
        # 5. BROADCAST LIVE SSE DASHBOARD EVENTS
        asyncio.run(sse_manager.publish("dashboard_events", "eligibility_completed", {
            "id": tender.id,
            "tender_id": tender.tender_id,
            "title": tender.title,
            "eligibility": report.eligibility,
            "confidence_score": report.confidence_score,
            "opportunity_score": report.opportunity_score,
            "summary": report.summary,
            "timeline": report.timeline
        }))
        
        asyncio.run(sse_manager.publish("dashboard_events", "risk_analysis_completed", {
            "id": tender.id,
            "tender_id": tender.tender_id,
            "risks": report.risk_analysis.get("risks", [])
        }))

        # Create In-app Notification record
        users = db.query(models.User).all()
        for u in users:
            notif = models.Notification(
                user_id=u.id,
                tender_id=tender.id,
                message=f"AI Agent Analysis completed for Tender '{tender.title}'. Suitability Score: {score_res}/100. Eligibility: {report.eligibility.upper()}.",
                is_read=False,
                channel="in_app"
            )
            db.add(notif)
            db.flush()
            
            # Publish notification update to Redis general channel
            asyncio.run(sse_manager.publish("dashboard_events", "notification_added", {
                "id": notif.id,
                "user_id": u.id,
                "message": notif.message,
                "created_at": notif.created_at.isoformat()
            }))
            
        db.commit()
        db.close()
        return True

    except Exception as e:
        logger.exception("Failed in run_eligibility_matching task")
        log_messages.append({"timestamp": str(datetime.utcnow()), "level": "ERROR", "message": f"Error running agent pipeline: {str(e)}"})
        task.status = "failed"
        task.progress = 100
        task.current_agent = "completed"
        task.log_messages = log_messages
        db.commit()
        
        asyncio.run(trigger_task_update(task_id, 100, "failed", "completed", f"Agent pipeline failed: {str(e)}", log_messages))
        db.close()
        return False
