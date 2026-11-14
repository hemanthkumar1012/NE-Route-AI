# Advanced v4 validation record

This file lists the new automated coverage. It does not claim the full suite has passed in the packaging environment.

- Digital twin: compound hazard drivers, corridor closure projection, shipment isolation and non-mutation.
- Resource staging: proposed allocations, inventory non-mutation and unmet-demand reporting.
- Incident fusion: spatial-temporal duplicate candidates, distance exclusion and haversine symmetry.
- Decision journal: hash-chain validation, tampering detection and previous-hash mismatch.
- Pydantic validation: bounded scenario parameters, constrained resource types and decision rationale.
- Frontend: renders the Digital Twin and four advanced response tabs.

Run after clone:

```bash
pytest backend/tests -q
(cd ml-service && pytest tests -q)
(cd frontend && npm install && npm run test:core && npm test && npm run build)
docker compose config
docker compose up --build
```

Docker/PostGIS integration and the frontend npm build must be executed on a host with Docker and registry connectivity. GitHub Actions is configured to run backend, ML and frontend tests on pushes and pull requests.
