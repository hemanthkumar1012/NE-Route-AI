from datetime import datetime, timedelta, timezone
import asyncio
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.security import hash_password
from app.models.entities import Alert, District, Incident, RoadSegment, Shipment, User, Vehicle, WeatherObservation

DISTRICTS = [
    ("Kamrup Metropolitan", "Assam", 88, [91.7362, 26.1445]), ("Dima Hasao", "Assam", 61, [93.0176, 25.3478]),
    ("Dimapur", "Nagaland", 79, [93.7266, 25.9044]), ("Kohima", "Nagaland", 72, [94.1086, 25.6751]),
    ("Imphal West", "Manipur", 84, [93.9368, 24.8170]), ("Cachar", "Assam", 68, [92.7789, 24.8333]),
    ("Aizawl", "Mizoram", 75, [92.7176, 23.7271]), ("East Khasi Hills", "Meghalaya", 81, [91.8933, 25.5788]),
    ("West Sikkim", "Sikkim", 70, [88.2494, 27.3000]), ("Papum Pare", "Arunachal Pradesh", 66, [93.6920, 27.1000]),
    ("Agartala", "Tripura", 86, [91.2868, 23.8315]),
]

# Illustrative node graph, not a navigable authoritative road network.
NODES = {
    "Guwahati": [91.7362, 26.1445], "Nagaon": [92.6860, 26.3500], "Dimapur": [93.7266, 25.9044],
    "Kohima": [94.1086, 25.6751], "Imphal": [93.9368, 24.8170], "Silchar": [92.7789, 24.8333],
    "Aizawl": [92.7176, 23.7271], "Shillong": [91.8933, 25.5788], "Gangtok": [88.6129, 27.3389],
    "Itanagar": [93.6920, 27.1000], "Agartala": [91.2868, 23.8315], "Dibrugarh": [94.9120, 27.4728],
}

EDGES = [
    ("Guwahati", "Nagaon", "Guwahati–Nagaon NH Corridor", 122, 145, 18, 5),
    ("Nagaon", "Dimapur", "Nagaon–Dimapur Corridor", 170, 210, 54, 12),
    ("Dimapur", "Kohima", "Dimapur–Kohima Highway", 70, 105, 42, 16),
    ("Kohima", "Imphal", "Kohima–Imphal Mountain Corridor", 138, 220, 78, 25),
    ("Guwahati", "Shillong", "Guwahati–Shillong Highway", 99, 130, 22, 10),
    ("Shillong", "Silchar", "Shillong–Silchar Corridor", 220, 300, 70, 24),
    ("Silchar", "Aizawl", "Silchar–Aizawl Corridor", 180, 240, 63, 28),
    ("Guwahati", "Silchar", "Guwahati–Silchar Corridor", 330, 420, 35, 14),
    ("Guwahati", "Dibrugarh", "Guwahati–Dibrugarh Highway", 440, 520, 20, 7),
    ("Guwahati", "Itanagar", "Guwahati–Itanagar Corridor", 335, 390, 48, 22),
    ("Guwahati", "Agartala", "Guwahati–Agartala Corridor", 550, 660, 28, 9),
    ("Guwahati", "Dimapur", "Guwahati–Dimapur Corridor", 270, 335, 78, 22),
]


