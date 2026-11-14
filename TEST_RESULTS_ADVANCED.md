# NE-Route AI — v4 integration validation

**CI status: PASS**  
GitHub Actions run: [NE-Route AI CI #43588463008](https://github.com/hemanthkumar1012/NE-Route-AI/actions/runs/43588463008)  
Commit under test: `d37c2e764b03cf036aa2ca8752c3c982e2f1bd3f`

## Executed automated checks

| Suite | Result |
|---|---:|
| Backend pytest | 28 passed |
| ML pytest | 2 passed |
| Frontend core Node tests | 5 passed |
| React / Vitest component tests | 8 passed |
| Frontend TypeScript + Vite production build | Passed |
| GitHub Actions jobs | 2 / 2 passed |

**Total automated tests: 43 passed, 0 failed.**

The latest commit adds production Nginx frontend packaging, same-origin API proxying, actual database / ML readiness probes, and the System Health & Diagnostics workspace.

## Reproduce locally

```bash
cp .env.example .env
docker compose config
docker compose up --build
```

Then open `http://localhost:5173`, API docs at `http://localhost:8000/docs`, and backend readiness at `http://localhost:8000/health/ready`.

## Validation boundaries

- GitHub Actions verified Python tests, frontend tests, and the TypeScript/Vite production build.
- Docker Compose image builds and a live PostgreSQL/PostGIS Compose startup were not included in run #43588463008; a separate Docker build / Compose validation job has now been added to CI.
- CI's npm install previously reported 6 dependency advisories (3 moderate, 1 high and 2 critical). Review with `cd frontend && npm audit`; do not blindly apply `npm audit fix --force`.
- Synthetic training labels and illustrative road / facility mappings do not establish real-world predictive accuracy or operational suitability.

All operational simulation data remains explicitly labeled synthetic. Dispatch, inventory release, road closure, public advisories and incident verification require real-world validation and authorized human action.
