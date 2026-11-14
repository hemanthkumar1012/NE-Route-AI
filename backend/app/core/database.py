import os
from urllib.parse import urlsplit

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import settings


def normalize_database_url(value: str) -> str:
    """Normalize Supabase's postgres URI to the installed psycopg 3 driver."""
    if value.startswith("postgres://"):
        return value.replace("postgres://", "postgresql+psycopg://", 1)
    if value.startswith("postgresql://"):
        return value.replace("postgresql://", "postgresql+psycopg://", 1)
    return value


def is_serverless_database(value: str) -> bool:
    host = (urlsplit(value).hostname or "").lower()
    return os.getenv("VERCEL") == "1" or host.endswith(".supabase.co") or host.endswith(".pooler.supabase.com")


database_url = normalize_database_url(settings.database_url)
engine_options = {"pool_pre_ping": True}
if is_serverless_database(database_url):
    engine_options = {
        "poolclass": NullPool,
        "connect_args": {"sslmode": "require", "prepare_threshold": None},
    }

engine = create_engine(database_url, **engine_options)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
