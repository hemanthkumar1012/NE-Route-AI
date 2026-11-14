# API documentation

Interactive OpenAPI documentation is served at `http://localhost:8000/docs`.

All REST endpoints are prefixed with `/api/v1`. Login is `POST /auth/login`; all subsequent routes require a bearer token. Main groups: auth, dashboard, map, districts, risks, weather, incidents, vehicles, shipments, route planning, alerts, offline synchronization, copilot, analytics, missions, response playbooks and demo controls. A simulated GPS stream is exposed at `/api/v1/ws/live`.

Request schemas are defined in `backend/app/schemas/api.py`. The server returns `data_mode: SIMULATED` on data-derived views where applicable.
