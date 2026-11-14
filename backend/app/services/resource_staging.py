from __future__ import annotations
from typing import Any
import networkx as nx
from app.services.digital_twin import DISTRICT_NODES

RESOURCE_PROFILES = {
 "MEDICAL_KITS":{"unit":"kits","demand_factor":42},"FOOD_PACKS":{"unit":"packs","demand_factor":85},
 "RELIEF_KITS":{"unit":"kits","demand_factor":60},"ROAD_REPAIR_KITS":{"unit":"kits","demand_factor":28},
 "FUEL_LITERS":{"unit":"liters","demand_factor":120}}
SEVERITY_WEIGHT={"LOW":1,"MEDIUM":2,"HIGH":3,"CRITICAL":4}
PRIORITY_WEIGHT={"LOW":1,"NORMAL":1,"HIGH":2,"CRITICAL":3}

def _supply_graph(roads: list[Any]) -> nx.Graph:
 graph=nx.Graph()
 for road in roads:
  if road.operational_status=="CLOSED": continue
  graph.add_edge(road.from_node,road.to_node,cost=float(road.base_eta_minutes)*(1+float(road.risk_score)/100*.55),
    eta=float(road.base_eta_minutes),risk=float(road.risk_score),distance=float(road.distance_km))
 return graph

def optimize_resource_staging(facilities: list[Any],stocks: list[Any],districts: list[Any],incidents: list[Any],
                              shipments: list[Any],roads: list[Any],resource_type: str="MEDICAL_KITS") -> dict:
 if resource_type not in RESOURCE_PROFILES: raise ValueError(f"Unsupported resource type: {resource_type}")
 profile=RESOURCE_PROFILES[resource_type]; graph=_supply_graph(roads)
 stock_by_facility={stock.facility_id:stock for stock in stocks if stock.resource_type==resource_type}
 remaining={stock.id:int(stock.quantity) for stock in stocks if stock.resource_type==resource_type}
 incident_pressure={}
 for incident in incidents:
  if incident.status in ("PENDING","VERIFIED"):
   incident_pressure[incident.district_name]=incident_pressure.get(incident.district_name,0)+SEVERITY_WEIGHT.get(incident.severity,1)
 shipment_pressure={}
 for shipment in shipments:
  shipment_pressure[shipment.destination]=shipment_pressure.get(shipment.destination,0)+PRIORITY_WEIGHT.get(shipment.priority,1)
 assignments=[]; restock=[]; total_requested=0; total_allocated=0
 for stock in stocks:
  if stock.resource_type==resource_type and int(stock.quantity)<=int(stock.reorder_level):
   facility=next((item for item in facilities if item.id==stock.facility_id),None)
   restock.append({"facility":facility.name if facility else str(stock.facility_id),"facility_code":facility.code if facility else None,
    "resource_type":resource_type,"current_quantity":int(stock.quantity),"reorder_level":int(stock.reorder_level),
    "suggested_restock_units":max(int(stock.reorder_level)*2-int(stock.quantity),0),"unit":stock.unit})
 facility_by_id={facility.id:facility for facility in facilities if facility.is_operational}
 demands=[]
 for district in districts:
  incident_score=incident_pressure.get(district.name,0)
  shipment_score=shipment_pressure.get(district.name,0)+shipment_pressure.get(DISTRICT_NODES.get(district.name,""),0)
  demand_index=min(100,round(18+(100-int(district.accessibility_score))*.55+incident_score*10+shipment_score*8))
  requested=max(2,round(profile["demand_factor"]*demand_index/100))
  demands.append((demand_index,district,requested))
 demands.sort(key=lambda item:(-item[0],item[1].name))
 for demand_index,district,requested in demands:
  target_node=DISTRICT_NODES.get(district.name); candidates=[]
  for facility in facility_by_id.values():
   stock=stock_by_facility.get(facility.id); available=remaining.get(stock.id,0) if stock else 0
   if not stock or available<=0 or not target_node or facility.node_name not in graph or target_node not in graph: continue
   try:
    path=nx.shortest_path(graph,facility.node_name,target_node,weight="cost")
    edges=[graph[path[i]][path[i+1]] for i in range(len(path)-1)]
   except nx.NetworkXNoPath: continue
   eta=sum(edge["eta"]*(1+edge["risk"]/100*.55) for edge in edges)
   distance=sum(edge["distance"] for edge in edges)
   mean_risk=sum(edge["risk"] for edge in edges)/len(edges) if edges else 0
   cost=eta*(1+mean_risk/100)/(1+demand_index/100)
   candidates.append((cost,facility,stock,available,eta,distance,mean_risk,path))
  candidates.sort(key=lambda item:(item[0],item[1].name)); remaining_need=requested
  for _,facility,stock,available,eta,distance,mean_risk,path in candidates:
   if remaining_need<=0: break
   allocation=min(remaining_need,available); remaining[stock.id]-=allocation; remaining_need-=allocation; total_allocated+=allocation
   assignments.append({"district":district.name,"state":district.state_name,"facility":facility.name,
    "facility_code":facility.code,"resource_type":resource_type,"requested_units":requested,"proposed_units":allocation,
    "unit":stock.unit,"travel_eta_minutes":round(eta),"distance_km":round(distance,1),"route_risk_score":round(mean_risk,1),
    "route_nodes":path,"demand_index":demand_index,"priority":"CRITICAL" if demand_index>=75 else "HIGH" if demand_index>=55 else "NORMAL"})
  total_requested+=requested
  if remaining_need>0:
   assignments.append({"district":district.name,"state":district.state_name,"facility":None,"resource_type":resource_type,
    "requested_units":requested,"proposed_units":0,"shortfall_units":remaining_need,"unit":profile["unit"],
    "demand_index":demand_index,"priority":"CRITICAL" if demand_index>=75 else "HIGH","route_nodes":[],
    "travel_eta_minutes":None,"route_risk_score":None})
 district_totals={}
 for row in assignments:
  entry=district_totals.setdefault(row["district"],{"district":row["district"],"state":row["state"],
   "requested_units":row["requested_units"],"proposed_units":0,"shortfall_units":0,"priority":row["priority"],
   "demand_index":row["demand_index"],"source_facilities":[]})
  entry["proposed_units"]+=row["proposed_units"]; entry["shortfall_units"]+=row.get("shortfall_units",0)
  if row.get("facility"): entry["source_facilities"].append(row["facility"])
 return {"resource_type":resource_type,"unit":profile["unit"],"data_mode":"SIMULATED_RESOURCE_PLANNING","persisted":False,
  "optimization":"GREEDY_MINIMUM_RISK_ADJUSTED_ETA",
  "summary":{"facilities_considered":len(facility_by_id),"districts_considered":len(demands),
   "total_requested_units":total_requested,"proposed_allocation_units":total_allocated,
   "unfilled_units":max(0,total_requested-total_allocated),"restock_actions":len(restock)},
  "district_priorities":sorted(district_totals.values(),key=lambda row:(-row["demand_index"],row["district"])),
  "allocation_legs":assignments,"restock_actions":restock,
  "guardrail":"Allocations are recommendations only. Inventory is not decremented and no transfer or dispatch order is created."}
