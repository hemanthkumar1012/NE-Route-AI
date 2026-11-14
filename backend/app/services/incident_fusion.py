from __future__ import annotations
from collections import defaultdict
from datetime import datetime, timezone
from math import asin, cos, radians, sin, sqrt
from typing import Any

def haversine_km(a: list[float], b: list[float]) -> float:
    lon1, lat1 = a; lon2, lat2 = b
    dlat, dlon = radians(lat2 - lat1), radians(lon2 - lon1)
    value = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return 6371.0088 * 2 * asin(sqrt(value))

def _aware(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value

def _source_trust(reporter: str) -> float:
    value = (reporter or "").lower()
    if "official@" in value: return .95
    if "field@" in value: return .86
    if "citizen" in value or "public" in value: return .58
    return .62

def fuse_incidents(incidents: list[Any], radius_km: float = 5.0, window_hours: float = 24.0) -> dict:
    """Cluster candidate duplicate reports; never merge or reject reports automatically."""
    rows, parent = list(incidents), list(range(len(incidents)))
    def find(i: int) -> int:
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i
    def union(a: int, b: int) -> None:
        root_a, root_b = find(a), find(b)
        if root_a != root_b: parent[root_b] = root_a
    pair_matches = []
    for i in range(len(rows)):
        for j in range(i + 1, len(rows)):
            first, second = rows[i], rows[j]
            if first.incident_type != second.incident_type: continue
            distance = haversine_km(first.coordinates, second.coordinates)
            elapsed = abs((_aware(first.reported_at) - _aware(second.reported_at)).total_seconds()) / 3600
            if distance <= radius_km and elapsed <= window_hours:
                union(i, j)
                pair_matches.append({"left_report": first.report_code, "right_report": second.report_code,
                    "distance_km": round(distance, 2), "time_gap_hours": round(elapsed, 2)})
    groups: dict[int, list[int]] = defaultdict(list)
    for index in range(len(rows)): groups[find(index)].append(index)
    clusters, scores = [], []
    for indexes in groups.values():
        cluster_rows = [rows[index] for index in indexes]
        reporters = {row.reported_by for row in cluster_rows}
        cluster_id = "FUS-" + min(row.report_code for row in cluster_rows).replace("NER-", "")[:16]
        corroboration = min(.24, max(0, len(reporters) - 1) * .12)
        for row in cluster_rows:
            trust = _source_trust(row.reported_by)
            verified_bonus = .12 if row.status == "VERIFIED" else 0
            rejected_penalty = .30 if row.status == "REJECTED" else 0
            score = round(max(.05, min(.99, .38 + trust * .40 + corroboration + verified_bonus - rejected_penalty)) * 100)
            scores.append({"report_code": row.report_code, "cluster_id": cluster_id, "cluster_size": len(cluster_rows),
                "independent_reporters": len(reporters), "source_trust": round(trust, 2), "confidence_score": score,
                "confidence_band": "HIGH" if score >= 80 else "MEDIUM" if score >= 60 else "LOW",
                "duplicate_candidate": len(cluster_rows) > 1,
                "recommended_action": "Review and link reports; do not auto-merge." if len(cluster_rows) > 1 else "Continue normal verification."})
        if len(cluster_rows) > 1:
            codes = {row.report_code for row in cluster_rows}
            clusters.append({"cluster_id": cluster_id, "incident_type": cluster_rows[0].incident_type,
                "districts": sorted({row.district_name for row in cluster_rows}),
                "reports": [row.report_code for row in cluster_rows], "independent_reporters": len(reporters),
                "pair_matches": [pair for pair in pair_matches if pair["left_report"] in codes and pair["right_report"] in codes],
                "requires_human_review": True})
    return {"data_mode": "SIMULATED_OR_REPORTED_PLATFORM_DATA", "duplicate_clusters": clusters,
        "report_scores": sorted(scores, key=lambda item: (item["duplicate_candidate"], -item["confidence_score"])),
        "summary": {"reports_analyzed": len(rows), "duplicate_clusters": len(clusters),
            "candidate_duplicate_reports": sum(len(cluster["reports"]) for cluster in clusters)},
        "guardrail": "Spatial-temporal similarity is a review signal, not proof of duplication or incident truth. No report was merged or suppressed."}
