from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from decimal import Decimal

# --- AUTHENTICATION ---
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    role: Optional[str] = "company_user"  # admin, company_user

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str

class UserOut(BaseModel):
    id: int
    email: EmailStr
    role: str
    full_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# --- COMPANY PROFILE ---
class ProjectSchema(BaseModel):
    title: str
    client: str
    value: Decimal
    description: Optional[str] = None
    year: int

class CompanyCreate(BaseModel):
    name: str
    industry: Optional[str] = None
    turnover: Optional[Decimal] = None
    registration_numbers: Optional[str] = None
    certifications: Optional[str] = None
    gst_details: Optional[str] = None
    msme_status: Optional[bool] = False
    past_projects: Optional[List[Dict[str, Any]]] = []
    team_strength: Optional[int] = 1
    geographic_coverage: Optional[List[str]] = []
    required_categories: Optional[List[str]] = []

class CompanyOut(BaseModel):
    id: int
    user_id: int
    name: str
    industry: Optional[str] = None
    turnover: Optional[Decimal] = None
    registration_numbers: Optional[str] = None
    certifications: Optional[str] = None
    gst_details: Optional[str] = None
    msme_status: bool
    past_projects: List[Dict[str, Any]]
    team_strength: int
    geographic_coverage: List[str]
    required_categories: List[str]
    updated_at: datetime

    class Config:
        from_attributes = True


# --- TENDER SCHEMAS ---
class TenderDocumentOut(BaseModel):
    id: int
    file_name: str
    file_path: str
    doc_type: Optional[str] = None
    size_bytes: Optional[int] = None
    parsed_json: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True

class TenderOut(BaseModel):
    id: int
    tender_id: str
    title: str
    department: Optional[str] = None
    location: Optional[str] = None
    budget: Optional[Decimal] = None
    deadline: Optional[datetime] = None
    eligibility_criteria: Optional[str] = None
    source_url: Optional[str] = None
    source_name: str
    created_at: datetime
    status: str
    documents: List[TenderDocumentOut] = []
    # Computed from best eligibility report (if analyzed)
    opportunity_score: Optional[int] = None
    eligibility: Optional[str] = None

    class Config:
        from_attributes = True

    @classmethod
    def model_validate(cls, obj, *args, **kwargs):
        instance = super().model_validate(obj, *args, **kwargs)
        # Populate opportunity_score and eligibility from best eligibility report
        if hasattr(obj, 'eligibility_reports') and obj.eligibility_reports:
            best = max(obj.eligibility_reports, key=lambda r: r.opportunity_score, default=None)
            if best:
                instance.opportunity_score = best.opportunity_score
                instance.eligibility = best.eligibility
        return instance


# --- ELIGIBILITY REPORT ---
class EligibilityReportOut(BaseModel):
    id: int
    tender_id: int
    company_id: int
    eligibility: str  # eligible, partially_eligible, not_eligible
    confidence_score: float
    opportunity_score: int
    summary: Optional[str] = None
    requirements_analysis: Dict[str, Any]
    risk_analysis: Dict[str, Any]
    timeline: Dict[str, Any]
    checklist: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True


# --- AGENT TASKS ---
class TaskStartRequest(BaseModel):
    task_type: str = Field(..., description="e.g. discovery, analysis, report")
    target_id: Optional[str] = Field(None, description="Tender ID or other trigger argument")

class LogMessageSchema(BaseModel):
    timestamp: str
    level: str
    message: str

class AgentTaskOut(BaseModel):
    id: str
    task_type: str
    status: str
    progress: int
    log_messages: List[Dict[str, Any]]
    current_agent: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# --- NOTIFICATIONS & AUDIT ---
class NotificationOut(BaseModel):
    id: int
    type: str
    priority: str
    title: str
    message: str
    is_read: bool
    created_at: datetime
    tender_id: Optional[int] = None
    company_id: int
    notification_metadata: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True

    @classmethod
    def model_validate(cls, obj, *args, **kwargs):
        instance = super().model_validate(obj, *args, **kwargs)
        if hasattr(obj, 'notification_metadata'):
            instance.notification_metadata = obj.notification_metadata
        return instance
