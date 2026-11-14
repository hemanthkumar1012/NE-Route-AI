from __future__ import annotations
from itertools import permutations
from app.models.entities import RoadSegment
from app.routing.optimizer import options_for


def _leg(segments, origin, destination, priority):
    options = options_for(segments, origin, destination, priority)
    available = [x for x in options if x["available"]]
    return min(available, key=lambda x: x["eta_minutes"] + (x["mean_risk_score"] or 0) * (1.2 if priority == "CRITICAL" else .5)) if available else None


def _nearest_neighbour(segments, origin, stops, priority):
    remaining = list(stops)
    order, legs, current = [], [], origin
    while remaining:
        choices = []
        for stop in remaining:
            leg = _leg(segments, current, stop.node, stop.priority if stop.priority else priority)
            if leg:
                urgency = {"CRITICAL": -10000, "HIGH": -3000, "NORMAL": 0, "LOW": 500}[stop.priority]
                score = leg["eta_minutes"] + (leg["mean_risk_score"] or 0) * 1.2 + urgency
                choices.append((score, stop.name, stop, leg))
        if not choices:
            break
        _, _, stop, leg = min(choices, key=lambda item: (item[0], item[1]))
        order.append(stop)
        legs.append(leg)
        remaining.remove(stop)
        current = stop.node
    return order, legs, remaining


def optimize_mission(db, request):
    segments = list(db.query(RoadSegment).all())
    ordered, legs, unreachable = _nearest_neighbour(segments, request.origin, request.stops, request.cargo_priority)
    # Keep the optimizer deterministic and bounded. This improvement pass uses adjacent 2-opt reversals
    # only when every changed leg remains connected and the aggregate ETA-risk score improves.
    improved = True
    while improved and len(ordered) >= 3:
        improved = False
        for left in range(len(ordered) - 2):
            for right in range(left + 2, len(ordered)):
                candidate = ordered[:left] + list(reversed(ordered[left:right + 1])) + ordered[right + 1:]
                current_node = request.origin
                candidate_legs = []
                for stop in candidate:
                    leg = _leg(segments, current_node, stop.node, stop.priority)
                    if not leg:
                        break
                    candidate_legs.append(leg)
                    current_node = stop.node
                if len(candidate_legs) != len(candidate):
                    continue
                score = lambda ls: sum(x["eta_minutes"] + (x["mean_risk_score"] or 0) * 1.2 for x in ls)
                if score(candidate_legs) < score(legs):
                    ordered, legs, improved = candidate, candidate_legs, True
                    break
            if improved:
                break
    distance = round(sum(l["distance_km"] for l in legs), 1)
    eta = sum(l["eta_minutes"] for l in legs)
    risk = round(sum(l["mean_risk_score"] or 0 for l in legs) / len(legs), 1) if legs else 0
    return {"origin": request.origin, "stop_order": [{"name": s.name, "node": s.node, "priority": s.priority} for s in ordered],
        "legs": legs, "unreachable_stops": [s.name for s in unreachable], "distance_km": distance,
        "eta_minutes": eta, "mean_route_risk": risk, "optimization": "NEAREST_NEIGHBOUR_WITH_BOUNDED_2OPT",
        "data_mode": "SIMULATED", "human_approval_required": True}
