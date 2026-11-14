# Automated test and validation record

This file records checks performed during the Advanced v3 packaging session. It is not a CI guarantee.

| Check | Result | Notes |
|---|---:|---|
| Backend pytest | 27 passed | Service, schema, mission optimizer, response playbooks and risk tests |
| ML pytest | 2 passed | Synthetic generator, model training and artifact output |
| Frontend core Node tests | 6 passed | Risk classification, resilience and mission utility logic |
| Python compilation | Passed | Backend, ML and scripts syntax checks |
| TypeScript / TSX syntax scan | 11 files passed | Static syntax scan only; not a TypeScript compiler build |
| React/Vitest component tests | Not run | npm registry unavailable during packaging environment |
| Vite production build | Not run | npm dependencies unavailable |
| Docker Compose integration | Not run | Docker CLI unavailable in packaging environment |
| PostgreSQL/PostGIS integration | Not run | No Docker/database runtime in packaging environment |

All operational data is synthetic. ML holdout metrics use synthetic labels and are not evidence of real-world predictive accuracy. Run the complete commands in README on a machine with dependencies available before a formal SIH submission.
