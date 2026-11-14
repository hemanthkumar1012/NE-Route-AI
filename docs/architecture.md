# Architecture

```text
React + Leaflet
   | REST / WebSocket
   v
FastAPI application -------- ML service (scikit-learn)
   |                              | synthetic risk model
   v                              | optional TorchScript CV adapter
PostgreSQL + PostGIS <------------+
```

The API owns authorization, transactional workflows and the operational snapshot. The ML service owns risk inference and optional image-classification inference. The frontend never writes directly to the database. Synthetic GPS updates, risk features and incidents are labeled as demo information. Dispatch recommendations require human approval.
