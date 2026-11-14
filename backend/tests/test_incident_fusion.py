from datetime import datetime,timedelta,timezone
from types import SimpleNamespace
from app.services.incident_fusion import fuse_incidents,haversine_km

def _incident(code,lon,lat,minutes,reporter="field@neroute.ai"):
 return SimpleNamespace(report_code=code,incident_type="LANDSLIDE",coordinates=[lon,lat],
  reported_at=datetime(2026,1,1,tzinfo=timezone.utc)+timedelta(minutes=minutes),
  reported_by=reporter,status="PENDING",district_name="Dima Hasao",severity="HIGH")

def test_nearby_reports_cluster_for_human_review():
 result=fuse_incidents([_incident("NER-1",93.01,25.35,0),_incident("NER-2",93.02,25.36,25,"citizen-public")])
 assert result["summary"]["duplicate_clusters"]==1
 assert result["report_scores"][0]["duplicate_candidate"] is True
 assert "do not auto-merge" in result["report_scores"][0]["recommended_action"].lower()

def test_distant_reports_are_not_merged():
 result=fuse_incidents([_incident("NER-1",93.0,25.3,0),_incident("NER-2",94.0,26.3,10)])
 assert result["summary"]["duplicate_clusters"]==0

def test_haversine_distance_is_symmetric():
 a,b=[93.0,25.0],[93.1,25.1]
 assert abs(haversine_km(a,b)-haversine_km(b,a))<1e-9
