from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.api.v1.router import router
from app.api.v1.advanced import router as advanced_router
from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.seed import seed_database, seed_advanced_data
from app.models import entities  # noqa: F401

@asynccontextmanager
async def lifespan(app: FastAPI):
    # PostGIS is available in the compose image; SQLite-like dev fallback is intentionally not configured.
    with engine.begin() as connection:
        connection.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_database(db)
        seed_advanced_data(db)
    yield
    engine.dispose()

app = FastAPI(title="NE-Route AI API", version="3.0.0", description="Simulated NER logistics decision-support prototype", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=[settings.frontend_origin], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(router, prefix="/api/v1")
app.include_router(advanced_router, prefix="/api/v1")

@app.get("/health")
def health():
    return {"status": "ok", "service": "ne-route-api", "data_mode": "SIMULATED"}
