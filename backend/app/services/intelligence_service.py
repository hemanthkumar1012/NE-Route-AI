from sqlalchemy import select
from app.models.entities import Alert, Incident, RoadSegment, Shipment, Vehicle, District


def analytics_snapshot(db):
    segments = list(db.scalars(select(RoadSegment)))
    incidents = list(db.scalars(select(Incident)))
    shipments = list(db.scalars(select(Shipment)))
    vehicles = list(db.scalars(select(Vehicle)))
    alerts = list(db.scalars(select(Alert).where(Alert.status != "RESOLVED")))
    districts = list(db.scalars(select(District)))
    blocked = sum(s.operational_status == "CLOSED" for s in segments)
    high = sum(s.risk_score >= 65 and s.operational_status != "CLOSED" for s in segments)
    risk_scores = [s.risk_score for s in segments if s.operational_status != "CLOSED"]
    avg_risk = round(sum(risk_scores) / len(risk_scores), 1) if risk_scores else 0
    resilience = max(0, min(100, round(100 - avg_risk * .55 - blocked * 12 - high * 2)))
    bands = {"SAFE": 0, "CAUTION": 0, "HIGH_RISK": 0, "BLOCKED": 0}
    for s in segments:
        key = "BLOCKED" if s.operational_status == "CLOSED" else "HIGH_RISK" if s.risk_score >= 65 else "CAUTION" if s.risk_score >= 35 else "SAFE"
        bands[key] += 1
    corridor_watchlist = []
    for s in sorted(segments, key=lambda x: (x.operational_status != "CLOSED", -x.risk_score))[:8]:
        reasons = []
        if s.operational_status == "CLOSED": reasons.append("operational closure");
        if s.rainfall_24h_mm >= 80: reasons.append("heavy 24h rainfall")
        if s.slope_percent >= 15: reasons.append("steep terrain")
        if s.bridge_vulnerability >= .45: reasons.append("bridge vulnerability")
        if s.historical_incidents_30d >= 3: reasons.append("recent incident history")
        corridor_watchlist.append({"id": str(s.id), "name": s.name, "status": s.operational_status, "risk_score": 100 if s.operational_status == "CLOSED" else s.risk_score,
            "district_context": s.terrain, "explanation": ", ".join(reasons) or "No elevated feature threshold", "distance_km": s.distance_km})
    cargo_exposure = []
    for s in shipments:
        related = [seg for seg in segments if seg.operational_status == "CLOSED" or seg.risk_score >= 65]
        peak = max((100 if seg.operational_status == "CLOSED" else seg.risk_score for seg in related), default=0)
        late = s.eta_minutes > s.deadline_minutes or s.status == "DELAYED"
        if late or (s.priority in ("CRITICAL", "HIGH") and peak >= 65):
            cargo_exposure.append({"shipment_code": s.shipment_code, "cargo_type": s.cargo_type, "priority": s.priority,
                "origin": s.origin, "destination": s.destination, "status": s.status, "eta_minutes": s.eta_minutes,
                "deadline_minutes": s.deadline_minutes, "risk_score": peak, "delay_risk": late})
    response_queue = []
    for a in alerts:
        response_queue.append({"id": str(a.id), "title": a.title, "status": a.status, "severity": a.severity,
            "risk_score": 100 if a.severity == "CRITICAL" else 70 if a.severity == "WARNING" else 30,
            "recommended_action": "Verify field conditions and protect critical cargo; dispatch authority must approve actions."})
    response_queue.sort(key=lambda x: (-x["risk_score"], x["title"]))
    gps_stale = [v.vehicle_code for v in vehicles if v.status == "IN_TRANSIT" and not v.gps_at]
    return {"data_mode": "SIMULATED", "network": {"resilience_index": resilience, "total_segments": len(segments), "blocked_segments": blocked,
            "high_risk_segments": high, "average_risk": avg_risk, "risk_distribution": bands},
        "corridor_watchlist": corridor_watchlist, "cargo_exposure": cargo_exposure,
        "fleet": {"vehicles": len(vehicles), "in_transit": sum(v.status == "IN_TRANSIT" for v in vehicles), "delayed": sum(v.status == "DELAYED" for v in vehicles),
            "gps_stale": gps_stale, "gps_stale_count": len(gps_stale)},
        "response_queue": response_queue, "districts": [{"name": d.name, "state": d.state_name, "accessibility_score": d.accessibility_score} for d in districts],
        "summary": {"active_incidents": sum(i.status in ("PENDING", "VERIFIED") for i in incidents),
            "open_alerts": len(alerts), "delayed_shipments": sum(s.status == "DELAYED" or s.eta_minutes > s.deadline_minutes for s in shipments)}}


def simulate_scenario(db, request):
    segments = list(db.scalars(select(RoadSegment)))
    projections = []
    for segment in segments:
        rainfall = min(400, segment.rainfall_24h_mm * request.rainfall_multiplier)
        bridge = min(1.0, segment.bridge_vulnerability + request.bridge_vulnerability_delta)
        risk = min(100, round(segment.risk_score + max(0, rainfall - segment.rainfall_24h_mm) * .12 + request.bridge_vulnerability_delta * 18 + request.horizon_hours * .12))
        projections.append({"segment_id": str(segment.id), "name": segment.name, "current_risk": segment.risk_score,
            "projected_risk": risk, "rainfall_projected_mm": round(rainfall, 1), "bridge_vulnerability_projected": round(bridge, 2),
            "change": risk - segment.risk_score, "data_mode": "SIMULATED_SCENARIO"})
    projections.sort(key=lambda x: -x["projected_risk"])
    return {"horizon_hours": request.horizon_hours, "persisted": False, "data_mode": "SIMULATED_SCENARIO", "projections": projections}
