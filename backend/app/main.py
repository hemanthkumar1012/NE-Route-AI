import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.api.v1.router import router
from app.api.v1.advanced import router as advanced_router
from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.models import entities  # noqa: F401
from app.seed import seed_database, seed_advanced_data

logger = logging.getLogger("neroute.api")
DEFAULT_JWT_SECRET = "replace-with-a-long-random-secret-before-deployment"


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not settings.demo_mode and settings.jwt_secret == DEFAULT_JWT_SECRET:
        raise RuntimeError("Set a unique JWT_SECRET before starting with DEMO_MODE=false")

    # The current prototype stores coordinates as JSON. PostGIS is useful when
    # available, but it is not a startup blocker for the existing API schema.
    try:
        with engine.begin() as connection:
            connection.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
    except Exception as exc:
        logger.warning("PostGIS extension was not enabled; coordinate-based prototype APIs remain available: %s", exc)

    Base.metadata.create_all(bind=engine)
    if settings.demo_mode:
        with SessionLocal() as db:
            seed_database(db)
            seed_advanced_data(db)
        logger.warning("DEMO_MODE is enabled: seeded accounts and synthetic operational data are active")
    yield
    engine.dispose()


app = FastAPI(
    title="NE-Route AI API",
    version="4.0.0",
    description="Logistics, disruption and relief decision-support prototype",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router, prefix="/api/v1")
app.include_router(advanced_router, prefix="/api/v1")


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "ne-route-api",
        "mode": "DEMO" if settings.demo_mode else "NON_DEMO",
    }


@app.get("/health/ready")
async def health_ready():
    from app.services.health_service import build_system_readiness

    status = await build_system_readiness()
    code = 200 if status["database"] == "CONNECTED" else 503
    return JSONResponse(status, status_code=code)
