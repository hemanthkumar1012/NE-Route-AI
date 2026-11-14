import pytest
from pydantic import ValidationError
from app.schemas.api import IncidentCreate, RoutePlanRequest, ScenarioRequest, MissionOptimizeRequest, MissionStop, PlaybookRequest


def test_incident_coordinates_are_bounded():
    with pytest.raises(ValidationError):
        IncidentCreate(incident_type="FLOOD", severity="HIGH", description="Flooded road", district_name="Cachar", latitude=120, longitude=92)


def test_route_priority_defaults_to_normal():
    request = RoutePlanRequest(origin="Guwahati", destination="Imphal")
    assert request.cargo_priority == "NORMAL"


def test_scenario_bounds_are_enforced():
    with pytest.raises(ValidationError):
        ScenarioRequest(rainfall_multiplier=5)


def test_mission_caps_stop_count():
    with pytest.raises(ValidationError):
        MissionOptimizeRequest(origin="Guwahati", stops=[MissionStop(name=str(i), node="Nagaon") for i in range(9)])


def test_playbook_accepts_supported_hazard():
    request = PlaybookRequest(hazard="LANDSLIDE", severity="CRITICAL", district="Dima Hasao")
    assert request.hazard == "LANDSLIDE"
