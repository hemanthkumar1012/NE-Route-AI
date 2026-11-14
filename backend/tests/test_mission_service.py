from types import SimpleNamespace
from app.services.mission_service import optimize_mission
from app.schemas.api import MissionOptimizeRequest, MissionStop

class FakeDB:
    def __init__(self, segments): self.segments = segments
    def query(self, model): return self
    def all(self): return self.segments


def test_mission_sequences_reachable_stops_and_reports_unreachable():
    segments = [
        SimpleNamespace(from_node="A", to_node="B", operational_status="OPEN", risk_score=10, base_eta_minutes=10, distance_km=5, external_id="1", name="AB"),
        SimpleNamespace(from_node="B", to_node="C", operational_status="OPEN", risk_score=20, base_eta_minutes=20, distance_km=10, external_id="2", name="BC"),
    ]
    request = MissionOptimizeRequest(origin="A", stops=[MissionStop(name="Clinic", node="C", priority="CRITICAL"), MissionStop(name="Remote", node="Z")], cargo_priority="CRITICAL")
    result = optimize_mission(FakeDB(segments), request)
    assert [s["name"] for s in result["stop_order"]] == ["Clinic"]
    assert result["unreachable_stops"] == ["Remote"]
    assert result["distance_km"] == 15
    assert result["human_approval_required"] is True


def test_mission_empty_or_unreachable_routes_do_not_crash():
    request = MissionOptimizeRequest(origin="A", stops=[MissionStop(name="Lost", node="Z")])
    result = optimize_mission(FakeDB([]), request)
    assert result["stop_order"] == []
    assert result["unreachable_stops"] == ["Lost"]
