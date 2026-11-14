from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated
import csv
import io
import json
import os
import uuid

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import current_user, issue_token, require_roles, verify_password
from app.models.entities import Alert, District, Incident, RoadSegment, Shipment, User, Vehicle, WeatherObservation
from app.schemas.api import (CopilotAsk, IncidentCreate, IncidentStatusUpdate, LoginRequest, OfflineSync,
    RoutePlanRequest, AlertUpdate, MissionOptimizeRequest, ScenarioRequest, PlaybookRequest)
from app.routing.optimizer import options_for
from app.services.copilot_service import answer_question
from app.services.intelligence_service import analytics_snapshot, simulate_scenario
from app.services.mission_service import optimize_mission
from app.services.response_playbook import build_playbook
from app.services.risk_service import predict_segment

router = APIRouter()


def user_or_401(email: str, password: str, db: Session) -> User:
    user = db.scalar(select(User).where(User.email == email, User.is_active.is_(True)))
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return user


@router.post("/auth/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = user_or_401(payload.email, payload.password, db)
    return {"access_token": issue_token(user), "token_type": "bearer", "user": {"id": str(user.id), "name": user.full_name, "email": user.email, "role": user.role}}


@router.get("/auth/me")
def me(user: User = Depends(current_user)):
    return {"id": str(user.id), "name": user.full_name, "email": user.email, "role": user.role}


@router.get("/dashboard/summary")
def dashboard(db: Session = Depends(get_db), user: User = Depends(current_user)):
    incidents = list(db.scalars(select(Incident)))
    segments = list(db.scalars(select(RoadSegment)))
    vehicles = list(db.scalars(select(Vehicle)))
    shipments = list(db.scalars(select(Shipment)))
    alerts = list(db.scalars(select(Alert).where(Alert.status != "RESOLVED")))
    active_incidents = [i for i in incidents if i.status in ("PENDING", "VERIFIED")]
    blocked = [s for s in segments if s.operational_status == "CLOSED"]
    risky = [s for s in segments if s.risk_score >= 65 and s.operational_status != "CLOSED"]
    delayed = [s for s in shipments if s.status == "DELAYED"]
    districts = list(db.scalars(select(District)))
    return {"data_mode": "SIMULATED", "kpis": {"active_incidents": len(active_incidents), "blocked_routes": len(blocked),
        "high_risk_corridors": len(risky), "vehicles_in_transit": sum(v.status == "IN_TRANSIT" for v in vehicles),
        "delayed_shipments": len(delayed), "open_alerts": len(alerts), "districts_monitored": len(districts)},
        "districts": [{"name": d.name, "accessibility_score": d.accessibility_score, "state": d.state_name} for d in districts]}


@router.get("/districts")
def districts(db: Session = Depends(get_db), user: User = Depends(current_user)):
    return [{"id": str(d.id), "name": d.name, "state": d.state_name, "accessibility_score": d.accessibility_score} for d in db.scalars(select(District).order_by(District.name))]


@router.get("/map/geojson")
def map_geojson(db: Session = Depends(get_db), user: User = Depends(current_user)):
    features = []
    for segment in db.scalars(select(RoadSegment)):
        features.append({"type": "Feature", "geometry": {"type": "LineString", "coordinates": segment.coordinates},
            "properties": {"id": str(segment.id), "name": segment.name, "risk_score": segment.risk_score,
                "risk_level": segment.risk_level, "status": segment.operational_status, "kind": "road", "data_mode": "SIMULATED"}})
    for incident in db.scalars(select(Incident)):
        features.append({"type": "Feature", "geometry": {"type": "Point", "coordinates": incident.coordinates},
            "properties": {"id": str(incident.id), "type": incident.incident_type, "severity": incident.severity,
                "status": incident.status, "kind": "incident", "data_mode": "SIMULATED"}})
    for vehicle in db.scalars(select(Vehicle)):
        features.append({"type": "Feature", "geometry": {"type": "Point", "coordinates": vehicle.coordinates},
            "properties": {"id": str(vehicle.id), "vehicle_code": vehicle.vehicle_code, "status": vehicle.status,
                "shipment_code": vehicle.shipment_code, "kind": "vehicle", "data_mode": "SIMULATED"}})
    return {"type": "FeatureCollection", "features": features, "data_mode": "SIMULATED"}


@router.get("/risks/segments")
def risk_segments(db: Session = Depends(get_db), user: User = Depends(current_user)):
    return [predict_segment(segment) for segment in db.scalars(select(RoadSegment).order_by(RoadSegment.risk_score.desc()))]


@router.get("/weather/observations")
def weather(db: Session = Depends(get_db), user: User = Depends(current_user)):
    return [{"district": w.district_name, "rainfall_24h_mm": w.rainfall_24h_mm, "forecast_rainfall_mm": w.forecast_rainfall_mm,
        "observed_at": w.observed_at.isoformat(), "source": "SYNTHETIC_DEMO"} for w in db.scalars(select(WeatherObservation))]


@router.get("/incidents")
def list_incidents(db: Session = Depends(get_db), user: User = Depends(current_user)):
    return [{"id": str(i.id), "report_code": i.report_code, "incident_type": i.incident_type, "severity": i.severity,
        "status": i.status, "description": i.description, "district": i.district_name, "coordinates": i.coordinates,
        "reported_at": i.reported_at.isoformat(), "data_mode": "SIMULATED"} for i in db.scalars(select(Incident).order_by(Incident.reported_at.desc()))]


@router.post("/incidents")
def create_incident(payload: IncidentCreate, db: Session = Depends(get_db), user: User = Depends(current_user)):
    incident = Incident(report_code=f"NER-{uuid.uuid4().hex[:8].upper()}", incident_type=payload.incident_type,
        severity=payload.severity, status="PENDING", description=payload.description, district_name=payload.district_name,
        coordinates=[payload.longitude, payload.latitude], reported_by=user.email, reported_at=datetime.now(timezone.utc))
    db.add(incident)
    db.commit()
    db.refresh(incident)
    return {"id": str(incident.id), "report_code": incident.report_code, "status": incident.status, "message": "Incident submitted for officer verification"}


@router.post("/incidents/{incident_id}/media")
async def upload_incident_media(
    incident_id: uuid.UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    incident = db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    content = await file.read()
    if not content or len(content) > 8 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image must be non-empty and no larger than 8 MB")
    if file.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(status_code=415, detail="Only JPEG, PNG and WebP images are accepted")

    suffix = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}[file.content_type]
    key = f"{incident_id}/{uuid.uuid4().hex}{suffix}"

    if settings.supabase_url and settings.supabase_service_role_key:
        bucket = settings.supabase_storage_bucket.strip("/")
        endpoint = f"{settings.supabase_url.rstrip('/')}/storage/v1/object/{bucket}/{key}"
        headers = {
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
            "apikey": settings.supabase_service_role_key,
            "Content-Type": file.content_type,
            "x-upsert": "false",
        }
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.put(endpoint, content=content, headers=headers)
        if response.status_code not in (200, 201):
            raise HTTPException(status_code=502, detail="Supabase Storage upload failed; verify the private bucket and service configuration")
        return {"incident_id": str(incident_id), "storage_key": key, "bucket": bucket,
                "size_bytes": len(content), "status": "UPLOADED_PENDING_HUMAN_REVIEW",
                "storage_provider": "SUPABASE_STORAGE"}

    if os.getenv("VERCEL") == "1":
        raise HTTPException(status_code=503, detail="Persistent incident media storage is not configured. Add server-only Supabase Storage settings.")

    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    target = upload_dir / key
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(content)
    return {"incident_id": str(incident_id), "storage_key": key, "size_bytes": len(content),
            "status": "UPLOADED_PENDING_HUMAN_REVIEW", "storage_provider": "LOCAL_VOLUME"}


@router.patch("/incidents/{incident_id}/status")
def update_incident(incident_id: uuid.UUID, payload: IncidentStatusUpdate, db: Session = Depends(get_db), user: User = Depends(require_roles("ADMIN", "GOVERNMENT_OFFICIAL"))):
    incident = db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    if payload.status not in ("VERIFIED", "REJECTED", "RESOLVED"):
        raise HTTPException(status_code=422, detail="Invalid status transition")
    incident.status = payload.status
    incident.verified_by = user.email
    incident.verification_notes = payload.notes
    db.commit()
    return {"id": str(incident.id), "status": incident.status}


@router.get("/vehicles")
def vehicles(db: Session = Depends(get_db), user: User = Depends(current_user)):
    return [{"id": str(v.id), "vehicle_code": v.vehicle_code, "driver_name": v.driver_name, "status": v.status,
        "speed_kmph": v.speed_kmph, "coordinates": v.coordinates, "shipment_code": v.shipment_code, "gps_at": v.gps_at.isoformat()} for v in db.scalars(select(Vehicle))]


@router.get("/shipments")
def shipments(db: Session = Depends(get_db), user: User = Depends(current_user)):
    return [{"id": str(s.id), "shipment_code": s.shipment_code, "cargo_type": s.cargo_type, "priority": s.priority,
        "origin": s.origin, "destination": s.destination, "status": s.status, "eta_minutes": s.eta_minutes,
        "vehicle_code": s.vehicle_code, "deadline_minutes": s.deadline_minutes} for s in db.scalars(select(Shipment))]


@router.post("/routes/plan")
def plan_route(payload: RoutePlanRequest, db: Session = Depends(get_db), user: User = Depends(current_user)):
    segments = list(db.scalars(select(RoadSegment)))
    result = options_for(segments, payload.origin, payload.destination, payload.cargo_priority)
    return {"origin": payload.origin, "destination": payload.destination, "cargo_priority": payload.cargo_priority,
        "options": result, "data_mode": "SIMULATED"}


@router.get("/alerts")
def alerts(db: Session = Depends(get_db), user: User = Depends(current_user)):
    return [{"id": str(a.id), "title": a.title, "message": a.message, "severity": a.severity, "status": a.status,
        "created_at": a.created_at.isoformat(), "entity_type": a.entity_type, "entity_id": a.entity_id} for a in db.scalars(select(Alert).order_by(Alert.created_at.desc()))]


@router.patch("/alerts/{alert_id}")
def update_alert(alert_id: uuid.UUID, payload: AlertUpdate, db: Session = Depends(get_db), user: User = Depends(require_roles("ADMIN", "GOVERNMENT_OFFICIAL", "LOGISTICS_MANAGER"))):
    alert = db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    if payload.status not in ("ACKNOWLEDGED", "ASSIGNED", "RESOLVED"):
        raise HTTPException(status_code=422, detail="Invalid alert status")
    alert.status = payload.status
    alert.assigned_to = payload.assigned_to or alert.assigned_to
    db.commit()
    return {"id": str(alert.id), "status": alert.status}


@router.post("/copilot/ask")
def copilot(payload: CopilotAsk, db: Session = Depends(get_db), user: User = Depends(current_user)):
    return answer_question(payload.question, db)


@router.post("/offline/sync")
def offline_sync(payload: OfflineSync, db: Session = Depends(get_db), user: User = Depends(current_user)):
    # Client UUID makes retries safe; this in-memory demo DB stores only the resulting incident.
    existing = db.scalar(select(Incident).where(Incident.report_code == f"OFF-{payload.client_uuid.hex[:12].upper()}"))
    if existing:
        return {"client_uuid": str(payload.client_uuid), "status": "SYNCED", "incident_id": str(existing.id), "duplicate": True}
    incident = Incident(report_code=f"OFF-{payload.client_uuid.hex[:12].upper()}", incident_type=payload.incident_type,
        severity=payload.severity, status="PENDING", description=payload.description, district_name=payload.district_name,
        coordinates=[payload.longitude, payload.latitude], reported_by=user.email, reported_at=payload.captured_at)
    db.add(incident)
    db.commit()
    db.refresh(incident)
    return {"client_uuid": str(payload.client_uuid), "status": "SYNCED", "incident_id": str(incident.id), "duplicate": False}


@router.post("/analytics/scenario")
def scenario(payload: ScenarioRequest, db: Session = Depends(get_db), user: User = Depends(current_user)):
    return simulate_scenario(db, payload)


@router.get("/analytics/intelligence")
def intelligence(db: Session = Depends(get_db), user: User = Depends(current_user)):
    return analytics_snapshot(db)


@router.get("/analytics/export.csv")
def export_csv(db: Session = Depends(get_db), user: User = Depends(current_user)):
    rows = analytics_snapshot(db)
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["record_type", "name", "status", "risk_score", "detail"])
    for segment in rows["corridor_watchlist"]:
        writer.writerow(["CORRIDOR", segment["name"], segment["status"], segment["risk_score"], segment["explanation"]])
    for shipment in rows["cargo_exposure"]:
        writer.writerow(["SHIPMENT", shipment["shipment_code"], shipment["status"], shipment["risk_score"], shipment["destination"]])
    for alert in rows["response_queue"]:
        writer.writerow(["ALERT", alert["title"], alert["status"], alert["risk_score"], alert["recommended_action"]])
    return StreamingResponse(iter([buffer.getvalue()]), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=ne-route-operations.csv"})


@router.get("/system/readiness")
async def readiness():
    from app.services.health_service import build_system_readiness
    return await build_system_readiness()


@router.post("/missions/optimize")
def missions(payload: MissionOptimizeRequest, db: Session = Depends(get_db), user: User = Depends(current_user)):
    return optimize_mission(db, payload)


@router.post("/response/playbook")
def response_playbook(payload: PlaybookRequest, user: User = Depends(current_user)):
    return build_playbook(payload)


@router.post("/demo/trigger-disruption")
def trigger_disruption(db: Session = Depends(get_db), user: User = Depends(require_roles("ADMIN", "GOVERNMENT_OFFICIAL"))):
    if not settings.demo_mode:
        raise HTTPException(status_code=404, detail="Demo controls are disabled outside DEMO_MODE")
    segment = db.scalar(select(RoadSegment).where(RoadSegment.name == "Guwahati–Dimapur Corridor"))
    if not segment:
        raise HTTPException(status_code=404, detail="Demo corridor not found")
    segment.operational_status = "CLOSED"
    segment.risk_score = 100
    segment.risk_level = "BLOCKED"
    alert = Alert(title="Landslide: Guwahati–Dimapur corridor", message="Simulated landslide closure. Review affected shipments and approve an alternative route.", severity="CRITICAL", status="OPEN", entity_type="ROAD_SEGMENT", entity_id=str(segment.id))
    db.add(alert)
    db.commit()
    return {"status": "SIMULATED_DISRUPTION_CREATED", "segment_id": str(segment.id), "alert_id": str(alert.id)}


@router.post("/demo/reset")
def reset_demo(db: Session = Depends(get_db), user: User = Depends(require_roles("ADMIN"))):
    if not settings.demo_mode:
        raise HTTPException(status_code=404, detail="Demo controls are disabled outside DEMO_MODE")
    segment = db.scalar(select(RoadSegment).where(RoadSegment.name == "Guwahati–Dimapur Corridor"))
    if segment:
        segment.operational_status = "OPEN"
        segment.risk_score = 78
        segment.risk_level = "HIGH_RISK"
    db.commit()
    return {"status": "DEMO_RESET", "data_mode": "SIMULATED"}


@router.websocket("/ws/live")
async def live_socket(websocket: WebSocket):
    await websocket.accept()
    try:
        from app.seed import vehicle_position_stream
        async for update in vehicle_position_stream():
            await websocket.send_json(update)
    except WebSocketDisconnect:
        return
