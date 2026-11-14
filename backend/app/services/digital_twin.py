from __future__ import annotations
import math
from typing import Any
import networkx as nx

DISTRICT_NODES = {
    "Kamrup Metropolitan": "Guwahati", "Dima Hasao": "Nagaon", "Dimapur": "Dimapur",
    "Kohima": "Kohima", "Imphal West": "Imphal", "Cachar": "Silchar",
    "Aizawl": "Aizawl", "East Khasi Hills": "Shillong", "West Sikkim": "Gangtok",
    "Papum Pare": "Itanagar", "Agartala": "Agartala",
}

def _clamp(value: float, low: float = 0, high: float = 100) -> float:
    return max(low, min(high, value))

def _graph(segments: list[Any], projected: dict[str, dict] | None = None) -> nx.Graph:
    graph = nx.Graph()
    for segment in segments:
        projection = (projected or {}).get(str(segment.id))
        status = projection["projected_status"] if projection else segment.operational_status
        risk = projection["projected_risk"] if projection else segment.risk_score
        if status == "CLOSED":
            continue
        graph.add_edge(segment.from_node, segment.to_node,
            eta=float(segment.base_eta_minutes) * (1 + float(risk) / 100 * .35),
            distance=float(segment.distance_km), risk=float(risk), name=segment.name)
    return graph

def _network_resilience(graph: nx.Graph, all_nodes: set[str]) -> float:
    nodes = sorted(all_nodes)
    if len(nodes) < 2:
        return 100.0 if nodes else 0.0
    connected_pairs = 0
    for index, node in enumerate(nodes):
        if node not in graph:
            continue
        reachable = nx.node_connected_component(graph, node)
        connected_pairs += sum(1 for target in nodes[index + 1:] if target in reachable)
    return round(100 * connected_pairs / (len(nodes) * (len(nodes) - 1) / 2), 1)

def _route(graph: nx.Graph, origin: str, destination: str) -> dict | None:
    if origin not in graph or destination not in graph:
        return None
    try:
        path = nx.shortest_path(graph, origin, destination, weight="eta")
    except nx.NetworkXNoPath:
        return None
    edges = [graph[path[i]][path[i + 1]] for i in range(len(path) - 1)]
    return {"nodes": path, "eta_minutes": round(sum(edge["eta"] for edge in edges)),
        "distance_km": round(sum(edge["distance"] for edge in edges), 1),
        "mean_risk": round(sum(edge["risk"] for edge in edges) / len(edges), 1) if edges else 0,
        "corridors": [edge["name"] for edge in edges]}

