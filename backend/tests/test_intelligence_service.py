from types import SimpleNamespace
from datetime import datetime, timezone
from app.services.intelligence_service import analytics_snapshot, simulate_scenario
from app.schemas.api import ScenarioRequest

class FakeDB:
    def __init__(self, values): self.values = values
    def scalars(self, query):
        class Result:
            def __init__(self, values): self.values = values
            def __iter__(self): return iter(self.values)
        return Result(self.values.get(query.column_descriptions[0]["entity"], []))


def test_scenario_returns_projection_without_mutating_segment():
    segment = SimpleNamespace(id="1", name="Hill road", risk_score=60, rainfall_24h_mm=100, bridge_vulnerability=.4)
    db = FakeDB({__import__("app.models.entities", fromlist=["RoadSegment"]).RoadSegment: [segment]})
    result = simulate_scenario(db, ScenarioRequest(rainfall_multiplier=2, bridge_vulnerability_delta=.2, horizon_hours=12))
    assert result["persisted"] is False
    assert result["projections"][0]["projected_risk"] > 60
    assert segment.risk_score == 60


def test_analytics_snapshot_has_risk_distribution_and_resilience():
    from app.models.entities import RoadSegment, Incident, Shipment, Vehicle, Alert, District
    s = SimpleNamespace(operational_status="OPEN", risk_score=70, rainfall_24h_mm=100, slope_percent=20, bridge_vulnerability=.5,
        historical_incidents_30d=4, name="Hill", id="s", terrain="HILLY", distance_km=20)
    db = FakeDB({RoadSegment:[s], Incident:[], Shipment:[], Vehicle:[], Alert:[], District:[]})
    data = analytics_snapshot(db)
    assert data["network"]["risk_distribution"]["HIGH_RISK"] == 1
    assert 0 <= data["network"]["resilience_index"] <= 100
