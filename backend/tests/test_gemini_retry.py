import io
import os
from unittest.mock import MagicMock, patch
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

os.environ["DATABASE_URL"] = "sqlite:///./test_studypilot.db"

from app.database import Base, get_db
from app.main import app
from app.services.gemini import (
    execute_gemini_call_with_retry,
    generate_study_summary,
    GeminiUnavailableError,
    GeminiRateLimitError,
    is_transient_gemini_error,
)

test_engine = create_engine("sqlite:///./test_studypilot.db", connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(autouse=True)
def setup_test_db():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)

def test_is_transient_gemini_error_detection():
    # 503 UNAVAILABLE
    err_503 = Exception("503 UNAVAILABLE: This model is currently experiencing high demand.")
    is_t, cat = is_transient_gemini_error(err_503)
    assert is_t is True
    assert cat == "unavailable"

    # 429 RATE LIMIT
    err_429 = Exception("429 RESOURCE_EXHAUSTED: Rate limit exceeded.")
    is_t, cat = is_transient_gemini_error(err_429)
    assert is_t is True
    assert cat == "rate_limit"

    # 404 NOT FOUND (non-transient)
    err_404 = Exception("404 NOT_FOUND: Model not found.")
    is_t, cat = is_transient_gemini_error(err_404)
    assert is_t is False
    assert cat is None

def test_transient_503_recovers_on_retry():
    mock_client = MagicMock()
    mock_success_resp = MagicMock()
    mock_success_resp.text = "Generated Study Summary after recovery."

    # Fail on attempt 1 with 503, succeed on attempt 2
    mock_client.models.generate_content.side_effect = [
        Exception("503 UNAVAILABLE. This model is currently experiencing high demand."),
        mock_success_resp,
    ]

    with patch("time.sleep", return_value=None):
        result = execute_gemini_call_with_retry(
            client=mock_client,
            model_name="gemini-3.8-flash",
            prompt="Summarize this",
            max_retries=3,
            initial_delay=0.01,
        )

    assert result == "Generated Study Summary after recovery."
    assert mock_client.models.generate_content.call_count == 2

def test_persistent_503_exhausts_retries_and_raises_unavailable_error():
    mock_client = MagicMock()
    mock_client.models.generate_content.side_effect = Exception(
        "503 UNAVAILABLE. This model is currently experiencing high demand."
    )

    with patch("time.sleep", return_value=None):
        with pytest.raises(GeminiUnavailableError) as exc_info:
            execute_gemini_call_with_retry(
                client=mock_client,
                model_name="gemini-3.8-flash",
                prompt="Summarize this",
                max_retries=3,
                initial_delay=0.01,
            )

    assert "temporarily experiencing high demand" in str(exc_info.value)
    assert mock_client.models.generate_content.call_count == 3

def test_non_retryable_error_fails_immediately():
    mock_client = MagicMock()
    mock_client.models.generate_content.side_effect = Exception("400 INVALID_ARGUMENT: Prompt too long.")

    with patch("time.sleep", return_value=None):
        with pytest.raises(RuntimeError) as exc_info:
            execute_gemini_call_with_retry(
                client=mock_client,
                model_name="gemini-3.8-flash",
                prompt="Summarize this",
                max_retries=3,
                initial_delay=0.01,
            )

    assert "400 INVALID_ARGUMENT" in str(exc_info.value)
    # Should fail on first attempt without retrying
    assert mock_client.models.generate_content.call_count == 1

def test_rate_limit_429_exhausts_retries_and_raises_rate_limit_error():
    mock_client = MagicMock()
    mock_client.models.generate_content.side_effect = Exception(
        "429 RESOURCE_EXHAUSTED: Rate limit exceeded."
    )

    with patch("time.sleep", return_value=None):
        with pytest.raises(GeminiRateLimitError) as exc_info:
            execute_gemini_call_with_retry(
                client=mock_client,
                model_name="gemini-3.8-flash",
                prompt="Summarize this",
                max_retries=3,
                initial_delay=0.01,
            )

    assert "rate limit was exceeded" in str(exc_info.value)
    assert mock_client.models.generate_content.call_count == 3

@pytest.mark.asyncio
async def test_summarize_endpoint_returns_503_on_gemini_unavailable():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Register user
        reg = await client.post(
            "/api/auth/register",
            json={"name": "Retry User", "email": "retry@example.com", "password": "Password123!"},
        )
        token = reg.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Upload a document
        files = {
            "file": ("notes.txt", io.BytesIO(b"Mitochondria is the powerhouse of the cell."), "text/plain")
        }
        upload_resp = await client.post("/api/documents/upload", headers=headers, files=files)
        assert upload_resp.status_code == 201
        doc_id = upload_resp.json()["id"]

        # Mock generate_study_summary to raise GeminiUnavailableError
        with patch(
            "app.routers.documents.generate_study_summary",
            side_effect=GeminiUnavailableError("The Gemini AI service is temporarily experiencing high demand."),
        ):
            resp = await client.post(f"/api/documents/{doc_id}/summarize", headers=headers)
            assert resp.status_code == 503
            assert "temporarily experiencing high demand" in resp.json()["detail"]
