from sqlalchemy import select
from app.models.entities import Alert, Incident, RoadSegment, Shipment
from app.core.config import settings
import json


def _snapshot(db):
    segments = list(db.scalars(select(RoadSegment)))
    incidents = list(db.scalars(select(Incident)))
    shipments = list(db.scalars(select(Shipment)))
    alerts = list(db.scalars(select(Alert).where(Alert.status != "RESOLVED")))
    return {
        "blocked": [s.name for s in segments if s.operational_status == "CLOSED"],
        "risky": [{"name": s.name, "risk": s.risk_score} for s in segments if s.risk_score >= 65],
        "incidents": [{"type": i.incident_type, "district": i.district_name, "severity": i.severity, "status": i.status} for i in incidents if i.status in ("PENDING", "VERIFIED")],
        "delayed_medicines": [{"shipment": s.shipment_code, "destination": s.destination, "eta_minutes": s.eta_minutes} for s in shipments if s.cargo_type == "MEDICINE" and (s.status == "DELAYED" or s.eta_minutes > s.deadline_minutes)],
        "shipments": [{"code": s.shipment_code, "type": s.cargo_type, "status": s.status, "destination": s.destination} for s in shipments],
        "alerts": [{"title": a.title, "severity": a.severity, "status": a.status} for a in alerts],
        "data_mode": "SIMULATED",
    }


def answer_question(question: str, db):
    facts = _snapshot(db)
    q = question.lower()
    if settings.openai_api_key:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=settings.openai_api_key)
            response = client.chat.completions.create(
                model=settings.openai_model,
                temperature=0.1,
                messages=[
                    {"role": "system", "content": "You are NE-Route AI logistics copilot. Answer only from the supplied JSON platform snapshot. It is synthetic demo data, never claim it is live or official. State when a requested fact is unavailable. Do not issue dispatch commands; recommend human review."},
                    {"role": "user", "content": f"Question: {question}\nPlatform snapshot: {json.dumps(facts)}"},
                ],
            )
            return {"answer": response.choices[0].message.content, "data_mode": "SIMULATED", "sources": ["platform database snapshot"]}
        except Exception:
            pass
    if any(w in q for w in ("blocked", "closed", "inaccessible")):
        value = ", ".join(facts["blocked"]) or "No blocked roads are recorded in the current demo snapshot."
        answer = f"Blocked corridors in the simulated dataset: {value}. Verify conditions with an authorized field officer before acting."
    elif "medicine" in q or "medical" in q:
        value = facts["delayed_medicines"]
        answer = f"Medicine shipments at risk in the simulated dataset: {json.dumps(value) if value else 'none identified against current deadlines'}."
    elif "risk" in q or "corridor" in q:
        top = sorted(facts["risky"], key=lambda x: x["risk"], reverse=True)[:5]
        answer = f"Highest-risk corridors in the simulated dataset: {json.dumps(top)}. Risk scores are prototype outputs, not official road assessments."
    elif "district" in q or "incident" in q:
        answer = f"Active simulated field reports: {json.dumps(facts['incidents'])}. These require officer verification where marked PENDING."
    elif "alert" in q:
        answer = f"Open simulated alerts: {json.dumps(facts['alerts'])}."
    else:
        answer = "I can summarize blocked roads, corridor risk, district incidents, medicine delays and open alerts from the current platform snapshot. The snapshot is simulated demo data."
    return {"answer": answer, "data_mode": "SIMULATED", "sources": ["platform database snapshot"]}
