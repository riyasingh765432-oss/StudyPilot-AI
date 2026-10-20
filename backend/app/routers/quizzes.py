from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.auth import get_current_user

router = APIRouter(prefix="/api/quizzes", tags=["Quiz Attempts"])

@router.get("", response_model=List[schemas.QuizAttemptResponse])
def get_user_quiz_attempts(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve all quiz attempts for the authenticated user, newest first."""
    attempts = (
        db.query(models.QuizAttempt)
        .filter(models.QuizAttempt.user_id == current_user.id)
        .order_by(models.QuizAttempt.attempted_at.desc())
        .all()
    )
    return attempts

@router.post("", response_model=schemas.QuizAttemptResponse, status_code=status.HTTP_201_CREATED)
def record_quiz_attempt(
    payload: schemas.QuizAttemptCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Record a completed quiz attempt scoped strictly to the authenticated user."""
    score = payload.score_percentage
    if score is None:
        if payload.total_questions > 0:
            score = round((payload.correct_answers / payload.total_questions) * 100.0, 1)
        else:
            score = 0.0

    attempt = models.QuizAttempt(
        user_id=current_user.id,
        topic=payload.topic,
        total_questions=payload.total_questions,
        correct_answers=payload.correct_answers,
        score_percentage=score,
        attempted_at=payload.attempted_at or models.utc_now(),
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    return attempt
