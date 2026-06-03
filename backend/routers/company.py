from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import models, schemas, auth
from database import get_db

router = APIRouter(prefix="/api/company", tags=["Company Profile"])

@router.get("/profile", response_model=schemas.CompanyOut)
def get_company_profile(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """
    Retrieve company details for the logged-in user.
    """
    company = db.query(models.Company).filter(models.Company.user_id == current_user.id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company profile not found. Please create one."
        )
    return company

@router.post("/profile", response_model=schemas.CompanyOut)
def save_company_profile(profile_in: schemas.CompanyCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """
    Create or update company profile details.
    """
    company = db.query(models.Company).filter(models.Company.user_id == current_user.id).first()
    
    if company:
        # Update existing record
        company.name = profile_in.name
        company.industry = profile_in.industry
        company.turnover = profile_in.turnover
        company.registration_numbers = profile_in.registration_numbers
        company.certifications = profile_in.certifications
        company.gst_details = profile_in.gst_details
        company.msme_status = profile_in.msme_status
        company.past_projects = profile_in.past_projects
        company.team_strength = profile_in.team_strength
        company.geographic_coverage = profile_in.geographic_coverage
        company.required_categories = profile_in.required_categories
    else:
        # Create new record
        company = models.Company(
            user_id=current_user.id,
            name=profile_in.name,
            industry=profile_in.industry,
            turnover=profile_in.turnover,
            registration_numbers=profile_in.registration_numbers,
            certifications=profile_in.certifications,
            gst_details=profile_in.gst_details,
            msme_status=profile_in.msme_status,
            past_projects=profile_in.past_projects,
            team_strength=profile_in.team_strength,
            geographic_coverage=profile_in.geographic_coverage,
            required_categories=profile_in.required_categories
        )
        db.add(company)
        
    db.commit()
    db.refresh(company)
    return company
