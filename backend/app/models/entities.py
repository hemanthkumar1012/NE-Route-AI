from datetime import datetime, timezone
import uuid
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


def now_utc():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(150))
    role: Mapped[str] = mapped_column(String(40), default="FIELD_OFFICER")
    password_hash: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

class District(Base):
    __tablename__ = "districts"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(120), unique=True)
    state_name: Mapped[str] = mapped_column(String(100))
    accessibility_score: Mapped[int] = mapped_column(Integer, default=80)
    coordinates: Mapped[list] = mapped_column(JSON, default=list)

class RoadSegment(Base):
    __tablename__ = "road_segments"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    external_id: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(180))
    from_node: Mapped[str] = mapped_column(String(80))
    to_node: Mapped[str] = mapped_column(String(80))
    distance_km: Mapped[float] = mapped_column(Float)
    base_eta_minutes: Mapped[int] = mapped_column(Integer)
    risk_score: Mapped[int] = mapped_column(Integer, default=20)
    risk_level: Mapped[str] = mapped_column(String(30), default="SAFE")
    operational_status: Mapped[str] = mapped_column(String(30), default="OPEN")
    terrain: Mapped[str] = mapped_column(String(40), default="HILLY")
    slope_percent: Mapped[float] = mapped_column(Float, default=8)
    elevation_m: Mapped[float] = mapped_column(Float, default=600)
    rainfall_24h_mm: Mapped[float] = mapped_column(Float, default=20)
    forecast_rainfall_mm: Mapped[float] = mapped_column(Float, default=15)
    historical_incidents_30d: Mapped[int] = mapped_column(Integer, default=0)
    traffic_index: Mapped[float] = mapped_column(Float, default=.2)
    road_condition_score: Mapped[float] = mapped_column(Float, default=.8)
    bridge_vulnerability: Mapped[float] = mapped_column(Float, default=.1)
    coordinates: Mapped[list] = mapped_column(JSON, default=list)

class Incident(Base):
    __tablename__ = "incidents"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    report_code: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    incident_type: Mapped[str] = mapped_column(String(40))
    severity: Mapped[str] = mapped_column(String(30))
    status: Mapped[str] = mapped_column(String(30), default="PENDING")
    description: Mapped[str] = mapped_column(Text)
    district_name: Mapped[str] = mapped_column(String(120))
    coordinates: Mapped[list] = mapped_column(JSON)
    reported_by: Mapped[str] = mapped_column(String(255))
    verified_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    verification_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    reported_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

class Vehicle(Base):
    __tablename__ = "vehicles"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    vehicle_code: Mapped[str] = mapped_column(String(40), unique=True)
    driver_name: Mapped[str] = mapped_column(String(120))
    status: Mapped[str] = mapped_column(String(30), default="IN_TRANSIT")
    speed_kmph: Mapped[float] = mapped_column(Float, default=0)
    coordinates: Mapped[list] = mapped_column(JSON)
    shipment_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    gps_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

class Shipment(Base):
    __tablename__ = "shipments"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    shipment_code: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    cargo_type: Mapped[str] = mapped_column(String(40))
    priority: Mapped[str] = mapped_column(String(30))
    origin: Mapped[str] = mapped_column(String(120))
    destination: Mapped[str] = mapped_column(String(120))
    status: Mapped[str] = mapped_column(String(30), default="IN_TRANSIT")
    eta_minutes: Mapped[int] = mapped_column(Integer)
    vehicle_code: Mapped[str | None] = mapped_column(String(40), nullable=True)
    deadline_minutes: Mapped[int] = mapped_column(Integer, default=240)

class Alert(Base):
    __tablename__ = "alerts"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(200))
    message: Mapped[str] = mapped_column(Text)
    severity: Mapped[str] = mapped_column(String(30), default="WARNING")
    status: Mapped[str] = mapped_column(String(30), default="OPEN")
    entity_type: Mapped[str] = mapped_column(String(50))
    entity_id: Mapped[str] = mapped_column(String(80))
    assigned_to: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

class WeatherObservation(Base):
    __tablename__ = "weather_observations"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    district_name: Mapped[str] = mapped_column(String(120))
    rainfall_24h_mm: Mapped[float] = mapped_column(Float)
    forecast_rainfall_mm: Mapped[float] = mapped_column(Float)
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)


class LogisticsFacility(Base):
    __tablename__ = "logistics_facilities"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(150))
    node_name: Mapped[str] = mapped_column(String(80))
    facility_type: Mapped[str] = mapped_column(String(40), default="RELIEF_HUB")
    coordinates: Mapped[list] = mapped_column(JSON, default=list)
    capacity_units: Mapped[int] = mapped_column(Integer, default=1000)
    is_operational: Mapped[bool] = mapped_column(Boolean, default=True)


class ResourceStock(Base):
    __tablename__ = "resource_stocks"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    facility_id: Mapped[str] = mapped_column(ForeignKey("logistics_facilities.id"), index=True)
    resource_type: Mapped[str] = mapped_column(String(50), index=True)
    quantity: Mapped[int] = mapped_column(Integer, default=0)
    reorder_level: Mapped[int] = mapped_column(Integer, default=0)
    unit: Mapped[str] = mapped_column(String(30), default="units")


class DecisionEvent(Base):
    __tablename__ = "decision_events"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    actor_email: Mapped[str] = mapped_column(String(255), index=True)
    event_type: Mapped[str] = mapped_column(String(40), index=True)
    entity_type: Mapped[str] = mapped_column(String(50))
    entity_ref: Mapped[str] = mapped_column(String(100), index=True)
    summary: Mapped[str] = mapped_column(String(240))
    rationale: Mapped[str] = mapped_column(Text)
    event_data: Mapped[dict] = mapped_column(JSON, default=dict)
    previous_hash: Mapped[str] = mapped_column(String(64))
    event_hash: Mapped[str] = mapped_column(String(64), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, index=True)
