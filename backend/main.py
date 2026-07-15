import logging
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

# Import base structures
import models
from database import engine, Base, get_db
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
    handlers=[logging.StreamHandler()],
)
logger = logging.getLogger("tenderai")

app = FastAPI(
    title="TenderAI API",
    description="Agentic Tender Discovery & Multi-Agent Analysis Platform Backend",
    version="1.0.0",
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
    current_user: models.User = Depends(auth.get_current_user),
):
    """
    Fetch all active in-app alerts for the current logged-in user's company,
    sorted by read status, then critical priority, then date.
    """
    from sqlalchemy import case

    company = (
        db.query(models.Company)
        .filter(models.Company.user_id == current_user.id)
        .first()
    )
    if not company:
        return []

    priority_order = case(
        (models.Notification.priority == "CRITICAL", 0),
        (models.Notification.priority == "HIGH", 1),
        (models.Notification.priority == "MEDIUM", 2),
        else_=3,
    )

    notifs = (
        db.query(models.Notification)
        .filter(models.Notification.company_id == company.id)
        .order_by(
            models.Notification.is_read.asc(),
            priority_order.asc(),
            models.Notification.created_at.desc(),
        )
        .all()
    )
    return notifs


@app.patch("/api/notifications/{id}/read", response_model=schemas.NotificationOut)
def mark_notification_read(
    id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """
    Mark a single notification as read by ID.
    """
    company = (
        db.query(models.Company)
        .filter(models.Company.user_id == current_user.id)
        .first()
    )
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Company profile not found."
        )

    notif = (
        db.query(models.Notification)
        .filter(
            models.Notification.id == id, models.Notification.company_id == company.id
        )
        .first()
    )

    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found."
        )

    notif.is_read = True

    # Audit logging: notification_read
    logger.info(
        f"[notification_read] Notification ID: {id} marked as read for Company ID: {company.id}"
    )
    audit = models.AuditLog(
        user_id=current_user.id,
        action="notification_read",
        details={
            "notification_id": id,
            "tender_id": notif.tender_id,
            "company_id": company.id,
        },
    )
    db.add(audit)
    db.commit()
    db.refresh(notif)
    return notif


@app.post("/api/notifications/read-all", status_code=status.HTTP_200_OK)
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """
    Mark all unread notifications as read.
    """
    company = (
        db.query(models.Company)
        .filter(models.Company.user_id == current_user.id)
        .first()
    )
    if not company:
        return {"message": "No company profile found."}

    db.query(models.Notification).filter(
        models.Notification.company_id == company.id,
        models.Notification.is_read.is_(False),
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
            full_name="System Administrator",
        )
        db.add(admin)
        db.commit()
        logger.info("Admin seeded: admin@tenderai.com / admin_secure_pwd_123")
    elif not auth.verify_password("admin_secure_pwd_123", admin.hashed_password):
        logger.warning(
            "Existing admin account found with a non-default password. Resetting to local default for development."
        )
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
            full_name="Yashasvi Rajput",
        )
        db.add(user)
        db.commit()
    elif not auth.verify_password("user_secure_pwd_123", user.hashed_password):
        logger.warning(
            "Existing company user account found with a non-default password. Resetting to local default for development."
        )
        user.hashed_password = auth.get_password_hash("user_secure_pwd_123")
        db.commit()
        logger.info("Company user password reset to user_secure_pwd_123")

    # Always upsert the company profile so changes here reflect on restart
    company = db.query(models.Company).filter(models.Company.user_id == user.id).first()
    rich_profile = dict(
        name="NexaTech Infrasoft Pvt. Ltd.",
        industry="IT Infrastructure, Software Development & Cybersecurity",
        turnover=1250.00,  # INR 12.5 Crore
        registration_numbers="CIN: U72200DL2015PTC287645 | DPIIT Startup India: DIPP123456",
        certifications="ISO 9001:2015, ISO 27001:2022, CMMI Level 3, NIC Empanelled Vendor (Category A), STQC Certified, GeM Verified Seller, MeitY Empanelled",
        gst_details="07AABCN1234D1Z5",
        msme_status=True,
        past_projects=[
            {
                "title": "Integrated E-Governance Platform for Municipal Services",
                "client": "Ministry of Housing & Urban Affairs (MoHUA), Government of India",
                "value": 45000000,
                "description": "End-to-end development and deployment of a unified citizen services portal covering 12 city municipalities. Included ReactJS frontend, FastAPI microservices backend, PostgreSQL data layer, and real-time analytics dashboard. Integrated with DigiLocker, Aadhaar e-KYC, and UPI Payment Gateway.",
                "year": 2024,
            },
            {
                "title": "Secure Data Center Setup & Network Infrastructure Modernisation",
                "client": "National Informatics Centre (NIC), Delhi",
                "value": 32000000,
                "description": "Design and deployment of a Tier-2 equivalent data center with redundant fiber backbone, Dell PowerEdge server rack setup, NetApp storage arrays, Palo Alto next-gen firewall, and 24x7 NOC monitoring. Delivered 3-year SLA-backed AMC.",
                "year": 2024,
            },
            {
                "title": "Cloud Migration & DevSecOps Implementation",
                "client": "SIDBI (Small Industries Development Bank of India)",
                "value": 18500000,
                "description": "Migration of 14 legacy monolithic applications to containerized microservices on AWS GovCloud. Implemented Jenkins CI/CD pipelines, Kubernetes orchestration, Terraform IaC, and Splunk-based SIEM compliance monitoring. Zero-downtime cutover achieved.",
                "year": 2023,
            },
            {
                "title": "Cybersecurity Audit, VAPT & SOC Setup",
                "client": "State Bank of India – IT Security Division",
                "value": 8700000,
                "description": "Comprehensive Vulnerability Assessment & Penetration Testing (VAPT) across 240 endpoints, 18 web applications, and 34 REST APIs as per CERT-In empanelled methodology. Established a 24x7 Security Operations Centre (SOC) with SIEM integration and incident response runbooks.",
                "year": 2025,
            },
            {
                "title": "Hospital Management System (HMS) Implementation",
                "client": "AIIMS Bhopal, Ministry of Health & Family Welfare",
                "value": 22000000,
                "description": "Full-stack HMS covering patient records (EMR), OPD/IPD billing, pharmacy inventory, HR & payroll, radiology integration (DICOM), and mobile app for patients. Integrated with National Health Stack, Ayushman Bharat PMJAY APIs, and ABDM health ID.",
                "year": 2023,
            },
            {
                "title": "AI-Powered Land Records Digitization Platform",
                "client": "Revenue Department, Government of Maharashtra",
                "value": 15000000,
                "description": "Deployed OCR + NLP pipeline for digitizing 2.4 million land record documents (7/12 extracts). Built quality assurance module, a searchable web portal, and integrated with DILRMP national land records system. Achieved 97.6% OCR accuracy on handwritten Marathi text.",
                "year": 2025,
            },
        ],
        team_strength=120,
        geographic_coverage=[
            "New Delhi",
            "Maharashtra",
            "Karnataka",
            "Telangana",
            "Tamil Nadu",
            "Gujarat",
            "Uttar Pradesh",
            "Madhya Pradesh",
            "Rajasthan",
            "West Bengal",
            "Punjab",
            "Haryana",
            "Kerala",
            "Odisha",
            "Bihar",
        ],
        required_categories=[
            "IT Infrastructure",
            "Software Development",
            "Cloud Computing & Migration",
            "Cybersecurity & VAPT",
            "Network Setup & Maintenance",
            "Data Center Services",
            "ERP Implementation",
            "Digital Governance Solutions",
            "AI/ML & Data Analytics",
            "Database Administration",
            "Web Application Development",
            "Mobile App Development",
            "Managed IT Services (AMC)",
            "System Integration",
            "GIS & Mapping Solutions",
        ],
    )
    if not company:
        logger.info("Seeding NexaTech Infrasoft company profile for company_user...")
        company = models.Company(user_id=user.id, **rich_profile)
        db.add(company)
        db.commit()
        logger.info("Company user seeded: user@tenderai.com / user_secure_pwd_123")
    else:
        logger.info(
            "Updating existing company profile to NexaTech Infrasoft rich IT profile..."
        )
        for field, value in rich_profile.items():
            setattr(company, field, value)
        db.commit()
        logger.info("Company profile updated successfully.")

    sources = [
        {"name": "GeM", "url": "https://bidplus.gem.gov.in/all-bids"},
        {"name": "CPPP", "url": "https://eprocure.gov.in/cppp/latestactivetendersnew"},
    ]
    for src in sources:
        existing = (
            db.query(models.TenderSource)
            .filter(models.TenderSource.name == src["name"])
            .first()
        )
        if not existing:
            logger.info(f"Seeding Tender portal reference: {src['name']}...")
            new_src = models.TenderSource(
                name=src["name"],
                base_url=src["url"],
                frequency_minutes=60,
                is_active=True,
            )
            db.add(new_src)
    db.commit()
    logger.info("Seeding completed successfully.")


