from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import current_user, require_roles
from app.models.entities import DecisionEvent, District, Incident, LogisticsFacility, ResourceStock, RoadSegment, Shipment, User
from app.schemas.advanced import DecisionProposalRequest, DecisionReviewRequest, DigitalTwinRequest, ResourceStagingRequest
from app.services.decision_journal import append_event, verify_chain
from app.services.digital_twin import run_digital_twin
from app.services.incident_fusion import fuse_incidents
from app.services.resource_staging import optimize_resource_staging

router = APIRouter(prefix="/advanced", tags=["Advanced Operations"])

@router.post("/digital-twin/run")
def digital_twin(payload: DigitalTwinRequest, db: Session = Depends(get_db), user: User = Depends(current_user)):
    result = run_digital_twin(list(db.scalars(select(RoadSegment))), list(db.scalars(select(Shipment))),
                              list(db.scalars(select(District))), payload)
    result["requested_by_role"] = user.role
    return result

@router.post("/resource-staging/plan")
def resource_staging(payload: ResourceStagingRequest, db: Session = Depends(get_db), user: User = Depends(current_user)):
    return optimize_resource_staging(list(db.scalars(select(LogisticsFacility))),
        list(db.scalars(select(ResourceStock))), list(db.scalars(select(District))),
        list(db.scalars(select(Incident))), list(db.scalars(select(Shipment))),
        list(db.scalars(select(RoadSegment))), payload.resource_type)

@router.get("/incident-fusion/analyze")
def incident_fusion(radius_km: float = 5.0, window_hours: float = 24.0,
                    db: Session = Depends(get_db), user: User = Depends(current_user)):
    if not 0.5 <= radius_km <= 25:
        raise HTTPException(status_code=422, detail="radius_km must be between 0.5 and 25")
    if not 1 <= window_hours <= 168:
        raise HTTPException(status_code=422, detail="window_hours must be between 1 and 168")
    incidents = list(db.scalars(select(Incident).order_by(Incident.reported_at)))
    result = fuse_incidents(incidents, radius_km=radius_km, window_hours=window_hours)
    result["analysis_parameters"] = {"radius_km": radius_km, "window_hours": window_hours}
    return result

@router.post("/decisions/propose")
def propose_decision(payload: DecisionProposalRequest, db: Session = Depends(get_db),
    user: User = Depends(require_roles("ADMIN", "GOVERNMENT_OFFICIAL", "LOGISTICS_MANAGER"))):
    event = append_event(db, actor_email=user.email, event_type="PROPOSAL",
        entity_type=payload.entity_type, entity_ref=payload.entity_ref, summary=payload.summary,
        rationale=payload.rationale,
        event_data={"decision_type": payload.decision_type, "decision_status": "PENDING_APPROVAL",
                    "evidence_snapshot": payload.evidence_snapshot})
    return {"proposal_id": event.id, "decision_status": "PENDING_APPROVAL", "event_hash": event.event_hash,
            "message": "Recommendation recorded for authorized review. No operational action was executed."}

@router.post("/decisions/{proposal_id}/review")
def review_decision(proposal_id: int, payload: DecisionReviewRequest, db: Session = Depends(get_db),
    user: User = Depends(require_roles("ADMIN", "GOVERNMENT_OFFICIAL"))):
    proposal = db.get(DecisionEvent, proposal_id)
    if not proposal or proposal.event_type != "PROPOSAL":
        raise HTTPException(status_code=404, detail="Decision proposal not found")
    if proposal.actor_email == user.email:
        raise HTTPException(status_code=403, detail="A different authorized reviewer must review this proposal")
    events = list(db.scalars(select(DecisionEvent).where(DecisionEvent.event_type == "REVIEW").order_by(DecisionEvent.id)))
    if any((event.event_data or {}).get("proposal_id") == proposal_id for event in events):
        raise HTTPException(status_code=409, detail="This proposal already has a final review event")
    review = append_event(db, actor_email=user.email, event_type="REVIEW",
        entity_type="DECISION_PROPOSAL", entity_ref=str(proposal_id),
        summary=f"{payload.decision} · {proposal.summary}", rationale=payload.notes,
        event_data={"proposal_id": proposal_id, "decision_status": payload.decision, "review_notes": payload.notes})
    return {"proposal_id": proposal_id, "decision_status": payload.decision, "review_event_id": review.id,
            "event_hash": review.event_hash,
            "message": "Review recorded in the tamper-evident journal. No dispatch or inventory release was executed."}

@router.get("/decisions")
def decisions(db: Session = Depends(get_db), user: User = Depends(current_user)):
    events = list(db.scalars(select(DecisionEvent).order_by(DecisionEvent.id)))
    reviews = {(event.event_data or {}).get("proposal_id"): event for event in events if event.event_type == "REVIEW"}
    proposals = []
    for event in events:
        if event.event_type != "PROPOSAL":
            continue
        review = reviews.get(event.id)
        proposals.append({"proposal_id": event.id, "decision_type": (event.event_data or {}).get("decision_type"),
            "entity_type": event.entity_type, "entity_ref": event.entity_ref, "summary": event.summary,
            "rationale": event.rationale, "proposed_by": event.actor_email, "created_at": event.created_at.isoformat(),
            "status": (review.event_data or {}).get("decision_status") if review else "PENDING_APPROVAL",
            "reviewed_by": review.actor_email if review else None,
            "review_notes": (review.event_data or {}).get("review_notes") if review else None})
    return {"proposals": list(reversed(proposals)), "event_count": len(events), "data_mode": "AUDIT_JOURNAL"}

@router.get("/decisions/integrity")
def decision_integrity(db: Session = Depends(get_db), user: User = Depends(current_user)):
    return verify_chain(list(db.scalars(select(DecisionEvent).order_by(DecisionEvent.id))))
