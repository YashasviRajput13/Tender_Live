import time
import uuid
import logging
import asyncio
from datetime import datetime
from decimal import Decimal
from celery import shared_task
from database import SessionLocal
import models
from scrapers.gem_scraper import GeMScraper
from scrapers.cppp_scraper import CPPPScraper
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

@shared_task(name="workers.discovery.run_tender_discovery")
def run_tender_discovery(task_id: str):
    """
    Worker task to scrape live tenders from GeM and CPPP, save them,
    update progress metrics, then automatically trigger AI analysis for every new tender.
    """
    db = SessionLocal()
    task = db.query(models.AgentTask).filter(models.AgentTask.id == task_id).first()

    if not task:
        logger.error(f"Task with ID {task_id} not found in database.")
        db.close()
        return False

    task.status = "running"
    task.current_agent = "scraper"
    task.progress = 10
    log_messages = [{"timestamp": str(datetime.utcnow()), "level": "INFO", "message": "Scraping Engine initialized. Targeting active government procurement pages."}]
    task.log_messages = log_messages
    db.commit()

    run_async(trigger_task_update(task_id, 10, "running", "scraper", "Scraping started", log_messages))

    try:
        # 1. Scrape GeM
        log_messages.append({"timestamp": str(datetime.utcnow()), "level": "INFO", "message": "Connecting to Government eMarketplace (GeM) Bid Portal..."})
        task.log_messages = log_messages
        db.commit()
        run_async(trigger_task_update(task_id, 20, "running", "scraper", "Scanning GeM bids...", log_messages))

        gem = GeMScraper()
        gem_tenders = gem.scrape(limit=10)

        log_messages.append({"timestamp": str(datetime.utcnow()), "level": "INFO", "message": f"GeM scan finished. Found {len(gem_tenders)} active bids."})
        task.log_messages = log_messages
        db.commit()
        run_async(trigger_task_update(task_id, 40, "running", "scraper", "GeM Scan completed", log_messages))

        # 2. Scrape CPPP
        log_messages.append({"timestamp": str(datetime.utcnow()), "level": "INFO", "message": "Connecting to Central Public Procurement Portal (CPPP)..."})
        task.log_messages = log_messages
        db.commit()
        run_async(trigger_task_update(task_id, 50, "running", "scraper", "Scanning CPPP portal...", log_messages))

        cppp = CPPPScraper()
        cppp_tenders = cppp.scrape(limit=10)

        log_messages.append({"timestamp": str(datetime.utcnow()), "level": "INFO", "message": f"CPPP scan finished. Found {len(cppp_tenders)} active tenders."})
        task.log_messages = log_messages
        db.commit()
        run_async(trigger_task_update(task_id, 70, "running", "scraper", "CPPP Scan completed", log_messages))

        # 3. Save to database
        all_tenders = gem_tenders + cppp_tenders
        saved_count = 0
        duplicate_count = 0
        new_tender_ids = []  # track IDs for auto-analysis

        log_messages.append({"timestamp": str(datetime.utcnow()), "level": "INFO", "message": f"Saving {len(all_tenders)} scraped tenders to database..."})
        task.log_messages = log_messages
        db.commit()
        run_async(trigger_task_update(task_id, 80, "running", "scraper", "Normalizing and saving tender records...", log_messages))

        for tender_data in all_tenders:
            existing = db.query(models.Tender).filter(models.Tender.tender_id == tender_data["tender_id"]).first()
            if existing:
                duplicate_count += 1
                continue

            new_tender = models.Tender(
                tender_id=tender_data["tender_id"],
                title=tender_data["title"],
                department=tender_data["department"],
                location=tender_data["location"],
                budget=tender_data["budget"],
                deadline=tender_data["deadline"],
                eligibility_criteria=tender_data.get("eligibility_criteria"),
                source_url=tender_data.get("source_url"),
                bid_detail_url=tender_data.get("bid_detail_url"),
                pdf_url=tender_data.get("pdf_url"),
                source_name=tender_data.get("source_name"),
                raw_html=tender_data.get("raw_html"),
                status="discovered"
            )
            if tender_data.get("source_url"):
                logger.info(f"Saving tender {tender_data['tender_id']} with source_url={tender_data['source_url']}")
            else:
                warning_msg = f"Saving tender {tender_data['tender_id']} with missing source_url"
                logger.warning(warning_msg)
                log_messages.append({"timestamp": str(datetime.utcnow()), "level": "WARNING", "message": warning_msg})

            db.add(new_tender)
            db.flush()
            saved_count += 1
            new_tender_ids.append(new_tender.id)

            # Broadcast live tender discovered event
            run_async(sse_manager.publish("dashboard_events", "tender_discovered", {
                "id": new_tender.id,
                "tender_id": new_tender.tender_id,
                "title": new_tender.title,
                "department": new_tender.department,
                "budget": float(new_tender.budget) if new_tender.budget else None,
                "deadline": new_tender.deadline.isoformat() if new_tender.deadline else None,
                "source_url": new_tender.source_url,
                "bid_detail_url": new_tender.bid_detail_url,
                "pdf_url": new_tender.pdf_url,
                "source_name": new_tender.source_name,
                "created_at": new_tender.created_at.isoformat()
            }))

        db.commit()

        # Mark discovery task complete
        log_messages.append({
            "timestamp": str(datetime.utcnow()),
            "level": "INFO",
            "message": f"Discovery pipeline finished. Scraped: {len(all_tenders)} | Saved New: {saved_count} | Duplicates: {duplicate_count}"
        })
        task.progress = 100
        task.status = "completed"
        task.current_agent = "scraper"
        task.log_messages = log_messages
        db.commit()

        run_async(trigger_task_update(task_id, 100, "completed", "scraper",
            f"Discovery finished. Saved {saved_count} new tenders. Auto-analysing...", log_messages))

        # 4. AUTO-ANALYSIS: Queue eligibility analysis for every newly saved tender
        if new_tender_ids:
            company = db.query(models.Company).first()
            if not company:
                logger.warning("No company profile found — skipping auto-analysis.")
            else:
                logger.info(f"Auto-queuing AI analysis for {len(new_tender_ids)} new tender(s) using profile: {company.name}")
                from workers.eligibility import run_eligibility_matching
                for tender_db_id in new_tender_ids:
                    analysis_task_id = str(uuid.uuid4())
                    analysis_task = models.AgentTask(
                        id=analysis_task_id,
                        task_type="analysis",
                        status="pending",
                        progress=0,
                        current_agent="eligibility_agent"
                    )
                    db.add(analysis_task)
                    db.commit()
                    logger.info(f"Auto-queuing analysis task {analysis_task_id} for tender ID {tender_db_id}")
                    try:
                        run_eligibility_matching.delay(analysis_task_id, tender_db_id, company.id)
                    except Exception as e:
                        logger.warning(f"Celery unavailable for auto-analysis, running in thread: {e}")
                        import threading
                        threading.Thread(
                            target=run_eligibility_matching.run,
                            args=(analysis_task_id, tender_db_id, company.id),
                            daemon=True
                        ).start()

        db.close()
        return True

    except Exception as e:
        logger.exception("Failed in run_tender_discovery task")
        log_messages.append({"timestamp": str(datetime.utcnow()), "level": "ERROR", "message": f"Error running crawler: {str(e)}"})
        task.status = "failed"
        task.progress = 100
        task.current_agent = "scraper"
        task.log_messages = log_messages
        db.commit()

        run_async(trigger_task_update(task_id, 100, "failed", "scraper", f"Discovery failed: {str(e)}", log_messages))
        db.close()
        return False
