# Automated test and validation record

The latest application integration verification is recorded in [TEST_RESULTS_ADVANCED.md](TEST_RESULTS_ADVANCED.md).

| Check | Result |
|---|---:|
| Backend pytest | 28 passed |
| ML pytest | 2 passed |
| Frontend core Node tests | 5 passed |
| React / Vitest component tests | 8 passed |
| TypeScript + Vite production build | Passed |
| Total automated tests | 43 passed |

The Docker image / Compose validation job has been added to GitHub Actions. Do not treat code-level tests as proof that a local or hosted PostgreSQL deployment is running. A live Compose integration run must be performed with Docker available.

CI npm installation reported 6 advisories (3 moderate, 1 high, 2 critical); review with `cd frontend && npm audit` before deployment.

All operational demo data and ML training labels are synthetic. A passing CI suite validates code-level checks, not real-world predictive accuracy or route suitability.
