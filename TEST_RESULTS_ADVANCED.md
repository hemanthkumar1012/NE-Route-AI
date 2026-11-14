# NE-Route AI — v4 end-to-end integration validation

**GitHub Actions: ALL JOBS PASSED**  
CI run: [NE-Route AI CI #43588696127](https://github.com/hemanthkumar1012/NE-Route-AI/actions/runs/43588696127)  
Commit: `2f59009556adc98e1ebfff19eadd8c606ac539bb`

## Application test results

| Suite | Result |
|---|---:|
| Backend pytest | 28 passed |
| ML pytest | 2 passed |
| Frontend core Node tests | 5 passed |
| React / Vitest component tests | 8 passed |
| TypeScript + Vite production build | Passed |

**Total automated tests: 43 passed, 0 failed.**

## Container validation results

| Check | Result |
|---|---:|
| Docker Compose configuration | Passed |
| FastAPI backend image build | Passed |
| ML service image build | Passed |
| Production Nginx frontend image build | Passed |
| GitHub Actions jobs | 3 / 3 passed |

The production frontend image serves the Vite bundle through Nginx and proxies `/api` and `/health` to FastAPI. The Vite development server uses matching proxies for local development.

## Run locally

```bash
cp .env.example .env
docker compose config
docker compose up --build
```

Open:
- Frontend: `http://localhost:5173`
- API documentation: `http://localhost:8000/docs`
- Backend liveness: `http://localhost:8000/health`
- Backend readiness: `http://localhost:8000/health/ready`
- ML health: `http://localhost:8100/health`

## Remaining validation / security work

- CI built all images and validated the Compose configuration, but did not start the full containers against a live PostgreSQL/PostGIS instance.
- npm reported 6 dependency advisories (3 moderate, 1 high and 2 critical). Review with `cd frontend && npm audit` before deployment. Do not apply `npm audit fix --force` blindly.
- The road graph, depot inventory, GPS, weather and ML training labels are synthetic. They do not establish real-world prediction accuracy or safe navigation.

All operational simulation data remains explicitly labeled synthetic. Dispatch, inventory release, road closure, public advisories and incident verification require real-world validation and authorized human action.
