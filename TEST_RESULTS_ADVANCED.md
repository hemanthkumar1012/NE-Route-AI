# NE-Route AI — Vercel + Supabase integration validation

**GitHub Actions: ALL JOBS PASSED**  
CI run: [NE-Route AI CI #43589700170](https://github.com/hemanthkumar1012/NE-Route-AI/actions/runs/43589700170)  
Commit: `6ecc634d2d754b52e95c77bba7b03b12e9143c54`

## Automated test results

| Suite | Result |
|---|---:|
| Backend pytest | 32 passed |
| ML pytest | 2 passed |
| Frontend core Node tests | 5 passed |
| React / Vitest component tests | 8 passed |
| TypeScript + Vite production build | Passed |
| Vercel FastAPI entrypoint import | Passed |

**Total automated tests: 47 passed, 0 failed.**

## Container validation results

| Check | Result |
|---|---:|
| Docker Compose configuration | Passed |
| FastAPI backend Docker image | Built |
| ML service Docker image | Built |
| Production Nginx frontend Docker image | Built |
| GitHub Actions jobs | 3 / 3 passed |

## Deployment changes

- Root `index.py` exports the existing FastAPI application for Vercel's Python runtime.
- `vercel.json` builds the React frontend into `public/` and targets Vercel region `bom1`.
- SQLAlchemy normalizes Supabase PostgreSQL URLs to psycopg 3 and uses `NullPool`, SSL and `prepare_threshold=None` for Supabase serverless transaction-pooler connections.
- Production mode disables demo seeding and automatic table creation.
- Incident images use Supabase Storage when a server-only service key and private bucket are configured; Vercel does not silently write persistent uploads to ephemeral disk.
- An idempotent initial administrator bootstrap is available through server-side environment variables.

## Not yet completed

- No Supabase project has been selected for NE-Route AI, so the schema in `supabase/schema.sql` has not been applied.
- Vercel team authorization and project linking are pending user approval.
- A hosted preview deployment and real Supabase database connectivity test have not yet run.
- The separate ML service, external weather, SMS, email and WhatsApp providers are not included in the single Vercel FastAPI deployment; fallback status is shown honestly.

All demonstration road, rainfall, incident, depot, stock, GPS and ML training data remains synthetic. The passing CI suite validates code and image builds, not real-world route suitability or predictive accuracy.
