import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parent.parent
DEFAULT_ENV_FILE = ROOT_DIR / ".env"
LOCAL_ENV_FILE = ROOT_DIR / ".env.local"

env_file = os.getenv("ENV_FILE")
if env_file:
    env_file_path = Path(env_file)
    if not env_file_path.is_absolute():
        env_file_path = ROOT_DIR / env_file_path
else:
    env_file_path = LOCAL_ENV_FILE if LOCAL_ENV_FILE.exists() else DEFAULT_ENV_FILE

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgres_secure_pwd@127.0.0.1:5432/tenderai"
    LOCAL_DB_FALLBACK_URL: str = "sqlite:///./dev.db"
    REDIS_URL: str = "redis://127.0.0.1:6379/0"
    
    JWT_SECRET_KEY: str = "super_secure_jwt_token_secret_key_change_in_production_123456"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 43200  # 30 days
    
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    GROQ_BASE_URL: str = "https://api.groq.com/openai/v1"
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    
    UPLOAD_DIR: str = "/app/uploads"

    # SMTP configuration
    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "noreply@tenderai.com"
    SMTP_USE_TLS: bool = True

    model_config = SettingsConfigDict(
        env_file=str(env_file_path),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

# Ensure directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)