from sqlalchemy.exc import OperationalError

from auth import get_password_hash
from database import engine, SessionLocal, Base
import models


def seed_initial_data() -> None:
    Base.metadata.create_all(bind=engine)

    try:
        with SessionLocal() as db:
            admin_email = "admin@tenderai.com"
            admin = (
                db.query(models.User).filter(models.User.email == admin_email).first()
            )
            if not admin:
                admin = models.User(
                    email=admin_email,
                    hashed_password=get_password_hash("admin_secure_pwd_123"),
                    role="admin",
                    full_name="System Administrator",
                )
                db.add(admin)
                db.commit()
                print("Seeded admin user: admin@tenderai.com / admin_secure_pwd_123")

            user_email = "user@tenderai.com"
            user = db.query(models.User).filter(models.User.email == user_email).first()
            if not user:
                user = models.User(
                    email=user_email,
                    hashed_password=get_password_hash("user_secure_pwd_123"),
                    role="company_user",
                    full_name="Yashasvi Rajput",
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
                            "year": 2024,
                        },
                        {
                            "title": "Cloud Infrastructure Migration",
                            "client": "National Electronics Corp",
                            "value": 6500000,
                            "description": "Migration of legacy server workloads to scalable hybrid cloud spaces.",
                            "year": 2025,
                        },
                    ],
                    team_strength=75,
                    geographic_coverage=[
                        "New Delhi",
                        "Maharashtra",
                        "Karnataka",
                        "Tamil Nadu",
                    ],
                    required_categories=[
                        "IT Infrastructure",
                        "Software Development",
                        "Networking",
                        "Cloud Services",
                    ],
                )
                db.add(company)
                db.commit()
                print("Seeded company user: user@tenderai.com / user_secure_pwd_123")

            sources = [
                {"name": "GeM", "url": "https://bidplus.gem.gov.in/bidlists"},
                {
                    "name": "CPPP",
                    "url": "https://eprocure.gov.in/cppp/latestactivetenders",
                },
            ]
            for src in sources:
                existing = (
                    db.query(models.TenderSource)
                    .filter(models.TenderSource.name == src["name"])
                    .first()
                )
                if not existing:
                    new_src = models.TenderSource(
                        name=src["name"],
                        base_url=src["url"],
                        frequency_minutes=60,
                        is_active=True,
                    )
                    db.add(new_src)
            db.commit()
            print("Seeded tender sources.")

    except OperationalError as exc:
        print(f"Failed to seed database: {exc}")


if __name__ == "__main__":
    seed_initial_data()
