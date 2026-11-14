import logging
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select, text
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.api.v1.router import router
from app.api.v1.advanced import router as advanced_router
from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.core.security import hash_password
from app.models import entities  # noqa: F401
from app.models.entities import User
from app.seed import seed_database, seed_advanced_data

logger = logging.getLogger("neroute.api")
DEFAULT_JWT_SECRET = "replace-with-a-long-random-secret-before-deployment"


def bootstrap_initial_admin() -> bool:
    """Create one administrator idempotently when secure bootstrap credentials are supplied."""
    if not settings.initial_admin_email or not settings.initial_admin_password:
        return False
    values = {
        "id": str(uuid.uuid4()),
        "email": settings.initial_admin_email.strip().lower(),
        "full_name": "NE-Route AI Administrator",
        "role": "ADMIN",
        "password_hash": hash_password(settings.initial_admin_password),
        "is_active": True,
    }
    with SessionLocal() as db:
        db.execute(pg_insert(User).values(**values).on_conflict_do_nothing(index_elements=["email"]))
        db.commit()
        return db.scalar(select(User.id).where(User.email == values["email"])) is not None


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.jwt_secret == DEFAULT_JWT_SECRET and not settings.demo_mode:
        raise RuntimeError("Set a unique high-entropy JWT_SECRET before starting outside demo mode")

    if settings.demo_mode:
        try:
            with engine.begin() as connection:
                connection.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
        except Exception as exc:
            logger.warning("PostGIS extension not enabled; prototype coordinates are JSON: %s", exc)
        Base.metadata.create_all(bind=engine)
        with SessionLocal() as db:
            seed_database(db)
            seed_advanced_data(db)
        logger.warning("DEMO_MODE is enabled: public demo users and synthetic data are active")
    else:
        # Production schema is migration-managed; never create tables or seed fake records here.
        bootstrap_initial_admin()

    yield
    engine.dispose()


app = FastAPI(title="NE-Route AI API", version="4.1.0",
              description="Logistics, disruption and relief decision-support prototype")

allowed_origins = {settings.frontend_origin}
if settings.vercel_url:
    allowed_origins.add(f"https://{settings.vercel_url.removeprefix('https://')}")

app.add_middleware(CORSMiddleware, allow_origins=sorted(allowed_origins),
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(router, prefix="/api/v1")
app.include_router(advanced_router, prefix="/api/v1")


@app.get("/health")
def health():
    return {"status": "ok", "service": "ne-route-api",
            "mode": "DEMO" if settings.demo_mode else "NON_DEMO"}


@app.get("/health/ready")
async def health_ready():
    from app.services.health_service import build_system_readiness
    status = await build_system_readiness()
    return JSONResponse(status, status_code=200 if status["database"] == "CONNECTED" else 503)
