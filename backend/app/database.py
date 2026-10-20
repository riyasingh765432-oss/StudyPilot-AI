from typing import Generator
from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.config import get_settings

settings = get_settings()

# Configure SQLite engine
connect_args = {}
if settings.database_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.database_url,
    connect_args=connect_args,
    echo=False,
)

# Enable Foreign Key enforcement for SQLite
@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if settings.database_url.startswith("sqlite"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db() -> Generator[Session, None, None]:
    """Dependency that yields an active database session and closes it after the request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db() -> None:
    """Initialize database tables according to defined SQLAlchemy models."""
    from app import models  # noqa: F401
    Base.metadata.create_all(bind=engine)

    # Lightweight migration: ensure 'summary' column exists in documents table for SQLite
    with engine.begin() as conn:
        try:
            result = conn.exec_driver_sql("PRAGMA table_info(documents)")
            columns = [row[1] for row in result.fetchall()]
            if columns and "summary" not in columns:
                conn.exec_driver_sql("ALTER TABLE documents ADD COLUMN summary TEXT")
        except Exception:
            pass
