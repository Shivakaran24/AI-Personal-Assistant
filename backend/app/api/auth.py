from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.database.models import User
from app.core.auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

@router.post("/register", response_model=AuthResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    email_clean = req.email.strip().lower()
    if not email_clean or "@" not in email_clean:
        raise HTTPException(status_code=400, detail="Invalid email address")
    if not req.password or len(req.password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters long")
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="Name is required")

    existing_user = db.query(User).filter(User.email == email_clean).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    hashed = hash_password(req.password)
    user = User(
        email=email_clean,
        name=req.name.strip(),
        hashed_password=hashed
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.id, "email": user.email})
    return AuthResponse(
        access_token=token,
        user=UserResponse(id=user.id, name=user.name, email=user.email)
    )

@router.post("/login", response_model=AuthResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    email_clean = req.email.strip().lower()
    user = db.query(User).filter(User.email == email_clean).first()

    # Special handling for demo login if user doesn't exist yet
    if not user and email_clean == "demo@aiassistant.io" and req.password == "demo1234":
        hashed = hash_password("demo1234")
        user = User(email="demo@aiassistant.io", name="Demo User", hashed_password=hashed)
        db.add(user)
        db.commit()
        db.refresh(user)

    if not user:
        raise HTTPException(status_code=400, detail="Invalid email or password")

    if user.hashed_password:
        if not verify_password(req.password, user.hashed_password):
            raise HTTPException(status_code=400, detail="Invalid email or password")
    else:
        # If user existed without password, update their password now
        user.hashed_password = hash_password(req.password)
        db.commit()

    token = create_access_token({"sub": user.id, "email": user.email})
    return AuthResponse(
        access_token=token,
        user=UserResponse(id=user.id, name=user.name, email=user.email)
    )

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email
    )
