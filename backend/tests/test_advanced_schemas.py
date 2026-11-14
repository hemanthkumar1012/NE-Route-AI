import pytest
from pydantic import ValidationError
from app.schemas.advanced import DigitalTwinRequest,ResourceStagingRequest,DecisionProposalRequest

def test_digital_twin_rejects_unbounded_rainfall():
 with pytest.raises(ValidationError): DigitalTwinRequest(rainfall_multiplier=9)

def test_digital_twin_bounds_hazard_factors():
 with pytest.raises(ValidationError): DigitalTwinRequest(bridge_stress=1.5)

def test_resource_type_is_constrained():
 with pytest.raises(ValidationError): ResourceStagingRequest(resource_type="UNSAFE_UNKNOWN")

def test_decision_proposal_requires_meaningful_rationale():
 with pytest.raises(ValidationError):
  DecisionProposalRequest(decision_type="ROUTE_CHANGE",entity_type="ROAD",entity_ref="R-1",summary="Change",rationale="No")
