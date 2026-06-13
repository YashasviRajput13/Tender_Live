from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Numeric, JSON, Float
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="company_user", nullable=False)  # admin, company_user
    full_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    companies = relationship("Company", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")


class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    industry = Column(String, nullable=True)
    turnover = Column(Numeric(15, 2), nullable=True)  # in lakhs or currency equivalent
    registration_numbers = Column(String, nullable=True)
    certifications = Column(Text, nullable=True)
    gst_details = Column(String, nullable=True)
    msme_status = Column(Boolean, default=False)
    past_projects = Column(JSON, default=list)  # list of project dicts
    team_strength = Column(Integer, default=1)
    geographic_coverage = Column(JSON, default=list)  # list of locations
    required_categories = Column(JSON, default=list)  # list of service categories
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="companies")
    eligibility_reports = relationship("EligibilityReport", back_populates="company", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="company", cascade="all, delete-orphan")


class TenderSource(Base):
    __tablename__ = "tender_sources"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)  # e.g., GeM, CPPP
    base_url = Column(String, nullable=False)
    frequency_minutes = Column(Integer, default=60)
    last_scraped_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)


class Tender(Base):
    __tablename__ = "tenders"

    id = Column(Integer, primary_key=True, index=True)
    tender_id = Column(String, unique=True, index=True, nullable=False)
    title = Column(String, nullable=False)
    department = Column(String, nullable=True)
    location = Column(String, nullable=True)
    budget = Column(Numeric(15, 2), nullable=True)
    deadline = Column(DateTime, nullable=True)
    eligibility_criteria = Column(Text, nullable=True)
    raw_html = Column(Text, nullable=True)
    source_url = Column(String, nullable=True)
    bid_detail_url = Column(String, nullable=True)
    pdf_url = Column(String, nullable=True)
    source_name = Column(String, nullable=False)  # GeM, CPPP, etc.
    created_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="discovered")  # discovered, processing, analyzed

    documents = relationship("TenderDocument", back_populates="tender", cascade="all, delete-orphan")
    eligibility_reports = relationship("EligibilityReport", back_populates="tender", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="tender", cascade="all, delete-orphan")


class TenderDocument(Base):
    __tablename__ = "tender_documents"

    id = Column(Integer, primary_key=True, index=True)
    tender_id = Column(Integer, ForeignKey("tenders.id", ondelete="CASCADE"), nullable=False)
    file_name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    doc_type = Column(String, nullable=True)  # PDF, XLSX, etc.
    size_bytes = Column(Integer, nullable=True)
    parsed_json = Column(JSON, nullable=True)  # AI structured output
    created_at = Column(DateTime, default=datetime.utcnow)

    tender = relationship("Tender", back_populates="documents")


class EligibilityReport(Base):
    __tablename__ = "eligibility_reports"

    id = Column(Integer, primary_key=True, index=True)
    tender_id = Column(Integer, ForeignKey("tenders.id", ondelete="CASCADE"), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    
    eligibility = Column(String, nullable=False)  # eligible, partially_eligible, not_eligible
    confidence_score = Column(Float, default=0.0)
    opportunity_score = Column(Integer, default=0)  # 0 to 100
    
    summary = Column(Text, nullable=True)
    requirements_analysis = Column(JSON, default=dict)
    risk_analysis = Column(JSON, default=dict)
    timeline = Column(JSON, default=dict)
    checklist = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

    tender = relationship("Tender", back_populates="eligibility_reports")
    company = relationship("Company", back_populates="eligibility_reports")


class AgentTask(Base):
    __tablename__ = "agent_tasks"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    task_type = Column(String, nullable=False)  # discovery, analysis, report
    status = Column(String, default="pending")  # pending, running, completed, failed
    progress = Column(Integer, default=0)  # 0 to 100
    log_messages = Column(JSON, default=list)  # list of log string dicts
    current_agent = Column(String, nullable=True)  # scraper, document_intel, eligibility_agent, summary_agent, completed
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    tender_id = Column(Integer, ForeignKey("tenders.id", ondelete="CASCADE"), nullable=True)
    type = Column(String, nullable=False)  # HIGH_MATCH, MEDIUM_MATCH, RISK_ALERT, DEADLINE_ALERT
    priority = Column(String, default="MEDIUM", nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    notification_metadata = Column(JSON, default=dict, nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company", back_populates="notifications")
    tender = relationship("Tender", back_populates="notifications")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    action = Column(String, nullable=False)
    details = Column(JSON, default=dict)
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="audit_logs")
