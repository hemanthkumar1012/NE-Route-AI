# Database

PostgreSQL with PostGIS is provisioned by Docker Compose. `init/001_extensions.sql` enables PostGIS. SQLAlchemy creates the prototype tables during API startup and `backend/app/seed.py` inserts synthetic sample records. Data is illustrative only.

Before production, replace create-all startup with Alembic migrations, add least-privilege database roles, configure automated backups, and source verified administrative boundaries and road geometry.
