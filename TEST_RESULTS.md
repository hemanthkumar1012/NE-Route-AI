# Automated test and validation record

The latest [end-to-end CI run](https://github.com/hemanthkumar1012/NE-Route-AI/actions/runs/43588696127) passed all three jobs.

| Check | Result |
|---|---:|
| Backend tests | 28 passed |
| ML tests | 2 passed |
| Frontend core tests | 5 passed |
| React component tests | 8 passed |
| Vite production build | Passed |
| Compose configuration validation | Passed |
| Backend, ML and frontend Docker image builds | Passed |
| Total automated tests | 43 passed |

A live PostgreSQL/PostGIS container startup has not yet been exercised in CI. npm installation reported 6 advisories (3 moderate, 1 high, 2 critical); review with `cd frontend && npm audit` before deployment.

All demonstration data and ML training labels are synthetic. Code-level tests do not establish real-world predictive accuracy or route suitability.
