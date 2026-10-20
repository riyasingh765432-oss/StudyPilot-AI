import io
import os
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

os.environ["DATABASE_URL"] = "sqlite:///./test_studypilot.db"

from app.database import Base, get_db
from app.main import app

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

@pytest.mark.asyncio
async def test_document_upload_and_extraction():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Register user
        reg = await client.post(
            "/api/auth/register",
            json={"name": "Doc User", "email": "doc@example.com", "password": "Password123!"},
        )
        token = reg.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Upload a valid text file
        sample_text = "Photosynthesis is the process by which green plants transform light energy into chemical energy."
        files = {
            "file": ("biology_ch1.txt", io.BytesIO(sample_text.encode("utf-8")), "text/plain")
        }
        upload_resp = await client.post("/api/documents/upload", headers=headers, files=files)
        assert upload_resp.status_code == 201
        doc_data = upload_resp.json()
        assert doc_data["original_filename"] == "biology_ch1.txt"
        assert doc_data["has_text"] is True
        doc_id = doc_data["id"]

        # 2. List documents
        list_resp = await client.get("/api/documents", headers=headers)
        assert list_resp.status_code == 200
        assert len(list_resp.json()) == 1

        # 3. Retrieve document detail
        detail_resp = await client.get(f"/api/documents/{doc_id}", headers=headers)
        assert detail_resp.status_code == 200
        assert "Photosynthesis" in detail_resp.json()["extracted_text"]

        # 4. Reject unsupported format
        bad_files = {
            "file": ("script.exe", io.BytesIO(b"malicious content"), "application/octet-stream")
        }
        bad_resp = await client.post("/api/documents/upload", headers=headers, files=bad_files)
        assert bad_resp.status_code == 400
        assert "Unsupported format" in bad_resp.json()["detail"]

        # 5. Check AI status endpoint
        status_resp = await client.get("/api/ai/status")
        assert status_resp.status_code == 200
        assert "configured" in status_resp.json()
        assert "model" in status_resp.json()

        # 6. Delete document
        del_resp = await client.delete(f"/api/documents/{doc_id}", headers=headers)
        assert del_resp.status_code == 204

        # Verify deletion
        list_after = await client.get("/api/documents", headers=headers)
        assert len(list_after.json()) == 0
