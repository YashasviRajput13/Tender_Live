import time
import logging
from datetime import datetime
from decimal import Decimal
from celery import shared_task
from database import SessionLocal
import models
from scrapers.gem_scraper import GeMScraper
from scrapers.cppp_scraper import CPPPScraper
from sse import trigger_task_update, sse_manager

logger = logging.getLogger(__name__)

@shared_task(name="workers.discovery.run_tender_discovery")
def run_tender_discovery(task_id: str):
    """
    Worker task to scrape live tenders from GeM and CPPP, save them,
    and update progress metrics.
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
    
    # Broadcast progress
    import asyncio
    asyncio.run(trigger_task_update(task_id, 10, "running", "scraper", "Scraping started", log_messages))

    try:
        # 1. Scrape GeM
        log_messages.append({"timestamp": str(datetime.utcnow()), "level": "INFO", "message": "Connecting to Government eMarketplace (GeM) Bid Portal..."})
        task.log_messages = log_messages
        db.commit()
        asyncio.run(trigger_task_update(task_id, 20, "running", "scraper", "Scanning GeM bids...", log_messages))
        
        gem = GeMScraper()
        gem_tenders = gem.scrape(limit=10)
        
        log_messages.append({"timestamp": str(datetime.utcnow()), "level": "INFO", "message": f"GeM scan finished. Found {len(gem_tenders)} active bids."})
        task.log_messages = log_messages
        db.commit()
        asyncio.run(trigger_task_update(task_id, 40, "running", "scraper", "GeM Scan completed", log_messages))

        # 2. Scrape CPPP
        log_messages.append({"timestamp": str(datetime.utcnow()), "level": "INFO", "message": "Connecting to Central Public Procurement Portal (CPPP)..."})
        task.log_messages = log_messages
        db.commit()
        asyncio.run(trigger_task_update(task_id, 50, "running", "scraper", "Scanning CPPP portal...", log_messages))
        
        cppp = CPPPScraper()
        cppp_tenders = cppp.scrape(limit=10)
        
        log_messages.append({"timestamp": str(datetime.utcnow()), "level": "INFO", "message": f"CPPP scan finished. Found {len(cppp_tenders)} active tenders."})
        task.log_messages = log_messages
        db.commit()
        asyncio.run(trigger_task_update(task_id, 70, "running", "scraper", "CPPP Scan completed", log_messages))

        # 3. Save to database
        all_tenders = gem_tenders + cppp_tenders
        saved_count = 0
        duplicate_count = 0
        
        log_messages.append({"timestamp": str(datetime.utcnow()), "level": "INFO", "message": f"Saving {len(all_tenders)} scraped tenders to database..."})
        task.log_messages = log_messages
        db.commit()
        asyncio.run(trigger_task_update(task_id, 80, "running", "scraper", "Normalizing and saving tender records...", log_messages))

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
                eligibility_criteria=tender_data["eligibility_criteria"],
                source_url=tender_data["source_url"],
                source_name=tender_data["source_name"],
                raw_html=tender_data["raw_html"],
                status="discovered"
            )
            if tender_data.get("source_url"):
                logger.info(f"Saving tender {tender_data['tender_id']} with source_url={tender_data['source_url']}")
            else:
                warning_msg = f"Saving tender {tender_data['tender_id']} with missing source_url"
                logger.warning(warning_msg)
                log_messages.append({"timestamp": str(datetime.utcnow()), "level": "WARNING", "message": warning_msg})

            db.add(new_tender)
            db.flush() # flush to get auto-incrementing primary key ID
            saved_count += 1
            
            # Broadcast direct live tender discovery event to frontend
            asyncio.run(sse_manager.publish("dashboard_events", "tender_discovered", {
                "id": new_tender.id,
                "tender_id": new_tender.tender_id,
                "title": new_tender.title,
                "department": new_tender.department,
                "budget": float(new_tender.budget) if new_tender.budget else None,
                "deadline": new_tender.deadline.isoformat() if new_tender.deadline else None,
                "source_name": new_tender.source_name,
                "created_at": new_tender.created_at.isoformat()
            }))
            
        db.commit()
        
        # Complete discovery
        log_messages.append({
            "timestamp": str(datetime.utcnow()), 
            "level": "INFO", 
            "message": f"Discovery pipeline finished. Scraped: {len(all_tenders)} | Saved New: {saved_count} | Duplicates: {duplicate_count}"
        })
        task.progress = 100
        task.status = "completed"
        task.current_agent = "completed"
        task.log_messages = log_messages
        db.commit()
        
        asyncio.run(trigger_task_update(task_id, 100, "completed", "completed", f"Discovery finished. Saved {saved_count} new tenders.", log_messages))
        return True
        
    except Exception as e:
        logger.exception("Failed in run_tender_discovery task")
        log_messages.append({"timestamp": str(datetime.utcnow()), "level": "ERROR", "message": f"Error running crawler: {str(e)}"})
        task.status = "failed"
        task.progress = 100
        task.current_agent = "completed"
        task.log_messages = log_messages
        db.commit()
        
        asyncio.run(trigger_task_update(task_id, 100, "failed", "completed", f"Discovery failed: {str(e)}", log_messages))
        db.close()
        return False
