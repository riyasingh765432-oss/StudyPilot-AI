import os
from unittest.mock import MagicMock
import pytest
from app.config import get_settings
from app.services.gemini import get_genai_client, generate_study_summary, answer_notes_question

def test_gemini_model_configuration():
    settings = get_settings()
    assert settings.gemini_model == "gemini-3.8-flash"
    assert settings.effective_gemini_model == "gemini-3.8-flash"

def test_gemini_model_override(monkeypatch):
    monkeypatch.setenv("GEMINI_MODEL", "gemini-3.8-flash")
    settings = get_settings()
    assert settings.effective_gemini_model == "gemini-3.8-flash"

def test_gemini_client_initialization():
    settings = get_settings()
    if settings.has_gemini_key:
        client = get_genai_client()
        assert client is not None

def test_gemini_summary_generation_with_model(monkeypatch):
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.text = "**Overview**: Test study summary generated."
    mock_client.models.generate_content.return_value = mock_response

    monkeypatch.setattr("app.services.gemini.get_genai_client", lambda: mock_client)

    summary = generate_study_summary("Sample calculus text", "calculus.txt")
    assert "Overview" in summary

    # Verify that gemini-3.8-flash is passed to generate_content
    call_kwargs = mock_client.models.generate_content.call_args[1]
    assert call_kwargs["model"] == "gemini-3.8-flash"

def test_gemini_ask_notes_with_model(monkeypatch):
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.text = "A derivative is the rate of change."
    mock_client.models.generate_content.return_value = mock_response

    monkeypatch.setattr("app.services.gemini.get_genai_client", lambda: mock_client)

    result = answer_notes_question(
        "What is a derivative?",
        [{"filename": "math.txt", "text": "Derivative is rate of change"}]
    )
    assert result["model"] == "gemini-3.8-flash"
    assert "derivative" in result["answer"].lower()