def run_digital_twin(segments: list[Any], shipments: list[Any], districts: list[Any], payload: Any) -> dict:
    """Run a deterministic, non-persistent network stress test."""
    projected: dict[str, dict] = {}
    all_nodes = {node for segment in segments for node in (segment.from_node, segment.to_node)}
    for segment in segments:
        rainfall = float(segment.rainfall_24h_mm) * payload.rainfall_multiplier
        rainfall_uplift = max(0.0, rainfall - float(segment.rainfall_24h_mm)) * .075
        forecast_uplift = max(0.0, float(segment.forecast_rainfall_mm) * (payload.rainfall_multiplier - 1)) * .035
        slope_factor = _clamp(float(segment.slope_percent) / 25, 0, 1)
        elevation_factor = _clamp((1900 - float(segment.elevation_m)) / 1600, .05, 1)
        landslide_uplift = payload.landslide_activity * slope_factor * 30
        flood_uplift = payload.flood_severity * elevation_factor * 26
        bridge_uplift = payload.bridge_stress * float(segment.bridge_vulnerability) * 36
        demand_uplift = max(0.0, payload.demand_surge - 1) * float(segment.traffic_index) * 13
        total_uplift = rainfall_uplift + forecast_uplift + landslide_uplift + flood_uplift + bridge_uplift + demand_uplift
        score = int(round(_clamp(float(segment.risk_score) + total_uplift)))
        closed = (segment.operational_status == "CLOSED" or score >= 94
            or (payload.flood_severity >= .94 and elevation_factor >= .78)
            or (payload.landslide_activity >= .96 and slope_factor >= .82 and score >= 82))
        drivers = []
        for label, amount in [("rainfall intensification", rainfall_uplift + forecast_uplift),
            ("landslide activity × slope", landslide_uplift), ("flood exposure × elevation", flood_uplift),
            ("bridge stress × vulnerability", bridge_uplift), ("demand surge × traffic", demand_uplift)]:
            if amount >= 1:
                drivers.append({"factor": label, "risk_uplift": round(amount, 1)})
        projected[str(segment.id)] = {"segment_id": str(segment.id), "name": segment.name,
            "from_node": segment.from_node, "to_node": segment.to_node, "baseline_risk": int(segment.risk_score),
            "projected_risk": score, "baseline_status": segment.operational_status,
            "projected_status": "CLOSED" if closed else "OPEN", "risk_uplift": round(total_uplift, 1),
            "distance_km": float(segment.distance_km), "drivers": sorted(drivers, key=lambda item: -item["risk_uplift"])}

    baseline_graph, scenario_graph = _graph(segments), _graph(segments, projected)
    baseline_resilience = _network_resilience(baseline_graph, all_nodes)
    scenario_resilience = _network_resilience(scenario_graph, all_nodes)
    origin, affected_shipments = "Guwahati", []
    for shipment in shipments:
        if shipment.status in ("DELIVERED", "CANCELLED"):
            continue
        before = _route(baseline_graph, shipment.origin, shipment.destination)
        after = _route(scenario_graph, shipment.origin, shipment.destination)
        if before is None and after is None:
            continue
        if after is None:
            impact, delta = "STRANDED_IN_SCENARIO", None
        elif before is None:
            impact, delta = "BASELINE_UNREACHABLE", None
        else:
            delta = max(0, after["eta_minutes"] - before["eta_minutes"])
            impact = "ROUTE_DEGRADED" if delta >= 15 else "ROUTE_AVAILABLE"
        if impact != "ROUTE_AVAILABLE" or (delta or 0) >= 15:
            affected_shipments.append({"shipment_code": shipment.shipment_code, "cargo_type": shipment.cargo_type,
                "priority": shipment.priority, "origin": shipment.origin, "destination": shipment.destination,
                "impact": impact, "baseline_eta_minutes": before["eta_minutes"] if before else None,
                "scenario_eta_minutes": after["eta_minutes"] if after else None, "additional_eta_minutes": delta,
                "scenario_corridors": after["corridors"] if after else []})
    affected_shipments.sort(key=lambda row: ({"CRITICAL": 0, "HIGH": 1, "NORMAL": 2, "LOW": 3}.get(row["priority"], 4),
        -(row["additional_eta_minutes"] or 99999)))

    district_impacts = []
    for district in districts:
        node = DISTRICT_NODES.get(district.name)
        before = bool(node and node in baseline_graph and origin in baseline_graph and nx.has_path(baseline_graph, origin, node))
        after = bool(node and node in scenario_graph and origin in scenario_graph and nx.has_path(scenario_graph, origin, node))
        adjacent = [item["projected_risk"] for item in projected.values() if node and node in (item["from_node"], item["to_node"])]
        local_risk = max(adjacent, default=25)
        if before and not after:
            projected_access, state = max(0, int(district.accessibility_score) - 45), "NEWLY_ISOLATED"
        elif not after:
            projected_access, state = min(25, int(district.accessibility_score)), "UNREACHABLE_IN_NETWORK_MODEL"
        else:
            projected_access = int(round(_clamp(float(district.accessibility_score) - max(0, local_risk - 45) * .25, 0, 100)))
            state = "DEGRADED" if projected_access < int(district.accessibility_score) - 3 else "CONNECTED"
        if state != "CONNECTED":
            district_impacts.append({"district": district.name, "state": district.state_name, "network_node": node,
                "baseline_accessibility": int(district.accessibility_score), "projected_accessibility": projected_access,
                "change": projected_access - int(district.accessibility_score), "status": state, "local_peak_risk": local_risk})
    district_impacts.sort(key=lambda item: item["projected_accessibility"])

    changed = [item for item in projected.values() if item["projected_status"] == "CLOSED" or item["risk_uplift"] >= 15]
    duration = {"LANDSLIDE": 36, "FLOOD": 22, "BRIDGE": 72, "COMPOUND": 48}.get(payload.hazard_focus, 36)
    recovery = []
    for item in sorted(changed, key=lambda row: (row["projected_status"] != "CLOSED", -row["projected_risk"])):
        recovery.append({"segment_id": item["segment_id"], "corridor": item["name"], "state": item["projected_status"],
            "required_team": "Bridge inspection team" if payload.hazard_focus == "BRIDGE" else "Slope / road engineering team" if payload.hazard_focus in ("LANDSLIDE", "COMPOUND") else "Road clearance and drainage team",
            "illustrative_recovery_window_hours": round(duration * (.55 + item["projected_risk"] / 200), 1),
            "priority": "CRITICAL" if item["projected_status"] == "CLOSED" else "HIGH",
            "preconditions": "Qualified inspection and authorized reopening clearance"})
    curve = []
    for hour in (0, 6, 12, 24, 48, 72):
        recovery_fraction = 1 - math.exp(-hour / float(duration)) if hour else 0
        curve.append({"hours_from_scenario": hour, "illustrative_resilience_index":
            round(scenario_resilience + (baseline_resilience - scenario_resilience) * recovery_fraction, 1)})
    return {"scenario_name": payload.scenario_name, "hazard_focus": payload.hazard_focus,
        "data_mode": "SIMULATED_DIGITAL_TWIN", "persisted": False,
        "baseline": {"network_resilience_index": baseline_resilience,
            "open_segments": sum(1 for segment in segments if segment.operational_status != "CLOSED"), "total_segments": len(segments)},
        "scenario": {"network_resilience_index": scenario_resilience, "resilience_delta": round(scenario_resilience - baseline_resilience, 1),
            "newly_closed_segments": sum(1 for item in projected.values() if item["projected_status"] == "CLOSED" and item["baseline_status"] != "CLOSED"),
            "high_risk_segments": sum(1 for item in projected.values() if item["projected_risk"] >= 65 and item["projected_status"] != "CLOSED"),
            "affected_shipments": len(affected_shipments),
            "critical_shipments_affected": sum(1 for item in affected_shipments if item["priority"] == "CRITICAL"),
            "districts_with_impact": len(district_impacts)},
        "segment_impacts": sorted(projected.values(), key=lambda item: (-item["projected_risk"], item["name"])),
        "affected_shipments": affected_shipments, "district_impacts": district_impacts,
        "recovery_plan": recovery[:12], "illustrative_recovery_curve": curve,
        "guardrails": ["Synthetic scenario projection, not a forecast or road closure order.",
            "No operational database records were changed.", "Field verification and authorized incident command approval are required before action."]}
