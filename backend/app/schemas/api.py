from datetime import datetime, timezone
from typing import Literal
from uuid import UUID
from pydantic import BaseModel, Field

class LoginRequest(BaseModel):
    email: str
    password: str

class IncidentCreate(BaseModel):
    incident_type: Literal["FLOOD", "LANDSLIDE", "DAMAGED_ROAD", "DAMAGED_BRIDGE", "TRAFFIC_JAM", "FALLEN_TREE", "ROAD_CLOSURE", "OTHER"]
    severity: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    description: str = Field(min_length=5, max_length=2000)
    district_name: str
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)

class IncidentStatusUpdate(BaseModel):
    status: Literal["VERIFIED", "REJECTED", "RESOLVED"]
    notes: str = ""

class RoutePlanRequest(BaseModel):
    origin: str
    destination: str
    cargo_priority: Literal["CRITICAL", "HIGH", "NORMAL", "LOW"] = "NORMAL"

class CopilotAsk(BaseModel):
    question: str = Field(min_length=3, max_length=2000)

class AlertUpdate(BaseModel):
    status: Literal["ACKNOWLEDGED", "ASSIGNED", "RESOLVED"]
    assigned_to: str | None = None

class OfflineSync(BaseModel):
    client_uuid: UUID
    incident_type: str
    severity: str
    description: str
    district_name: str
    latitude: float
    longitude: float
    captured_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MissionStop(BaseModel):
    name: str
    node: str
    priority: Literal["CRITICAL", "HIGH", "NORMAL", "LOW"] = "NORMAL"

class MissionOptimizeRequest(BaseModel):
    origin: str
    stops: list[MissionStop] = Field(min_length=1, max_length=8)
    cargo_priority: Literal["CRITICAL", "HIGH", "NORMAL", "LOW"] = "NORMAL"
    return_to_origin: bool = False

class ScenarioRequest(BaseModel):
    rainfall_multiplier: float = Field(default=1.0, ge=0.5, le=3.0)
    bridge_vulnerability_delta: float = Field(default=0.0, ge=0, le=1)
    horizon_hours: int = Field(default=6, ge=1, le=72)

class PlaybookRequest(BaseModel):
    hazard: Literal["FLOOD", "LANDSLIDE", "DAMAGED_BRIDGE", "ROAD_CLOSURE", "DAMAGED_ROAD"]
    severity: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    district: str
    incident_reference: str | None = None
