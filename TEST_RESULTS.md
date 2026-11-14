# Automated test and validation record

The latest Advanced v4 CI run passed on GitHub Actions. See [TEST_RESULTS_ADVANCED.md](TEST_RESULTS_ADVANCED.md) for the exact run, commit and suite results.

| Check | Result |
|---|---:|
| Backend pytest | 26 passed |
| ML pytest | 2 passed |
| Frontend core Node tests | 5 passed |
| React / Vitest component tests | 6 passed |
| TypeScript + Vite production build | Passed |
| GitHub Actions jobs | 2 / 2 passed |

Docker Compose startup and PostgreSQL/PostGIS runtime integration were not run in CI. The npm dependency installation also reported 6 advisories (3 moderate, 1 high, 2 critical); review with `cd frontend && npm audit` before deployment.

All operational demo data and ML training labels are synthetic. A passing CI suite validates code-level checks, not the real-world predictive accuracy of the model or the suitability of the illustrative route graph.