def seed_database(db: Session):
    if db.scalar(select(User.id).limit(1)):
        return
    for email, name, role, password in [
        ("admin@neroute.ai", "System Administrator", "ADMIN", "Admin@123"),
        ("official@neroute.ai", "Government Official", "GOVERNMENT_OFFICIAL", "Official@123"),
        ("logistics@neroute.ai", "Logistics Manager", "LOGISTICS_MANAGER", "Logistics@123"),
        ("field@neroute.ai", "Field Officer", "FIELD_OFFICER", "Field@123"),
    ]:
        db.add(User(email=email, full_name=name, role=role, password_hash=hash_password(password)))
    for name, state, score, coords in DISTRICTS:
        db.add(District(name=name, state_name=state, accessibility_score=score, coordinates=coords))
    for a, b, name, distance, eta, risk, slope in EDGES:
        db.add(RoadSegment(external_id=f"SEG-{len(name)}-{a[:2].upper()}-{b[:2].upper()}", name=name,
            from_node=a, to_node=b, distance_km=distance, base_eta_minutes=eta, risk_score=risk,
            risk_level="HIGH_RISK" if risk >= 65 else "CAUTION" if risk >= 35 else "SAFE",
            terrain="MOUNTAINOUS" if slope > 18 else "HILLY", slope_percent=slope,
            elevation_m=500 + slope * 35, rainfall_24h_mm=25 + risk, forecast_rainfall_mm=15 + risk * .7,
            historical_incidents_30d=max(0, risk // 15), traffic_index=min(.9, risk / 100),
            road_condition_score=max(.2, 1 - risk / 125), bridge_vulnerability=min(.95, slope / 35),
            coordinates=[NODES[a], NODES[b]]))
    now = datetime.now(timezone.utc)
    db.add_all([
        WeatherObservation(district_name="Dima Hasao", rainfall_24h_mm=142, forecast_rainfall_mm=86, observed_at=now),
        WeatherObservation(district_name="Kohima", rainfall_24h_mm=78, forecast_rainfall_mm=52, observed_at=now),
        WeatherObservation(district_name="Cachar", rainfall_24h_mm=96, forecast_rainfall_mm=63, observed_at=now),
        Incident(report_code="NER-DEMO-001", incident_type="LANDSLIDE", severity="HIGH", status="VERIFIED",
            description="Illustrative slope failure report near a mountainous road section.", district_name="Dima Hasao",
            coordinates=[93.10, 25.37], reported_by="field@neroute.ai", verified_by="official@neroute.ai", reported_at=now - timedelta(hours=1)),
        Incident(report_code="NER-DEMO-002", incident_type="FLOOD", severity="MEDIUM", status="PENDING",
            description="Illustrative waterlogging reported near a low-lying crossing.", district_name="Cachar",
            coordinates=[92.78, 24.85], reported_by="field@neroute.ai", reported_at=now - timedelta(minutes=25)),
        Vehicle(vehicle_code="NER-VAN-014", driver_name="Demo Driver 01", status="IN_TRANSIT", speed_kmph=38,
            coordinates=NODES["Nagaon"], shipment_code="MED-204", gps_at=now),
        Vehicle(vehicle_code="NER-TRK-022", driver_name="Demo Driver 02", status="IN_TRANSIT", speed_kmph=26,
            coordinates=NODES["Dimapur"], shipment_code="REL-118", gps_at=now),
        Vehicle(vehicle_code="NER-VAN-031", driver_name="Demo Driver 03", status="DELAYED", speed_kmph=0,
            coordinates=NODES["Silchar"], shipment_code="FOOD-077", gps_at=now - timedelta(minutes=18)),
        Shipment(shipment_code="MED-204", cargo_type="MEDICINE", priority="CRITICAL", origin="Guwahati", destination="Imphal",
            status="IN_TRANSIT", eta_minutes=420, vehicle_code="NER-VAN-014", deadline_minutes=360),
        Shipment(shipment_code="REL-118", cargo_type="RELIEF", priority="HIGH", origin="Dimapur", destination="Kohima",
            status="IN_TRANSIT", eta_minutes=105, vehicle_code="NER-TRK-022", deadline_minutes=180),
        Shipment(shipment_code="FOOD-077", cargo_type="FOOD", priority="NORMAL", origin="Silchar", destination="Aizawl",
            status="DELAYED", eta_minutes=330, vehicle_code="NER-VAN-031", deadline_minutes=240),
        Alert(title="Heavy rainfall watch: Dima Hasao", message="Synthetic rainfall features indicate elevated corridor exposure. Verify field conditions.",
            severity="WARNING", status="OPEN", entity_type="DISTRICT", entity_id="Dima Hasao"),
    ])
    db.commit()


async def vehicle_position_stream():
    import random
    while True:
        await asyncio.sleep(2)
        yield {"type": "GPS_UPDATE", "data_mode": "SIMULATED", "vehicle_code": "NER-VAN-014",
            "speed_kmph": round(random.uniform(22, 46), 1), "timestamp": datetime.now(timezone.utc).isoformat()}
