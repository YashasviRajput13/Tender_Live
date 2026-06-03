import logging
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

# Import base structures
import models
from database import engine, Base, get_db
from config import settings
import auth
import schemas

# Import Routers
from routers import auth as auth_router
from routers import company as company_router
from routers import tenders as tenders_router
from routers import tasks as tasks_router
from routers import documents as documents_router
from routers import reports as reports_router

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("tenderai")

app = FastAPI(
    title="TenderAI API",
    description="Agentic Tender Discovery & Multi-Agent Analysis Platform Backend",
    version="1.0.0"
)

# CORS Policy configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Wire API Routers
app.include_router(auth_router.router)
app.include_router(company_router.router)
app.include_router(tenders_router.router)
app.include_router(tasks_router.router)
app.include_router(documents_router.router)
app.include_router(reports_router.router)


@app.get("/api/notifications", response_model=List[schemas.NotificationOut])
def list_notifications(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Fetch all active in-app alerts for the current logged-in user.
    """
    notifs = db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id
    ).order_by(models.Notification.created_at.desc()).all()
    return notifs


@app.post("/api/notifications/read-all", status_code=status.HTTP_200_OK)
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Mark all unread notifications as read.
    """
    db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
        models.Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read."}


def seed_initial_data(db):
    admin_email = "admin@tenderai.com"
    admin = db.query(models.User).filter(models.User.email == admin_email).first()
    if not admin:
        logger.info("Seeding default administrator credentials...")
        admin = models.User(
            email=admin_email,
            hashed_password=auth.get_password_hash("admin_secure_pwd_123"),
            role="admin",
            full_name="System Administrator"
        )
        db.add(admin)
        db.commit()
        logger.info("Admin seeded: admin@tenderai.com / admin_secure_pwd_123")
    elif not auth.verify_password("admin_secure_pwd_123", admin.hashed_password):
        logger.warning("Existing admin account found with a non-default password. Resetting to local default for development.")
        admin.hashed_password = auth.get_password_hash("admin_secure_pwd_123")
        db.commit()
        logger.info("Admin password reset to admin_secure_pwd_123")

    user_email = "user@tenderai.com"
    user = db.query(models.User).filter(models.User.email == user_email).first()
    if not user:
        logger.info("Seeding default company subscriber credentials...")
        user = models.User(
            email=user_email,
            hashed_password=auth.get_password_hash("user_secure_pwd_123"),
            role="company_user",
            full_name="Yashasvi Rajput"
        )
        db.add(user)
        db.commit()

        company = models.Company(
            user_id=user.id,
            name="Yash Tech Solutions Ltd",
            industry="IT Software Services & Infrastructure",
            turnover=350.00,
            registration_numbers="REG987654321",
            certifications="ISO 9001:2015, CMMI Level 3",
            gst_details="27AAAAA1111A1Z1",
            msme_status=True,
            past_projects=[
                {
                    "title": "State Smart Cities Networking Setup",
                    "client": "Ministry of Urban Development",
                    "value": 18000000,
                    "description": "Deployment of high-performance fiber optic and routing layers across municipal nodes.",
                    "year": 2024
                },
                {
                    "title": "Cloud Infrastructure Migration",
                    "client": "National Electronics Corp",
                    "value": 6500000,
                    "description": "Migration of legacy server workloads to scalable hybrid cloud spaces.",
                    "year": 2025
                }
            ],
            team_strength=75,
            geographic_coverage=["New Delhi", "Maharashtra", "Karnataka", "Tamil Nadu"],
            required_categories=["IT Infrastructure", "Software Development", "Networking", "Cloud Services"]
        )
        db.add(company)
        db.commit()
        logger.info("Company user seeded: user@tenderai.com / user_secure_pwd_123")
    elif not auth.verify_password("user_secure_pwd_123", user.hashed_password):
        logger.warning("Existing company user account found with a non-default password. Resetting to local default for development.")
        user.hashed_password = auth.get_password_hash("user_secure_pwd_123")
        db.commit()
        logger.info("Company user password reset to user_secure_pwd_123")

    sources = [
        {"name": "GeM", "url": "https://bidplus.gem.gov.in/all-bids"},
        {"name": "CPPP", "url": "https://eprocure.gov.in/cppp/latestactivetendersnew"}
    ]
    for src in sources:
        existing = db.query(models.TenderSource).filter(models.TenderSource.name == src["name"]).first()
        if not existing:
            logger.info(f"Seeding Tender portal reference: {src['name']}...")
            new_src = models.TenderSource(
                name=src["name"],
                base_url=src["url"],
                frequency_minutes=60,
                is_active=True
            )
            db.add(new_src)
    db.commit()
    logger.info("Seeding completed successfully.")


@app.on_event("startup")
def startup_db_init():
    """
    Prepare Database Schema and seed active configuration records.
    """
    logger.info("Initializing PostgreSQL database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables verified.")

    db = SessionLocal_init()
    try:
        seed_initial_data(db)
    except Exception as e:
        logger.error(f"Error during db initialization seeding: {str(e)}")
        db.rollback()
    finally:
        db.close()


def SessionLocal_init():
    from sqlalchemy.orm import sessionmaker
    return sessionmaker(autocommit=False, autoflush=False, bind=engine)()