@app.on_event("startup")
def startup_db_init():
    """
    Prepare Database Schema and seed active configuration records.
    """
    from sqlalchemy import inspect, text

    logger.info("Checking for database migrations...")

    # Run custom migrations to preserve notifications table data if old schema is found
    try:
        inspector = inspect(engine)
        if "notifications" in inspector.get_table_names():
            columns = [col["name"] for col in inspector.get_columns("notifications")]
            if "company_id" not in columns:
                logger.info(
                    "Old 'notifications' table schema detected. Initiating migration process..."
                )

                # Rename the old table and drop index to avoid conflicts on recreate
                with engine.begin() as conn:
                    try:
                        conn.execute(text("DROP INDEX IF EXISTS ix_notifications_id;"))
                    except Exception:
                        pass
                    conn.execute(
                        text("ALTER TABLE notifications RENAME TO notifications_old;")
                    )
                logger.info("Renamed old notifications table to notifications_old.")

                # Recreate tables (creating the new notifications schema)
                Base.metadata.create_all(bind=engine)

                # Copy and map existing records to the new notifications table
                with engine.begin() as conn:
                    mapping_sql = """
                    INSERT INTO notifications (id, company_id, tender_id, type, priority, title, message, notification_metadata, is_read, created_at)
                    SELECT 
                        o.id, 
                        COALESCE(
                            (SELECT c.id FROM companies c WHERE c.user_id = o.user_id LIMIT 1),
                            (SELECT id FROM companies LIMIT 1),
                            1
                        ) as company_id, 
                        o.tender_id, 
                        'MEDIUM_MATCH' as type,
                        'LOW' as priority,
                        'Tender Alert' as title, 
                        o.message, 
                        '{}' as notification_metadata, 
                        o.is_read, 
                        o.created_at 
                    FROM notifications_old o;
                    """
                    conn.execute(text(mapping_sql))
                    conn.execute(text("DROP TABLE notifications_old;"))
                logger.info(
                    "Successfully migrated notifications data and dropped temporary old table."
                )
            else:
                logger.info("Notifications table schema is up-to-date.")
                Base.metadata.create_all(bind=engine)
        else:
            logger.info("No existing notifications table. Creating new schema...")
            Base.metadata.create_all(bind=engine)
    except Exception as e:
        logger.error(f"Migration / Database init failed: {str(e)}")
        # Attempt fallback creation to avoid application crash
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
