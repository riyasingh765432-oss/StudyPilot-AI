import io
import os
from typing import Tuple
import pypdf
import docx

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt", ".md"}

def extract_text_from_file(file_bytes: bytes, filename: str) -> Tuple[str, int]:
    """
    Extract readable plain text and size in bytes from uploaded file content.
    Supported extensions: .pdf, .docx, .txt, .md.
    """
    _, ext = os.path.splitext(filename.lower())
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Unsupported file format '{ext}'. Allowed formats: PDF, DOCX, TXT, MD.")

    file_size = len(file_bytes)
    extracted_text = ""

    if ext == ".pdf":
        try:
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            pages_text = []
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    pages_text.append(text.strip())
            extracted_text = "\n\n".join(pages_text)
        except Exception as e:
            raise ValueError(f"Failed to parse PDF document: {str(e)}")

    elif ext == ".docx":
        try:
            doc = docx.Document(io.BytesIO(file_bytes))
            paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
            extracted_text = "\n\n".join(paragraphs)
        except Exception as e:
            raise ValueError(f"Failed to parse DOCX document: {str(e)}")

    elif ext in {".txt", ".md"}:
        try:
            extracted_text = file_bytes.decode("utf-8").strip()
        except UnicodeDecodeError:
            extracted_text = file_bytes.decode("latin-1", errors="replace").strip()

    return extracted_text.strip(), file_size
