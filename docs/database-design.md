# Database design

The prototype uses relational SQLAlchemy models for users, districts, road segments, incidents, vehicles, shipments, alerts and weather observations. The database container enables PostGIS for future authoritative spatial geometry; current illustrative road coordinates are stored as JSON arrays for the self-contained demo.

For production evolution: use UUID foreign keys, PostGIS `geometry(Point/LineString, 4326)`, GIST spatial indexes, Alembic migrations, incident status history, model-version and prediction history, notification delivery history, role audit logs and immutable event records. Do not promote the simplified demo schema directly to government production.
