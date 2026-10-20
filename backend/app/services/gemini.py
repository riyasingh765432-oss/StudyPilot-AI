import logging
import time
from typing import List, Dict, Optional, Tuple, Any
from google import genai
from app.config import get_settings

logger = logging.getLogger(__name__)

class GeminiServiceError(Exception):
    """Base exception for Gemini service errors."""
    pass

class GeminiUnavailableError(GeminiServiceError):
    """Raised when Gemini service is temporarily unavailable (503 / high demand) after retries."""
    pass

class GeminiRateLimitError(GeminiServiceError):
    """Raised when Gemini rate limit is exceeded (429) after retries."""
    pass

def is_transient_gemini_error(e: Exception) -> Tuple[bool, Optional[str]]:
    """
    Check if an exception indicates a transient 503 (Unavailable / High Demand)
    or 429 (Rate Limit / Quota Exceeded) error.
    Returns (is_transient, error_category).
    """
    code = getattr(e, "code", None)
    err_str = str(e).lower()

    if code == 503 or "503" in err_str or "unavailable" in err_str or "high demand" in err_str or "overloaded" in err_str:
        return True, "unavailable"

    if code == 429 or "429" in err_str or "resource_exhausted" in err_str or "rate limit" in err_str or "quota" in err_str:
        return True, "rate_limit"

    return False, None

def execute_gemini_call_with_retry(
    client: genai.Client,
    model_name: str,
    prompt: str,
    max_retries: int = 3,
    initial_delay: float = 1.0,
    backoff_multiplier: float = 2.0,
) -> str:
    """
    Execute client.models.generate_content with bounded retries and exponential backoff
    for temporary 503 (Unavailable/High Demand) and 429 (Rate Limit) errors.
    Non-retryable errors fail immediately without waiting.
    """
    last_error: Optional[Exception] = None
    last_error_type: Optional[str] = None

    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
            )
            if response and response.text:
                return response.text.strip()
            return "No response could be generated."
        except Exception as e:
            last_error = e
            is_transient, err_type = is_transient_gemini_error(e)
            last_error_type = err_type

            if not is_transient:
                # Non-transient error (e.g., 400 Invalid Argument, 401 Unauthorized, 404 Model Not Found)
                logger.error(f"Non-retryable Gemini error encountered with model '{model_name}': {e}")
                raise RuntimeError(f"Gemini API request failed using model '{model_name}': {str(e)}") from e

            # Transient error (503 or 429)
            if attempt < max_retries - 1:
                delay = initial_delay * (backoff_multiplier ** attempt)
                logger.warning(
                    f"Gemini {err_type} error on attempt {attempt + 1}/{max_retries} "
                    f"using model '{model_name}': {e}. Retrying in {delay:.1f}s..."
                )
                time.sleep(delay)
            else:
                logger.error(
                    f"Gemini {err_type} error exhausted all {max_retries} attempts "
                    f"using model '{model_name}': {e}"
                )

    # If all retries exhausted:
    if last_error_type == "unavailable":
        raise GeminiUnavailableError(
            f"The Gemini AI service is temporarily experiencing high demand (model '{model_name}'). "
            f"All {max_retries} automatic attempts failed. Please wait a few moments and retry."
        ) from last_error
    elif last_error_type == "rate_limit":
        raise GeminiRateLimitError(
            f"The Gemini AI rate limit was exceeded (model '{model_name}'). "
            f"All {max_retries} automatic attempts failed. Please wait a moment and retry."
        ) from last_error
    else:
        raise RuntimeError(
            f"Gemini API request failed using model '{model_name}': {str(last_error)}"
        ) from last_error

def get_genai_client() -> Optional[genai.Client]:
    """Retrieve an initialized Gemini Client if API key is configured."""
    settings = get_settings()
    if not settings.has_gemini_key:
        return None
    return genai.Client(api_key=settings.effective_gemini_api_key)

def generate_study_summary(document_text: str, filename: str) -> str:
    """
    Generate a structured, curriculum-focused study summary from document text using Gemini.
    """
    settings = get_settings()
    client = get_genai_client()
    if not client:
        raise ValueError(
            "Gemini API key is not configured. Add GEMINI_API_KEY to your backend/.env file to activate AI summary generation."
        )

    if not document_text.strip():
        raise ValueError("Cannot summarize an empty document.")

    # Limit text length to prevent context explosion if huge document
    truncated_text = document_text[:30000]
    model_name = settings.effective_gemini_model

    prompt = f"""You are StudyPilot AI, an expert personal study coach.
Analyze the following study material from '{filename}' and produce a comprehensive, structured study summary.

Structure your response with:
1. **Executive Overview**: A 2-3 sentence high-level synthesis of what this material covers.
2. **Key Concepts & Definitions**: The most important terms, theorems, formulas, or concepts explained clearly.
3. **Core Study Takeaways**: Bullet points highlighting critical exam-relevant takeaways.
4. **Active Recall Prompt**: 2-3 self-test questions based on this material to test understanding.

Study Material:
\"\"\"
{truncated_text}
\"\"\"
"""

    return execute_gemini_call_with_retry(
        client=client,
        model_name=model_name,
        prompt=prompt,
    )

def answer_notes_question(question: str, documents: List[Dict[str, str]]) -> Dict[str, Any]:
    """
    Answer a student's question grounded strictly in their uploaded study notes.
    """
    settings = get_settings()
    client = get_genai_client()
    if not client:
        raise ValueError(
            "Gemini API key is not configured. Add GEMINI_API_KEY to your backend/.env file to activate Ask Your Notes."
        )

    if not documents:
        raise ValueError("No study notes found in your library to answer questions against.")

    model_name = settings.effective_gemini_model

    # Compile context from documents (up to 35k chars total)
    context_blocks = []
    sources = []
    total_len = 0
    for doc in documents:
        name = doc.get("filename", "Untitled")
        text = doc.get("text", "")
        if text:
            sources.append(name)
            snippet = text[:15000]
            context_blocks.append(f"--- Document: {name} ---\n{snippet}\n")
            total_len += len(snippet)
            if total_len > 35000:
                break

    context_str = "\n".join(context_blocks)

    prompt = f"""You are StudyPilot AI, an AI study companion.
Answer the student's question using ONLY the provided study notes context below.
If the answer cannot be determined or found within the provided notes, clearly explain that the notes do not contain this information, and do not make up facts.
Cite the relevant document name(s) when referencing information.

Study Notes Context:
{context_str}

Student's Question:
{question}
"""

    answer = execute_gemini_call_with_retry(
        client=client,
        model_name=model_name,
        prompt=prompt,
    )
    return {
        "question": question,
        "answer": answer,
        "sources": sources,
        "model": model_name,
    }
