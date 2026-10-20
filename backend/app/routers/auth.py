from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from app.config import get_settings
from app.database import get_db
from app import models, schemas
from app.auth import get_current_user, hash_password, verify_password, create_access_token

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
settings = get_settings()

@router.post("/register", response_model=schemas.AuthResponse, status_code=status.HTTP_201_CREATED)
def register(
    payload: schemas.UserRegister,
    response: Response,
    db: Session = Depends(get_db),
):
    """Register a new user account with validated credentials."""
    existing_user = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists.",
        )

    new_user = models.User(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Generate JWT token
    access_token = create_access_token(data={"sub": str(new_user.id), "email": new_user.email})

    # Set secure HttpOnly cookie
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite="lax",
        path="/",
        max_age=settings.access_token_expire_minutes * 60,
    )

    return schemas.AuthResponse(
        user=schemas.UserResponse.model_validate(new_user),
        access_token=access_token,
        token_type="bearer",
    )


@router.post("/login", response_model=schemas.AuthResponse)
def login(
    payload: schemas.UserLogin,
    response: Response,
    db: Session = Depends(get_db),
):
    """Authenticate existing user credentials and return an access token."""
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    # Generate JWT token
    access_token = create_access_token(data={"sub": str(user.id), "email": user.email})

    # Set secure HttpOnly cookie
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite="lax",
        path="/",
        max_age=settings.access_token_expire_minutes * 60,
    )

    return schemas.AuthResponse(
        user=schemas.UserResponse.model_validate(user),
        access_token=access_token,
        token_type="bearer",
    )


@router.get("/me", response_model=schemas.UserResponse)
def get_current_user_profile(
    current_user: models.User = Depends(get_current_user),
):
    """Retrieve the profile of the currently authenticated user."""
    return schemas.UserResponse.model_validate(current_user)


@router.post("/logout")
def logout(response: Response):
    """Clear authentication session cookies."""
    response.delete_cookie(key="access_token", path="/", httponly=True, samesite="lax")
    return {"message": "Logged out successfully"}
