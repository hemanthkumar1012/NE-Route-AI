def predict_segment(segment):
    score = max(0, min(100, int(segment.risk_score)))
    factors = []
    if segment.rainfall_24h_mm >= 80:
        factors.append({"factor": "24-hour rainfall", "value": segment.rainfall_24h_mm, "effect": "increases risk"})
    if segment.slope_percent >= 15:
        factors.append({"factor": "road slope", "value": segment.slope_percent, "effect": "increases landslide exposure"})
    if segment.historical_incidents_30d >= 3:
        factors.append({"factor": "recent incidents", "value": segment.historical_incidents_30d, "effect": "increases risk"})
    if segment.road_condition_score <= .5:
        factors.append({"factor": "road condition", "value": segment.road_condition_score, "effect": "reduces reliability"})
    if segment.operational_status == "CLOSED":
        level = "BLOCKED"
        score = 100
    else:
        level = "HIGH_RISK" if score >= 65 else "CAUTION" if score >= 35 else "SAFE"
    explanation = "; ".join(f"{x['factor']} ({x['value']}) {x['effect']}" for x in factors)
    if not explanation:
        explanation = "No thresholded hazard drivers in the current synthetic feature snapshot."
    return {"segment_id": str(segment.id), "name": segment.name, "risk_score": score,
        "risk_level": level, "operational_status": segment.operational_status,
        "probability": round(score / 100, 2), "factors": factors, "explanation": explanation, "data_mode": "SIMULATED"}
