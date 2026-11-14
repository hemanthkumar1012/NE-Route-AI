# Automated test and validation record

The latest [Vercel + Supabase integration CI run](https://github.com/hemanthkumar1012/NE-Route-AI/actions/runs/43589700170) passed all three jobs.

| Check | Result |
|---|---:|
| Backend tests | 32 passed |
| ML tests | 2 passed |
| Frontend core tests | 5 passed |
| React component tests | 8 passed |
| Vercel FastAPI entrypoint import | Passed |
| Vite production build | Passed |
| Docker Compose config | Passed |
| Backend, ML and frontend Docker image builds | Passed |
| Total automated tests | 47 passed |

The Supabase schema has not yet been applied because a target project has not been selected. No hosted Vercel deployment or live Supabase database connection has yet been tested.

All demo data and ML labels are synthetic. CI does not establish real-world forecasting accuracy or safe navigation.
