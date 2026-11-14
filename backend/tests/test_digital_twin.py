from types import SimpleNamespace
from app.schemas.advanced import DigitalTwinRequest
from app.services.digital_twin import run_digital_twin

def _road(id,a,b,risk=20,status="OPEN",rain=20,slope=5,elevation=900,bridge=.2):
 return SimpleNamespace(id=id,from_node=a,to_node=b,risk_score=risk,operational_status=status,
  rainfall_24h_mm=rain,forecast_rainfall_mm=rain*.5,slope_percent=slope,elevation_m=elevation,
  bridge_vulnerability=bridge,traffic_index=.3,base_eta_minutes=30,distance_km=20,name=f"{a}-{b}")

def test_digital_twin_projects_cascading_impacts_without_mutation():
 roads=[_road("1","Guwahati","Nagaon",60,rain=100,slope=20),_road("2","Nagaon","Dimapur",55,rain=90,slope=18),
        _road("3","Dimapur","Kohima",35),_road("4","Kohima","Imphal",50)]
 shipments=[SimpleNamespace(status="IN_TRANSIT",origin="Guwahati",destination="Imphal",shipment_code="MED-1",cargo_type="MEDICINE",priority="CRITICAL")]
 districts=[SimpleNamespace(name="Imphal West",state_name="Manipur",accessibility_score=85)]
 payload=DigitalTwinRequest(scenario_name="Severe compound",hazard_focus="COMPOUND",rainfall_multiplier=3.2,
  flood_severity=.95,landslide_activity=.95,bridge_stress=.9,demand_surge=2.5)
 result=run_digital_twin(roads,shipments,districts,payload)
 assert result["persisted"] is False and result["data_mode"]=="SIMULATED_DIGITAL_TWIN"
 assert result["scenario"]["newly_closed_segments"]>=1
 assert result["scenario"]["critical_shipments_affected"]==1
 assert result["illustrative_recovery_curve"][0]["illustrative_resilience_index"]==result["scenario"]["network_resilience_index"]
 assert roads[0].operational_status=="OPEN" and roads[0].risk_score==60

def test_digital_twin_no_hazard_preserves_connectivity():
 roads=[_road("1","Guwahati","Nagaon",10),_road("2","Nagaon","Dimapur",15)]
 result=run_digital_twin(roads,[],[],DigitalTwinRequest(rainfall_multiplier=1,flood_severity=0,landslide_activity=0,bridge_stress=0,demand_surge=1))
 assert result["scenario"]["newly_closed_segments"]==0
 assert result["scenario"]["network_resilience_index"]==result["baseline"]["network_resilience_index"]
