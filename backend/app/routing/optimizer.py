from __future__ import annotations
import heapq
from collections import defaultdict

# Illustrative per-km economics by transport mode (synthetic demo values):
# freight cost in USD/km and CO2 emissions in kg/km for a single relief truck,
# cargo aircraft allocation or containerized sea freight slot.
MODE_FACTORS = {
    "ROAD": {"cost_per_km": 0.90, "co2_per_km": 0.78},
    "AIR": {"cost_per_km": 4.60, "co2_per_km": 2.30},
    "SEA": {"cost_per_km": 0.14, "co2_per_km": 0.11},
}


def _mode(segment) -> str:
    return {"AIR_CORRIDOR": "AIR", "SEA_LANE": "SEA"}.get(getattr(segment, "terrain", ""), "ROAD")


def _graph(segments):
    graph = defaultdict(list)
    for s in segments:
        if s.operational_status == "CLOSED":
            continue
        graph[s.from_node].append((s.to_node, s))
        graph[s.to_node].append((s.from_node, s))
    return graph


def _shortest(segments, origin, destination, objective, cargo_priority):
    graph = _graph(segments)
    queue = [(0.0, origin, [])]
    best = {origin: 0.0}
    while queue:
        cost, node, path = heapq.heappop(queue)
        if node == destination:
            return path, cost
        if cost > best.get(node, float("inf")):
            continue
        for nxt, seg in graph.get(node, []):
            risk = seg.risk_score / 100
            eta = max(1, seg.base_eta_minutes) * (1 + risk * .45)
            priority_weight = 1.4 if cargo_priority == "CRITICAL" else 1.0
            factors = MODE_FACTORS[_mode(seg)]
            if objective == "FASTEST":
                weight = seg.base_eta_minutes * (1 + risk * .12)
            elif objective == "SAFEST":
                weight = seg.distance_km * (1 + risk * 5) + (1000 if seg.risk_score >= 85 else 0)
            elif objective == "GREENEST":
                weight = seg.distance_km * factors["co2_per_km"] * (1 + risk * .25)
            else:
                weight = eta + risk * 55 * priority_weight
            new_cost = cost + weight
            if new_cost < best.get(nxt, float("inf")):
                best[nxt] = new_cost
                heapq.heappush(queue, (new_cost, nxt, path + [seg]))
    return None, None


def options_for(segments, origin, destination, cargo_priority="NORMAL"):
    output = []
    for objective in ("FASTEST", "SAFEST", "PRIORITY", "GREENEST"):
        path, _ = _shortest(segments, origin, destination, objective, cargo_priority)
        if not path:
            output.append({"objective": objective, "available": False, "segments": [], "distance_km": 0, "eta_minutes": None, "mean_risk_score": None, "max_risk_score": None, "cost_usd": None, "co2_kg": None, "modes": []})
            continue
        output.append({"objective": objective, "available": True, "segments": [{"id": s.external_id, "name": s.name, "risk_score": s.risk_score, "distance_km": s.distance_km, "status": s.operational_status, "mode": _mode(s)} for s in path],
            "distance_km": round(sum(s.distance_km for s in path), 2),
            "eta_minutes": sum(s.base_eta_minutes for s in path),
            "mean_risk_score": round(sum(s.risk_score for s in path) / len(path), 1),
            "max_risk_score": max(s.risk_score for s in path),
            "cost_usd": round(sum(s.distance_km * MODE_FACTORS[_mode(s)]["cost_per_km"] for s in path), 2),
            "co2_kg": round(sum(s.distance_km * MODE_FACTORS[_mode(s)]["co2_per_km"] for s in path), 1),
            "modes": sorted({_mode(s) for s in path})})
    return output
