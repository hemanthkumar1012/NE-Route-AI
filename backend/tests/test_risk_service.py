from types import SimpleNamespace
from app.services.risk_service import predict_segment


def test_closed_segment_is_always_blocked():
    s = SimpleNamespace(id="x", name="test road", risk_score=10, operational_status="CLOSED", rainfall_24h_mm=0,
        slope_percent=2, historical_incidents_30d=0, road_condition_score=.9)
    result = predict_segment(s)
    assert result["risk_score"] == 100
    assert result["risk_level"] == "BLOCKED"


def test_risk_explanation_mentions_heavy_rain_and_slope():
    s = SimpleNamespace(id="x", name="test road", risk_score=78, operational_status="OPEN", rainfall_24h_mm=120,
        slope_percent=20, historical_incidents_30d=4, road_condition_score=.4)
    result = predict_segment(s)
    assert result["risk_level"] == "HIGH_RISK"
    assert len(result["factors"]) >= 3
    assert "rainfall" in result["explanation"]
