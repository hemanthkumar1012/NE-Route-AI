from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://neroute:neroute_dev@db:5432/neroute"
    jwt_secret: str = "replace-with-a-long-random-secret-before-deployment"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 720
    frontend_origin: str = "http://localhost:5173"
    ml_service_url: str = "http://ml-service:8100"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    upload_dir: str = "/app/uploads"
    demo_mode: bool = False
    initial_admin_email: str = ""
    initial_admin_password: str = ""
    vercel_url: str = ""
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_storage_bucket: str = "incident-media"


settings = Settings()
