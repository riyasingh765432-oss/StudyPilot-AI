from datetime import datetime, timezone
from fastapi import APIRouter
from pydantic import BaseModel, Field
from app.config import get_settings

router = APIRouter(prefix="/api", tags=["System"])

class HealthResponse(BaseModel):
    status: str = Field(default="ok", description="Current system operational status")
    app_name: str = Field(description="Name of the application")
    version: str = Field(description="Current version of the application")
    environment: str = Field(description="Deployment environment")
    timestamp: str = Field(description="UTC timestamp of the health check")

@router.get("/health", response_model=HealthResponse)
async def get_health() -> HealthResponse:
    settings = get_settings()
    return HealthResponse(
        status="ok",
        app_name=settings.app_name,
        version=settings.app_version,
        environment=settings.app_env,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )
