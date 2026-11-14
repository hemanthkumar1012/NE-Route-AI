# Advanced v4 validation record

**CI status: PASS**  
GitHub Actions run: [NE-Route AI CI #43575729420](https://github.com/hemanthkumar1012/NE-Route-AI/actions/runs/43575729420)  
Commit under test: `8ea264b102c00f51ffd54bd03290e25cc00fbe1a`

## Executed automated checks

| Suite | Result |
|---|---:|
| Backend pytest | 26 passed |
| ML pytest | 2 passed |
| Frontend core Node tests | 5 passed |
| React / Vitest component tests | 6 passed |
| Frontend TypeScript + Vite production build | Passed |
| GitHub Actions jobs | 2 / 2 passed |

**Total automated tests: 39 passed, 0 failed.**

Coverage includes:
- Digital twin: compound hazard drivers, corridor closure projection, shipment isolation and non-mutation.
- Resource staging: proposed allocations, inventory non-mutation and unmet-demand reporting.
- Incident fusion: spatial-temporal duplicate candidates, distance exclusion and haversine symmetry.
- Decision journal: hash-chain validation, tampering detection and previous-hash mismatch.
- Pydantic validation: bounded scenario parameters, constrained resource types and decision rationale.
- Frontend component rendering for Risk Intelligence, Mission Control and Digital Twin workspaces.
- Frontend utility coverage for route priority, unreachable stops, road-risk classes and resilience scoring.

## Commands to reproduce

```bash
pytest backend/tests -q
(cd ml-service && pytest tests -q)
(cd frontend && npm install && npm run test:core && npm test && npm run build)
docker compose config
docker compose up --build
```

## Remaining validation / security work

- Docker Compose startup and PostgreSQL/PostGIS runtime integration were not part of this GitHub Actions workflow.
- CI's `npm install` reported 6 dependency advisories: 3 moderate, 1 high and 2 critical. Review with `cd frontend && npm audit`; do not blindly run `npm audit fix --force` because it may introduce breaking dependency upgrades.
- Synthetic training labels and illustrative NER road/facility mappings are not evidence of real-world predictive or logistics performance.

All operational simulation data remains explicitly labeled synthetic. Dispatch, inventory release, road closure, public advisories and incident verification require real-world validation and authorized human action.
