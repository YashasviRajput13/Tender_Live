from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from datetime import timedelta
import models, schemas, auth
from database import get_db

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED)
def register_user(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user account.
    """
    existing_user = db.query(models.User).filter(models.User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="A user with this email already exists."
        )
        
    hashed_password = auth.get_password_hash(user_in.password)
    new_user = models.User(
        email=user_in.email,
        hashed_password=hashed_password,
        role=user_in.role or "company_user",
        full_name=user_in.full_name
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Auto-seed a default empty company profile for the user
    if new_user.role == "company_user":
        default_company = models.Company(
            user_id=new_user.id,
            name=f"{new_user.full_name or 'My'} Enterprise Ltd",
            industry="IT & Software Services",
            turnover=150.00,  # 1.5 Crores
            msme_status=True,
            past_projects=[
                {"title": "E-Gov Web Portal Development", "client": "Municipal Corp", "value": 4500000, "year": 2024},
                {"title": "Cloud Migration Services", "client": "State Finance Corp", "value": 2500000, "year": 2025}
            ],
            geographic_coverage=["New Delhi", "Maharashtra", "Karnataka"],
            required_categories=["IT Software", "Web Development", "Cloud Services"]
        )
        db.add(default_company)
        db.commit()
        
    return new_user

@router.post("/login", response_model=schemas.Token)
async def login_access_token(request: Request, db: Session = Depends(get_db)):
    """
    Authenticate user via credentials and return JWT access token.
    """
    content_type = request.headers.get("content-type", "")
    username = None
    password = None

    if content_type.startswith("application/json"):
        payload = await request.json()
        username = payload.get("username") or payload.get("email")
        password = payload.get("password")
    else:
        form = await request.form()
        username = form.get("username") or form.get("email")
        password = form.get("password")

    if not username or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username and password must be provided.",
        )

    user = db.query(models.User).filter(models.User.email == username).first()
    if not user or not auth.verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = auth.create_access_token(data={"sub": user.email})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role
    }

@router.get("/me", response_model=schemas.UserOut)
def read_current_user(current_user: models.User = Depends(auth.get_current_user)):
    """
    Fetch the currently active authenticated user profile.
    """
    return current_user
