import logging
import asyncio
from datetime import datetime
from celery import shared_task
from database import SessionLocal
import models
from services.eligibility_agent import EligibilityAgent
from services.summary_agent import SummaryAgent
from services.scoring_agent import ScoringAgent
from sse import trigger_task_update, sse_manager

logger = logging.getLogger(__name__)

def run_async(coro):
    """Safely run a coroutine from a synchronous Celery worker context."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                future = pool.submit(asyncio.run, coro)
                return future.result()
        return loop.run_until_complete(coro)
    except RuntimeError:
        return asyncio.run(coro)

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
        if not company:
            logger.error(f"Company with ID {company_db_id} not found in database.")
            db.close()
            return False
        logger.info(f"Using company profile: '{company.name}' (ID: {company.id}) for eligibility matching.")
    else:
        # Fallback: use first available company (should not happen in normal flow)
        company = db.query(models.Company).first()
        if not company:
            logger.error("No company profile found in database. Cannot run alignment.")
            log_messages = [{"timestamp": str(datetime.utcnow()), "level": "ERROR", "message": "No active Company Profile found. Please configure company details first."}]
            task.status = "failed"
            task.progress = 100
            task.log_messages = log_messages
            db.commit()
            db.close()
            return False
        logger.warning(f"No company_db_id provided — falling back to first company: '{company.name}' (ID: {company.id}).")


    task.status = "running"
    task.current_agent = "eligibility_agent"
    task.progress = 10
    log_messages = [{"timestamp": str(datetime.utcnow()), "level": "INFO", "message": f"AI Multi-Agent Pipeline started. Evaluator target: {company.name}"}]
    task.log_messages = log_messages
    db.commit()
    
    run_async(trigger_task_update(task_id, 10, "running", "eligibility_agent", "Starting AI eligibility analysis...", log_messages))

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
        run_async(trigger_task_update(task_id, 30, "running", "eligibility_agent", "Eligibility Agent executing...", log_messages))
        
        eligibility_agent = EligibilityAgent()
        eligibility_res = eligibility_agent.analyze(company_data, tender_data)
        
        log_messages.append({"timestamp": str(datetime.utcnow()), "level": "INFO", "message": f"Eligibility matched: {eligibility_res.get('eligibility')} (Confidence: {eligibility_res.get('confidence_score')})"})
        task.current_agent = "summary_agent"
        task.log_messages = log_messages
        task.progress = 40
        db.commit()
        run_async(trigger_task_update(task_id, 40, "running", "summary_agent", f"Eligibility Agent completed: {eligibility_res.get('eligibility')}", log_messages))

        # 2. RUN SUMMARIZATION AGENT
        log_messages.append({"timestamp": str(datetime.utcnow()), "level": "INFO", "message": "Invoking Summarization Agent. Distilling risks and milestones..."})
        task.log_messages = log_messages
        db.commit()
        run_async(trigger_task_update(task_id, 60, "running", "summary_agent", "Summarization Agent executing...", log_messages))
        
        summary_agent = SummaryAgent()
        summary_res = summary_agent.summarize(tender_data)
        
        log_messages.append({"timestamp": str(datetime.utcnow()), "level": "INFO", "message": "Summarization finished. Document timeline mapped."})
        task.current_agent = "scoring_agent"
        task.log_messages = log_messages
        task.progress = 70
        db.commit()
        run_async(trigger_task_update(task_id, 70, "running", "scoring_agent", "Summarization complete. Scoring tender...", log_messages))

        # 3. RUN OPPORTUNITY SCORING AGENT
        log_messages.append({"timestamp": str(datetime.utcnow()), "level": "INFO", "message": "Invoking Opportunity Scoring Agent. Calculating suitability scale..."})
        task.log_messages = log_messages
        db.commit()
        run_async(trigger_task_update(task_id, 80, "running", "scoring_agent", "Opportunity Scoring Agent executing...", log_messages))
        
        scoring_agent = ScoringAgent()
        score_res = scoring_agent.calculate(company_data, tender_data, eligibility_res)
        logger.info(
            f"[SCORE_RESULT] Tender: {tender.tender_id} | "
            f"Company: {company.name} | "
            f"Score: {score_res}/100 | "
            f"Eligibility: {eligibility_res.get('eligibility')}"
        )
        
        log_messages.append({"timestamp": str(datetime.utcnow()), "level": "INFO", "message": f"Opportunity Score calculated: {score_res}/100."})
        task.log_messages = log_messages
        task.progress = 90
        db.commit()
        run_async(trigger_task_update(task_id, 90, "running", "scoring_agent", f"Scoring finished. Score: {score_res}/100", log_messages))

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
        task.current_agent = "scoring_agent"
        task.log_messages = log_messages
        db.commit()
        
        run_async(trigger_task_update(task_id, 100, "completed", "scoring_agent", "Multi-agent analysis completed successfully.", log_messages))
        
        # 5. BROADCAST LIVE SSE DASHBOARD EVENTS
        run_async(sse_manager.publish("dashboard_events", "eligibility_completed", {
            "id": tender.id,
            "tender_id": tender.tender_id,
            "title": tender.title,
            "eligibility": report.eligibility,
            "confidence_score": report.confidence_score,
            "opportunity_score": report.opportunity_score,
            "summary": report.summary,
            "timeline": report.timeline
        }))
        
        run_async(sse_manager.publish("dashboard_events", "risk_analysis_completed", {
            "id": tender.id,
            "tender_id": tender.tender_id,
            "risks": report.risk_analysis.get("risks", [])
        }))

        # 5. RUN RULES ENGINE AND QUEUE ASYNCHRONOUS NOTIFICATIONS
        from workers.notifications import send_notification_task
        
        triggered_events = []
        
        # High Match: score >= 80 and eligibility == "eligible"
        if score_res >= 80 and eligibility_res.get("eligibility") == "eligible":
            triggered_events.append("HIGH_MATCH")
        # Medium Match: 60 <= score < 80
        elif 60 <= score_res < 80:
            triggered_events.append("MEDIUM_MATCH")
            
        # Risk Alert: eligibility == "not_eligible" or high_risk_count > 0
        high_risk_count = 0
        for match_field in ["financial_match", "technical_match", "experience_match", "location_match"]:
            match_val = eligibility_res.get(match_field) or {}
            if isinstance(match_val, dict) and match_val.get("status") == "fail":
                high_risk_count += 1
        
        if eligibility_res.get("eligibility") == "not_eligible" or high_risk_count > 0:
            triggered_events.append("RISK_ALERT")
            
        # Deadline Alert: deadline <= 7 days
        if tender.deadline:
            days_remaining = (tender.deadline.replace(tzinfo=None) - datetime.utcnow().replace(tzinfo=None)).days
            if days_remaining <= 7:
                triggered_events.append("DEADLINE_ALERT")
                
        # Queue notification tasks asynchronously
        for event_type in triggered_events:
            logger.info(f"Queueing notification: {event_type} for Tender ID: {tender.id}")
            try:
                result = send_notification_task.delay(
                    event_type, company_data, tender_data, eligibility_res, score_res
                )
                logger.info(f"Task queued successfully. Task ID: {result.id}")
            except Exception as e:
                logger.error(f"FAILED to queue notification task for {event_type}: {str(e)}")
                
        db.commit()
        db.close()
        return True

    except Exception as e:
        logger.exception("Failed in run_eligibility_matching task")
        log_messages.append({"timestamp": str(datetime.utcnow()), "level": "ERROR", "message": f"Error running agent pipeline: {str(e)}"})
        task.status = "failed"
        task.progress = 100
        task.current_agent = "scoring_agent"
        task.log_messages = log_messages
        db.commit()
        
        run_async(trigger_task_update(task_id, 100, "failed", "scoring_agent", f"Agent pipeline failed: {str(e)}", log_messages))
        db.close()
        return False
