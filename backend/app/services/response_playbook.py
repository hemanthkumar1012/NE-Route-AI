from app.schemas.api import PlaybookRequest

BASE = {
    "FLOOD": [
        ("Confirm water depth and current direction", "FIELD_OFFICER", "HIGH", "Timestamped geotagged photographs"),
        ("Inspect bridge approaches and culverts from a safe location", "FIELD_OFFICER", "HIGH", "Inspection notes; do not enter floodwater"),
        ("Identify exposed medicine and relief shipments", "LOGISTICS_MANAGER", "CRITICAL", "Affected shipment list"),
        ("Coordinate alternate corridor assessment", "GOVERNMENT_OFFICIAL", "HIGH", "Approved route assessment"),
        ("Issue public travel advisory through authorized channel", "GOVERNMENT_OFFICIAL", "MEDIUM", "Approved advisory reference"),
    ],
    "LANDSLIDE": [
        ("Establish a safe perimeter; do not approach unstable slopes", "FIELD_OFFICER", "CRITICAL", "Geotagged safe-distance evidence"),
        ("Confirm blockage extent and secondary-slide signs", "FIELD_OFFICER", "HIGH", "Incident photos and location"),
        ("Mark affected road segments unavailable pending inspection", "GOVERNMENT_OFFICIAL", "CRITICAL", "Road-control confirmation"),
        ("Identify critical shipments requiring route review", "LOGISTICS_MANAGER", "CRITICAL", "Shipment impact assessment"),
        ("Coordinate with the authorized road / disaster response agency", "GOVERNMENT_OFFICIAL", "HIGH", "Contact and coordination log"),
    ],
    "DAMAGED_BRIDGE": [
        ("Do not send vehicles onto the structure; secure approaches", "FIELD_OFFICER", "CRITICAL", "Safe-distance photos"),
        ("Request inspection by qualified bridge authority", "GOVERNMENT_OFFICIAL", "CRITICAL", "Inspection request reference"),
        ("Exclude crossing from candidate routes pending clearance", "GOVERNMENT_OFFICIAL", "CRITICAL", "Road status record"),
        ("Assess critical cargo and vehicle exposure", "LOGISTICS_MANAGER", "HIGH", "Affected delivery list"),
    ],
    "ROAD_CLOSURE": [
        ("Confirm closure boundaries and expected review time", "FIELD_OFFICER", "HIGH", "Geotagged report"),
        ("Update network status after authorized confirmation", "GOVERNMENT_OFFICIAL", "HIGH", "Verification record"),
        ("Recalculate impacted shipment routes", "LOGISTICS_MANAGER", "HIGH", "Alternative route comparison"),
    ],
    "DAMAGED_ROAD": [
        ("Record damage extent without entering unsafe area", "FIELD_OFFICER", "HIGH", "Photos and approximate dimensions"),
        ("Request engineering assessment", "GOVERNMENT_OFFICIAL", "MEDIUM", "Assessment reference"),
        ("Apply vehicle restrictions pending clearance", "GOVERNMENT_OFFICIAL", "HIGH", "Approved restriction"),
        ("Review heavy and essential cargo exposure", "LOGISTICS_MANAGER", "MEDIUM", "Shipment impact report"),
    ],
}


def build_playbook(request: PlaybookRequest):
    multiplier = {"LOW": 1, "MEDIUM": 1, "HIGH": 2, "CRITICAL": 3}[request.severity]
    checklist = []
    for index, (action, owner, urgency, evidence) in enumerate(BASE[request.hazard], start=1):
        checklist.append({"step": index, "action": action, "owner_role": owner,
            "urgency": "CRITICAL" if multiplier == 3 or urgency == "CRITICAL" else urgency,
            "target_minutes": max(15, 60 // multiplier), "evidence_required": evidence, "completed": False})
    return {"hazard": request.hazard, "severity": request.severity, "district": request.district,
        "incident_reference": request.incident_reference, "checklist": checklist,
        "escalation": "Immediate coordination with competent disaster / road authority" if request.severity == "CRITICAL" else "Escalate if the target response window is exceeded",
        "safety_notice": "This is a configurable planning aid, not an official SOP. Follow agency protocols, trained personnel instructions and incident-command authority.",
        "data_mode": "TEMPLATE"}
