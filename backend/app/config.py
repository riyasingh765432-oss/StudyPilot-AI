import os
from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings

_backend_env = Path(__file__).resolve().parent.parent / ".env"

class Settings(BaseSettings):
    app_name: str = "StudyPilot AI API"
    app_version: str = "0.3.0"
    app_env: str = "development"
    debug: bool = True
    port: int = 8000
    host: str = "127.0.0.1"
    allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Database configuration
    database_url: str = "sqlite:///./studypilot.db"

    # Authentication & JWT configuration
    jwt_secret_key: str = "studypilot-super-secret-development-key-change-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440  # 24 hours

    # Google Gemini API configuration (defaults to gemini-3.8-flash)
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.8-flash"

    model_config = {
        "env_file": (str(_backend_env), ".env", "backend/.env"),
        "extra": "ignore",
    }

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]

    @property
    def effective_gemini_api_key(self) -> str:
        key = os.getenv("GEMINI_API_KEY") or self.gemini_api_key
        return key.strip().strip('"').strip("'")

    @property
    def effective_gemini_model(self) -> str:
        model = os.getenv("GEMINI_MODEL") or self.gemini_model or "gemini-3.8-flash"
        return model.strip().strip('"').strip("'")

    @property
    def has_gemini_key(self) -> bool:
        return bool(self.effective_gemini_api_key)

@lru_cache()
def get_settings() -> Settings:
    return Settings()
