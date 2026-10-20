import os
import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session
from app.config import get_settings
from app.database import get_db
from app import models, schemas
from app.auth import get_current_user
from app.services.extractor import extract_text_from_file, ALLOWED_EXTENSIONS
from app.services.gemini import (
    generate_study_summary,
    answer_notes_question,
    GeminiUnavailableError,
    GeminiRateLimitError,
)

router = APIRouter(prefix="/api", tags=["Notes & AI"])
settings = get_settings()

UPLOAD_BASE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")

def ensure_upload_dir(user_id: int) -> str:
    user_dir = os.path.join(UPLOAD_BASE_DIR, str(user_id))
    os.makedirs(user_dir, exist_ok=True)
    return user_dir

@router.get("/ai/status", response_model=schemas.AIStatusResponse)
def get_ai_status():
    """Return whether Gemini API is configured with a valid key and which model is active."""
    current_settings = get_settings()
    return schemas.AIStatusResponse(
        configured=current_settings.has_gemini_key,
        model=current_settings.effective_gemini_model,
    )

@router.get("/documents", response_model=List[schemas.DocumentResponse])
def get_user_documents(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve all study documents uploaded by the authenticated user."""
    docs = (
        db.query(models.Document)
        .filter(models.Document.user_id == current_user.id)
        .order_by(models.Document.created_at.desc())
        .all()
    )
    return [
        schemas.DocumentResponse(
            id=d.id,
            user_id=d.user_id,
            original_filename=d.original_filename,
            file_size=d.file_size,
            summary=d.summary,
            has_text=bool(d.extracted_text and d.extracted_text.strip()),
            created_at=d.created_at,
        )
        for d in docs
    ]

@router.post("/documents/upload", response_model=schemas.DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload and parse a study document (PDF, DOCX, TXT, MD) scoped to the authenticated user."""
    filename = file.filename or "uploaded_document"
    _, ext = os.path.splitext(filename.lower())
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported format '{ext}'. Supported formats: PDF (.pdf), Word (.docx), Markdown (.md), Text (.txt).",
        )

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty.",
        )

    # Extract text from document
    try:
        extracted_text, file_size = extract_text_from_file(file_bytes, filename)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to process document content: {str(e)}",
        )

    # Save file safely on disk
    user_upload_dir = ensure_upload_dir(current_user.id)
    safe_filename = f"{os.urandom(6).hex()}_{filename}"
    saved_path = os.path.join(user_upload_dir, safe_filename)
    try:
        with open(saved_path, "wb") as f:
            f.write(file_bytes)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not persist file to storage: {str(e)}",
        )

    # Save document record in SQLite
    doc_record = models.Document(
        user_id=current_user.id,
        original_filename=filename,
        storage_path=saved_path,
        file_size=file_size,
        extracted_text=extracted_text,
    )
    db.add(doc_record)
    db.commit()
    db.refresh(doc_record)

    return schemas.DocumentResponse(
        id=doc_record.id,
        user_id=doc_record.user_id,
        original_filename=doc_record.original_filename,
        file_size=doc_record.file_size,
        summary=doc_record.summary,
        has_text=bool(doc_record.extracted_text and doc_record.extracted_text.strip()),
        created_at=doc_record.created_at,
    )

@router.get("/documents/{document_id}", response_model=schemas.DocumentDetailResponse)
def get_document_detail(
    document_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve full document details, including extracted text content."""
    doc = (
        db.query(models.Document)
        .filter(models.Document.id == document_id, models.Document.user_id == current_user.id)
        .first()
    )
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found.",
        )

    return schemas.DocumentDetailResponse(
        id=doc.id,
        user_id=doc.user_id,
        original_filename=doc.original_filename,
        file_size=doc.file_size,
        summary=doc.summary,
        extracted_text=doc.extracted_text,
        has_text=bool(doc.extracted_text and doc.extracted_text.strip()),
        created_at=doc.created_at,
    )

@router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a study document and remove its stored file."""
    doc = (
        db.query(models.Document)
        .filter(models.Document.id == document_id, models.Document.user_id == current_user.id)
        .first()
    )
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found.",
        )

    if doc.storage_path and os.path.exists(doc.storage_path):
        try:
            os.remove(doc.storage_path)
        except OSError:
            pass

    db.delete(doc)
    db.commit()
    return None

@router.post("/documents/{document_id}/summarize", response_model=schemas.DocumentSummaryResponse)
def summarize_document(
    document_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate an AI study summary for the specified document using Google Gemini."""
    doc = (
        db.query(models.Document)
        .filter(models.Document.id == document_id, models.Document.user_id == current_user.id)
        .first()
    )
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found.",
        )

    if not doc.extracted_text or not doc.extracted_text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This document does not contain readable text to summarize.",
        )

    try:
        summary_text = generate_study_summary(doc.extracted_text, doc.original_filename)
        doc.summary = summary_text
        db.commit()
        db.refresh(doc)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except GeminiUnavailableError as gue:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(gue))
    except GeminiRateLimitError as rle:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(rle))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))

    return schemas.DocumentSummaryResponse(
        document_id=doc.id,
        original_filename=doc.original_filename,
        summary=doc.summary,
    )

@router.post("/notes/ask", response_model=schemas.AskQuestionResponse)
def ask_notes(
    payload: schemas.AskQuestionRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Ask a question grounded strictly in user's study documents using Google Gemini."""
    query = db.query(models.Document).filter(models.Document.user_id == current_user.id)
    if payload.document_id:
        query = query.filter(models.Document.id == payload.document_id)

    docs = query.all()
    if not docs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No study notes available to answer your question. Please upload notes in Notes Studio first.",
        )

    doc_contexts = [
        {"filename": d.original_filename, "text": d.extracted_text or ""}
        for d in docs
        if d.extracted_text and d.extracted_text.strip()
    ]

    if not doc_contexts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded study materials do not contain readable text.",
        )

    try:
        result = answer_notes_question(payload.question, doc_contexts)
        return schemas.AskQuestionResponse(
            question=payload.question,
            answer=result["answer"],
            sources=result["sources"],
            model=result["model"],
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except GeminiUnavailableError as gue:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(gue))
    except GeminiRateLimitError as rle:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(rle))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))
