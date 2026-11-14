# Advanced Operations v4

NE-Route AI adds four connected decision-support subsystems.

## Disaster Digital Twin

Endpoint: `POST /api/v1/advanced/digital-twin/run`

The engine projects rainfall intensification, flood exposure, landslide activity, bridge stress and demand surge onto the illustrative road graph. It computes corridor risk uplift and potential closures, network connectivity before and after the scenario, shipment reachability and additional travel time, district accessibility signals, a recovery work queue and an illustrative resilience-recovery curve.

The endpoint is non-persistent. It does not modify roads, shipments, districts or inventory. Recovery windows and curves are heuristics, not official restoration estimates or validated forecasts.

## Strategic Relief Resource Staging

Endpoint: `POST /api/v1/advanced/resource-staging/plan`

Resource types: `MEDICAL_KITS`, `FOOD_PACKS`, `RELIEF_KITS`, `ROAD_REPAIR_KITS`, `FUEL_LITERS`.

Demand is estimated from district accessibility, active incident severity and shipment priority. Facilities are ranked using graph ETA adjusted by route risk. The planner proposes allocations from seeded synthetic stock and identifies shortfalls and restock needs.

This is a greedy allocation heuristic, not a globally optimal inventory-routing solution. It does not decrement stock or create transfer orders.

## Spatial-temporal Incident Fusion

Endpoint: `GET /api/v1/advanced/incident-fusion/analyze?radius_km=5&window_hours=24`

Reports of the same incident category inside a configurable radius and time window are grouped as duplicate candidates. Source-trust and corroboration indicators prioritize review. Similarity does not establish truth: reports are never merged, hidden, rejected or verified automatically.

## Tamper-evident Decision Journal

Endpoints:

- `POST /api/v1/advanced/decisions/propose`
- `POST /api/v1/advanced/decisions/{proposal_id}/review`
- `GET /api/v1/advanced/decisions`
- `GET /api/v1/advanced/decisions/integrity`

Proposals and reviews are append-only records chained with SHA-256 hashes. A reviewer needs an authorized role and must be different from the proposer. Corrections should be recorded as new events.

Hash chaining provides tamper evidence, not non-repudiation. It does not replace signed identities, database permissions, backups or independent audit.

## Synthetic-data and operating limits

- Facilities, inventories, road links, node mappings and scenario parameters are illustrative.
- Node mapping is not an authoritative district / road topology.
- The digital twin and staging plans must be validated with road authorities, disaster-management teams and logistics operators before field use.
- Dispatch, advisories, road closures, incident verification and inventory releases require proper authorization and real-world validation.
