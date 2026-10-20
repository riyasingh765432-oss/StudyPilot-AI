import os
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Set test database environment before importing app
os.environ["DATABASE_URL"] = "sqlite:///./test_studypilot.db"

from app.database import Base, get_db
from app.main import app

# Setup test DB engine
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
async def test_register_and_login_flow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Register User A
        reg_resp = await client.post(
            "/api/auth/register",
            json={"name": "Alex Chen", "email": "alex@example.com", "password": "SecurePassword123!"},
        )
        assert reg_resp.status_code == 201
        data = reg_resp.json()
        assert data["user"]["name"] == "Alex Chen"
        assert data["user"]["email"] == "alex@example.com"
        assert "access_token" in data
        assert "access_token" in reg_resp.cookies

        # 2. Duplicate registration should fail
        dup_resp = await client.post(
            "/api/auth/register",
            json={"name": "Alex Duplicate", "email": "ALEX@example.com", "password": "AnotherPassword!"},
        )
        assert dup_resp.status_code == 400
        assert "already exists" in dup_resp.json()["detail"]

        # 3. Login with correct password
        login_resp = await client.post(
            "/api/auth/login",
            json={"email": "alex@example.com", "password": "SecurePassword123!"},
        )
        assert login_resp.status_code == 200
        login_data = login_resp.json()
        token = login_data["access_token"]
        assert token is not None

        # 4. Login with wrong password
        bad_login = await client.post(
            "/api/auth/login",
            json={"email": "alex@example.com", "password": "WrongPassword!"},
        )
        assert bad_login.status_code == 401

        # 5. Access /api/auth/me with Bearer token
        me_resp = await client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert me_resp.status_code == 200
        assert me_resp.json()["email"] == "alex@example.com"

        # 6. Access /api/auth/me via Cookie (without Authorization header)
        me_cookie_resp = await client.get("/api/auth/me")
        assert me_cookie_resp.status_code == 200
        assert me_cookie_resp.json()["email"] == "alex@example.com"

        # 7. Logout clears session
        logout_resp = await client.post("/api/auth/logout")
        assert logout_resp.status_code == 200

        # Clear client cookies to test unauthenticated request
        client.cookies.clear()

        # 8. Access /api/auth/me without token or cookie should be 401
        unauth_resp = await client.get("/api/auth/me")
        assert unauth_resp.status_code == 401

@pytest.mark.asyncio
async def test_user_data_isolation_and_crud():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Register User 1
        u1_resp = await client.post(
            "/api/auth/register",
            json={"name": "User One", "email": "user1@example.com", "password": "Password123!"},
        )
        token1 = u1_resp.json()["access_token"]
        headers1 = {"Authorization": f"Bearer {token1}"}

        # Clear client cookies so User 2 is separate
        client.cookies.clear()

        # Register User 2
        u2_resp = await client.post(
            "/api/auth/register",
            json={"name": "User Two", "email": "user2@example.com", "password": "Password123!"},
        )
        token2 = u2_resp.json()["access_token"]
        headers2 = {"Authorization": f"Bearer {token2}"}

        # User 1 creates a study task
        create_task_resp = await client.post(
            "/api/tasks",
            headers=headers1,
            json={
                "title": "Read Chapter 4 Biology",
                "subject": "Biology",
                "scheduled_date": "2026-10-21",
                "estimated_minutes": 45,
            },
        )
        assert create_task_resp.status_code == 201
        task1 = create_task_resp.json()
        task1_id = task1["id"]
        assert task1["title"] == "Read Chapter 4 Biology"
        assert task1["completed"] is False

        # User 1 sees their task
        list1 = await client.get("/api/tasks", headers=headers1)
        assert list1.status_code == 200
        assert len(list1.json()) == 1

        # User 2 lists tasks - should be empty (strict user isolation!)
        list2 = await client.get("/api/tasks", headers=headers2)
        assert list2.status_code == 200
        assert len(list2.json()) == 0

        # User 2 tries to update User 1's task - should get 404
        bad_update = await client.patch(
            f"/api/tasks/{task1_id}",
            headers=headers2,
            json={"completed": True},
        )
        assert bad_update.status_code == 404

        # User 1 completes the task
        good_update = await client.patch(
            f"/api/tasks/{task1_id}",
            headers=headers1,
            json={"completed": True},
        )
        assert good_update.status_code == 200
        assert good_update.json()["completed"] is True

        # User 1 logs a study session
        session_resp = await client.post(
            "/api/sessions",
            headers=headers1,
            json={"subject": "Biology", "duration_minutes": 50},
        )
        assert session_resp.status_code == 201
        assert session_resp.json()["duration_minutes"] == 50

        # User 1 records a quiz attempt
        quiz_resp = await client.post(
            "/api/quizzes",
            headers=headers1,
            json={
                "topic": "Cellular Respiration",
                "total_questions": 10,
                "correct_answers": 8,
            },
        )
        assert quiz_resp.status_code == 201
        assert quiz_resp.json()["score_percentage"] == 80.0

        # User 1 deletes their task
        del_resp = await client.delete(f"/api/tasks/{task1_id}", headers=headers1)
        assert del_resp.status_code == 204

        # Verify task is gone
        list_after_del = await client.get("/api/tasks", headers=headers1)
        assert len(list_after_del.json()) == 0
