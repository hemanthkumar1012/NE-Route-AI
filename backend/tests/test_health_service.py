import pytest
from app.services import health_service


def test_readiness_reports_connected_database_and_fallback_ml(monkeypatch):
    monkeypatch.setattr(health_service, "check_database", lambda: {
        "status": "CONNECTED", "postgis": "AVAILABLE"
    })

    async def unavailable_ml():
        return {"status": "UNAVAILABLE_FALLBACK_ACTIVE", "model_loaded": False}

    monkeypatch.setattr(health_service, "check_ml_service", unavailable_ml)
    result = __import__("asyncio").run(health_service.build_system_readiness())

    assert result["overall_status"] == "READY"
    assert result["database"] == "CONNECTED"
    assert result["ml_service"] == "UNAVAILABLE_FALLBACK_ACTIVE"


def test_readiness_is_degraded_when_database_is_unavailable(monkeypatch):
    monkeypatch.setattr(health_service, "check_database", lambda: {
        "status": "UNAVAILABLE", "postgis": "UNKNOWN", "error": "OperationalError"
    })

    async def ready_ml():
        return {"status": "READY", "model_loaded": True, "model_version": "test"}

    monkeypatch.setattr(health_service, "check_ml_service", ready_ml)
    result = __import__("asyncio").run(health_service.build_system_readiness())

    assert result["overall_status"] == "DEGRADED"
    assert result["database"] == "UNAVAILABLE"
    assert result["ml_service"] == "READY"
