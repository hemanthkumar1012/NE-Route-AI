from typing import Literal
from pydantic import BaseModel, Field

class DigitalTwinRequest(BaseModel):
    scenario_name: str = Field(default="Monsoon compound disruption", min_length=3, max_length=100)
    hazard_focus: Literal["FLOOD", "LANDSLIDE", "BRIDGE", "COMPOUND"] = "COMPOUND"
    rainfall_multiplier: float = Field(default=1.8, ge=0.5, le=4.0)
    flood_severity: float = Field(default=.45, ge=0, le=1)
    landslide_activity: float = Field(default=.55, ge=0, le=1)
    bridge_stress: float = Field(default=.35, ge=0, le=1)
    demand_surge: float = Field(default=1.2, ge=.5, le=3.0)

class ResourceStagingRequest(BaseModel):
    resource_type: Literal["MEDICAL_KITS", "FOOD_PACKS", "RELIEF_KITS", "ROAD_REPAIR_KITS", "FUEL_LITERS"] = "MEDICAL_KITS"

class DecisionProposalRequest(BaseModel):
    decision_type: Literal["ROUTE_CHANGE", "RESOURCE_PREPOSITION", "INCIDENT_ESCALATION", "PUBLIC_ADVISORY", "ROAD_STATUS_CHANGE"]
    entity_type: str = Field(min_length=2, max_length=50)
    entity_ref: str = Field(min_length=1, max_length=100)
    summary: str = Field(min_length=5, max_length=240)
    rationale: str = Field(min_length=10, max_length=2000)
    evidence_snapshot: dict = Field(default_factory=dict)

class DecisionReviewRequest(BaseModel):
    decision: Literal["APPROVED", "REJECTED"]
    notes: str = Field(min_length=5, max_length=1000)
