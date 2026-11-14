import hashlib
from types import SimpleNamespace
from datetime import datetime,timezone
from app.services.decision_journal import GENESIS_HASH,_canonical,verify_chain

def _event(event_id,previous,summary):
 event=SimpleNamespace(id=event_id,actor_email="official@demo",event_type="PROPOSAL",entity_type="ROAD",
  entity_ref="R-1",summary=summary,rationale="Reviewed evidence and route impact.",
  event_data={"decision_status":"PENDING_APPROVAL"},created_at=datetime(2026,1,1,tzinfo=timezone.utc),
  previous_hash=previous,event_hash="")
 event.event_hash=hashlib.sha256(_canonical(event).encode()).hexdigest()
 return event

def test_hash_chain_detects_tampering():
 first=_event(1,GENESIS_HASH,"Review route closure")
 second=_event(2,first.event_hash,"Stage medical kits")
 assert verify_chain([first,second])["integrity"]=="VALID"
 second.summary="Tampered summary"
 assert verify_chain([first,second])["integrity"]=="BROKEN"

def test_hash_chain_rejects_wrong_previous_hash():
 result=verify_chain([_event(1,"f"*64,"Changed road status")])
 assert result["integrity"]=="BROKEN" and result["failure_count"]>=1
