from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.auth import get_current_user

router = APIRouter(prefix="/api/sessions", tags=["Study Sessions"])

@router.get("", response_model=List[schemas.StudySessionResponse])
def get_user_sessions(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve all study sessions for the authenticated user, newest first."""
    sessions = (
        db.query(models.StudySession)
        .filter(models.StudySession.user_id == current_user.id)
        .order_by(models.StudySession.completed_at.desc())
        .all()
    )
    return sessions

@router.post("", response_model=schemas.StudySessionResponse, status_code=status.HTTP_201_CREATED)
def log_session(
    payload: schemas.StudySessionCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Log a completed study session scoped strictly to the authenticated user."""
    session_obj = models.StudySession(
        user_id=current_user.id,
        subject=payload.subject,
        duration_minutes=payload.duration_minutes,
        completed_at=payload.completed_at or models.utc_now(),
    )
    db.add(session_obj)
    db.commit()
    db.refresh(session_obj)
    return session_obj
