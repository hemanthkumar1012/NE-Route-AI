from types import SimpleNamespace
from app.services.resource_staging import optimize_resource_staging

def test_resource_staging_proposes_allocation_without_mutating_stock():
 facility=SimpleNamespace(id="f1",code="GHY",name="Guwahati Hub",node_name="Guwahati",is_operational=True)
 stock=SimpleNamespace(id="s1",facility_id="f1",resource_type="MEDICAL_KITS",quantity=100,reorder_level=20,unit="kits")
 district=SimpleNamespace(name="Kamrup Metropolitan",state_name="Assam",accessibility_score=60)
 road=SimpleNamespace(from_node="Guwahati",to_node="Nagaon",operational_status="OPEN",base_eta_minutes=60,risk_score=20,distance_km=100)
 result=optimize_resource_staging([facility],[stock],[district],[],[],[road])
 assert result["persisted"] is False and result["summary"]["proposed_allocation_units"]>0
 assert stock.quantity==100

def test_resource_staging_reports_shortfall_without_inventory():
 district=SimpleNamespace(name="Kamrup Metropolitan",state_name="Assam",accessibility_score=30)
 result=optimize_resource_staging([],[],[district],[],[],[],"FOOD_PACKS")
 assert result["summary"]["unfilled_units"]>0
 assert result["district_priorities"][0]["shortfall_units"]>0
