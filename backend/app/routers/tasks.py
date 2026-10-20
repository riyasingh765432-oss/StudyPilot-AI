from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.auth import get_current_user

router = APIRouter(prefix="/api/tasks", tags=["Study Tasks"])

@router.get("", response_model=List[schemas.StudyTaskResponse])
def get_user_tasks(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve all study tasks for the authenticated user, ordered by scheduled date."""
    tasks = (
        db.query(models.StudyTask)
        .filter(models.StudyTask.user_id == current_user.id)
        .order_by(models.StudyTask.scheduled_date.asc(), models.StudyTask.id.desc())
        .all()
    )
    return tasks

@router.post("", response_model=schemas.StudyTaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    payload: schemas.StudyTaskCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new study task scoped strictly to the authenticated user."""
    task = models.StudyTask(
        user_id=current_user.id,
        title=payload.title,
        subject=payload.subject,
        scheduled_date=payload.scheduled_date,
        estimated_minutes=payload.estimated_minutes,
        completed=False,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task

@router.patch("/{task_id}", response_model=schemas.StudyTaskResponse)
def update_task(
    task_id: int,
    payload: schemas.StudyTaskUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a study task ensuring the user owns the task."""
    task = (
        db.query(models.StudyTask)
        .filter(models.StudyTask.id == task_id, models.StudyTask.user_id == current_user.id)
        .first()
    )
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Study task not found.",
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)

    db.commit()
    db.refresh(task)
    return task

@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a study task ensuring the user owns the task."""
    task = (
        db.query(models.StudyTask)
        .filter(models.StudyTask.id == task_id, models.StudyTask.user_id == current_user.id)
        .first()
    )
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Study task not found.",
        )

    db.delete(task)
    db.commit()
    return None
