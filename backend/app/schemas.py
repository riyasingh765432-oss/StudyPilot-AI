from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

# -------------------------------------------------------------
# User & Auth Schemas
# -------------------------------------------------------------

class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Full name")
    email: EmailStr = Field(..., description="Unique email address")
    password: str = Field(..., min_length=6, max_length=128, description="Password (at least 6 characters)")

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip().lower()
        return v

    @field_validator("name", mode="before")
    @classmethod
    def sanitize_name(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip()
        return v


class UserLogin(BaseModel):
    email: EmailStr = Field(..., description="User account email")
    password: str = Field(..., min_length=1, max_length=128, description="User password")

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip().lower()
        return v


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AuthResponse(BaseModel):
    user: UserResponse
    access_token: str
    token_type: str = "bearer"


# -------------------------------------------------------------
# Study Task Schemas
# -------------------------------------------------------------

class StudyTaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    subject: str = Field(..., min_length=1, max_length=100)
    scheduled_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$", description="Date formatted as YYYY-MM-DD")
    estimated_minutes: int = Field(default=30, ge=1, le=1440)


class StudyTaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    subject: Optional[str] = Field(None, min_length=1, max_length=100)
    scheduled_date: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    estimated_minutes: Optional[int] = Field(None, ge=1, le=1440)
    completed: Optional[bool] = None


class StudyTaskResponse(BaseModel):
    id: int
    user_id: int
    title: str
    subject: str
    scheduled_date: str
    estimated_minutes: int
    completed: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# -------------------------------------------------------------
# Study Session Schemas
# -------------------------------------------------------------

class StudySessionCreate(BaseModel):
    subject: str = Field(..., min_length=1, max_length=100)
    duration_minutes: int = Field(..., ge=1, le=1440)
    completed_at: Optional[datetime] = None


class StudySessionResponse(BaseModel):
    id: int
    user_id: int
    subject: str
    duration_minutes: int
    completed_at: datetime

    model_config = ConfigDict(from_attributes=True)


# -------------------------------------------------------------
# Quiz Attempt Schemas
# -------------------------------------------------------------

class QuizAttemptCreate(BaseModel):
    topic: str = Field(..., min_length=1, max_length=150)
    total_questions: int = Field(..., ge=1, le=500)
    correct_answers: int = Field(..., ge=0)
    score_percentage: Optional[float] = None
    attempted_at: Optional[datetime] = None


class QuizAttemptResponse(BaseModel):
    id: int
    user_id: int
    topic: str
    total_questions: int
    correct_answers: int
    score_percentage: float
    attempted_at: datetime

    model_config = ConfigDict(from_attributes=True)


# -------------------------------------------------------------
# Document & AI Schemas (Stage 3)
# -------------------------------------------------------------

class DocumentResponse(BaseModel):
    id: int
    user_id: int
    original_filename: str
    file_size: Optional[int] = None
    summary: Optional[str] = None
    has_text: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentDetailResponse(DocumentResponse):
    extracted_text: Optional[str] = None


class DocumentSummaryResponse(BaseModel):
    document_id: int
    original_filename: str
    summary: str


class AskQuestionRequest(BaseModel):
    question: str = Field(..., min_length=2, max_length=2000, description="Question about study notes")
    document_id: Optional[int] = Field(None, description="Optional specific document to ask about")


class AskQuestionResponse(BaseModel):
    question: str
    answer: str
    sources: List[str] = []
    model: str


class AIStatusResponse(BaseModel):
    configured: bool
    model: str
