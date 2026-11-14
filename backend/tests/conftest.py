import pytest

@pytest.fixture
def sample_risk_features():
    return {"rainfall_24h_mm": 140, "slope_percent": 22, "historical_incidents_30d": 4,
        "traffic_index": .5, "road_condition_score": .4, "bridge_vulnerability": .6,
        "forecast_rainfall_mm": 90, "elevation_m": 1200}
