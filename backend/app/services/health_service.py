from __future__ import annotations

import httpx
from sqlalchemy import text

from app.core.config import settings
from app.core.database import engine

DEFAULT_JWT_SECRET = "replace-with-a-long-random-secret-before-deployment"


def check_database() -> dict:
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
            try:
                postgis_available = bool(connection.execute(
                    text("SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis')")
                ).scalar())
            except Exception:
                postgis_available = False
        return {"status": "CONNECTED", "postgis": "AVAILABLE" if postgis_available else "NOT_INSTALLED_OPTIONAL"}
    except Exception as exc:
        return {"status": "UNAVAILABLE", "postgis": "UNKNOWN", "error": type(exc).__name__}


async def check_ml_service() -> dict:
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            response = await client.get(f"{settings.ml_service_url}/health")
            response.raise_for_status()
            body = response.json()
        if body.get("model_loaded") is False:
            return {"status": "STARTING", "model_loaded": False}
        return {"status": "READY", "model_loaded": body.get("model_loaded"), "model_version": body.get("model_version", "unknown")}
    except Exception as exc:
        return {"status": "UNAVAILABLE_FALLBACK_ACTIVE", "model_loaded": False, "error": type(exc).__name__}


async def build_system_readiness() -> dict:
    database = check_database()
    ml = await check_ml_service()
    database_ready = database["status"] == "CONNECTED"
    return {
        "overall_status": "READY" if database_ready else "DEGRADED",
        "api": "READY",
        "database": database["status"],
        "postgis": database["postgis"],
        "ml_service": ml["status"],
        "ml_model_loaded": ml.get("model_loaded"),
        "ml_model_version": ml.get("model_version"),
        "data_mode": "SIMULATED_DEMO" if settings.demo_mode else "NON_DEMO",
        "demo_mode": settings.demo_mode,
        "jwt_secret_configuration": "DEFAULT_DEMO_SECRET" if settings.jwt_secret == DEFAULT_JWT_SECRET else "CUSTOM_SECRET",
        "weather_provider": "SIMULATION_ONLY",
        "sms_provider": "NOT_CONFIGURED",
        "email_provider": "NOT_CONFIGURED",
        "whatsapp_provider": "NOT_CONFIGURED",
        "media_storage": "SUPABASE_STORAGE_CONFIGURED" if settings.supabase_url and settings.supabase_service_role_key else ("LOCAL_VOLUME" if not __import__("os").getenv("VERCEL") else "NOT_CONFIGURED"),
        "initial_admin_bootstrap": "CONFIGURED" if settings.initial_admin_email and settings.initial_admin_password else "NOT_CONFIGURED",
        "vision_model": "HUMAN_REVIEW_REQUIRED",
        "dispatch_authority": "HUMAN_APPROVAL_REQUIRED",
    }
