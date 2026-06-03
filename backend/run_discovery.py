import uuid
from database import SessionLocal, engine, Base
import models
from workers.discovery import run_tender_discovery

if __name__ == '__main__':
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    task_id = str(uuid.uuid4())
    new_task = models.AgentTask(
        id=task_id,
        task_type='discovery',
        status='pending',
        progress=0,
        current_agent='scraper'
    )
    db.add(new_task)
    db.commit()
    print('Created task', task_id)
    result = run_tender_discovery.run(task_id)
    print('Discovery result:', result)
    updated = db.query(models.AgentTask).filter(models.AgentTask.id == task_id).first()
    print('Final status:', updated.status, 'progress:', updated.progress)
    db.close()
