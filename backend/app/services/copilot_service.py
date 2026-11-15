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


def _route_intent(question: str, db):
    """Detect 'how do I get X to Y' style questions, resolve the named network
    nodes and run the multimodal route planner as a copilot tool."""
    from app.seed import NODES
    from app.routing.optimizer import options_for
    q = question.lower()
    mentioned = sorted((n for n in NODES if n.lower() in q), key=lambda n: q.index(n.lower()))
    if len(mentioned) < 2:
        return None
    if not any(w in q for w in ("route", "get", "deliver", "send", "ship", "move", "transport", "from", "reach", "fastest", "cheapest", "way")):
        return None
    origin, destination = mentioned[0], mentioned[1]
    priority = "CRITICAL" if any(w in q for w in ("critical", "medical", "medicine", "urgent", "emergency")) else "NORMAL"
    segments = list(db.scalars(select(RoadSegment)))
    options = [o for o in options_for(segments, origin, destination, priority) if o["available"]]
    if not options:
        return {"origin": origin, "destination": destination, "options": []}
    return {"origin": origin, "destination": destination, "priority": priority,
            "options": [{"objective": o["objective"], "eta_minutes": o["eta_minutes"], "distance_km": o["distance_km"],
                         "cost_usd": o["cost_usd"], "co2_kg": o["co2_kg"], "mean_risk": o["mean_risk_score"],
                         "legs": [f"{s['name']} [{s['mode']}]" for s in o["segments"]]} for o in options]}


def answer_question(question: str, db):
    facts = _snapshot(db)
    q = question.lower()
    route_plan = _route_intent(question, db)
    if route_plan is not None:
        facts["route_plan"] = route_plan
    if settings.gemini_api_key:
        try:
            import httpx
            response = httpx.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/{settings.gemini_model}:generateContent",
                headers={"x-goog-api-key": settings.gemini_api_key, "Content-Type": "application/json"},
                json={
                    "system_instruction": {"parts": [{"text": "You are NE-Route AI logistics copilot. Answer only from the supplied JSON platform snapshot. It is synthetic demo data, never claim it is live or official. State when a requested fact is unavailable. Do not issue dispatch commands; recommend human review."}]},
                    "contents": [{"role": "user", "parts": [{"text": f"Question: {question}\nPlatform snapshot: {json.dumps(facts)}"}]}],
                    "generationConfig": {"temperature": 0.1},
                },
                timeout=30,
            )
            response.raise_for_status()
            answer = response.json()["candidates"][0]["content"]["parts"][0]["text"]
            return {"answer": answer, "data_mode": "SIMULATED", "sources": ["platform database snapshot"]}
        except Exception:
            pass
    if route_plan is not None:
        if not route_plan["options"]:
            answer = f"No viable multimodal route between {route_plan['origin']} and {route_plan['destination']} in the current simulated network snapshot."
        else:
            best = route_plan["options"][0]
            lines = [f"{o['objective']}: {o['eta_minutes']} min · {o['distance_km']} km · ${o['cost_usd']} · {o['co2_kg']} kg CO2 · risk {o['mean_risk']}/100" for o in route_plan["options"]]
            answer = (f"Simulated multimodal plan {route_plan['origin']} → {route_plan['destination']} ({route_plan.get('priority','NORMAL')} cargo). "
                      f"Recommended ({best['objective']}): {' → '.join(best['legs'])}. Options — " + "; ".join(lines) +
                      ". All figures are synthetic demo values; require human dispatch approval.")
        return {"answer": answer, "data_mode": "SIMULATED", "sources": ["platform database snapshot", "route planner"]}
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
