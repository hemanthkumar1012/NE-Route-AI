from app.schemas.api import PlaybookRequest
from app.services.response_playbook import build_playbook


def test_critical_landslide_playbook_escalates_and_has_safety_notice():
    result = build_playbook(PlaybookRequest(hazard="LANDSLIDE", severity="CRITICAL", district="Dima Hasao", incident_reference="NER-1"))
    assert len(result["checklist"]) >= 4
    assert result["escalation"].startswith("Immediate")
    assert "not an official SOP" in result["safety_notice"]
    assert all(step["urgency"] == "CRITICAL" for step in result["checklist"])


def test_bridge_playbook_never_recommends_crossing():
    result = build_playbook(PlaybookRequest(hazard="DAMAGED_BRIDGE", severity="HIGH", district="Cachar"))
    assert any("Do not send vehicles" in step["action"] for step in result["checklist"])
