from app.core.database import is_serverless_database, normalize_database_url


def test_normalizes_supabase_postgres_uri_for_psycopg3():
    assert normalize_database_url("postgres://user:pass@host:6543/postgres").startswith("postgresql+psycopg://")
    assert normalize_database_url("postgresql://user:pass@host:5432/postgres").startswith("postgresql+psycopg://")


def test_keeps_explicit_psycopg_driver():
    url = "postgresql+psycopg://user:pass@host:6543/postgres"
    assert normalize_database_url(url) == url


def test_detects_supabase_transaction_pooler():
    assert is_serverless_database("postgresql+psycopg://user:pass@aws-0-ap-south-1.pooler.supabase.com:6543/postgres")


def test_detects_supabase_project_host():
    assert is_serverless_database("postgresql+psycopg://postgres:pass@db.example.supabase.co:5432/postgres")
