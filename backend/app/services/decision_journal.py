from __future__ import annotations
from datetime import datetime, timezone
import hashlib, json
from typing import Any
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.entities import DecisionEvent

GENESIS_HASH="0"*64

def _canonical(event: DecisionEvent) -> str:
 payload={"id":event.id,"actor_email":event.actor_email,"event_type":event.event_type,"entity_type":event.entity_type,
  "entity_ref":event.entity_ref,"summary":event.summary,"rationale":event.rationale,"event_data":event.event_data or {},
  "created_at":event.created_at.isoformat(),"previous_hash":event.previous_hash}
 return json.dumps(payload,sort_keys=True,separators=(",",":"),ensure_ascii=False,default=str)

def append_event(db: Session, *, actor_email: str,event_type: str,entity_type: str,entity_ref: str,
                 summary: str,rationale: str,event_data: dict[str,Any]|None=None) -> DecisionEvent:
 previous=db.scalar(select(DecisionEvent).order_by(DecisionEvent.id.desc()).limit(1))
 event=DecisionEvent(actor_email=actor_email,event_type=event_type,entity_type=entity_type,entity_ref=entity_ref,
  summary=summary,rationale=rationale,event_data=event_data or {},previous_hash=previous.event_hash if previous else GENESIS_HASH,
  event_hash="",created_at=datetime.now(timezone.utc))
 db.add(event); db.flush()
 event.event_hash=hashlib.sha256(_canonical(event).encode("utf-8")).hexdigest()
 db.commit(); db.refresh(event)
 return event

def verify_chain(events: list[DecisionEvent]) -> dict:
 expected_previous=GENESIS_HASH; failures=[]
 for event in sorted(events,key=lambda item:item.id):
  if event.previous_hash!=expected_previous:
   failures.append({"event_id":event.id,"reason":"PREVIOUS_HASH_MISMATCH"})
  expected_hash=hashlib.sha256(_canonical(event).encode("utf-8")).hexdigest()
  if event.event_hash!=expected_hash:
   failures.append({"event_id":event.id,"reason":"EVENT_HASH_MISMATCH"})
  expected_previous=event.event_hash
 return {"integrity":"VALID" if not failures else "BROKEN","events_checked":len(events),
  "failure_count":len(failures),"failures":failures,"head_hash":expected_previous,
  "verification_note":"Hash chaining provides tamper evidence; it does not replace database access controls, signatures, backups or independent audit."}
