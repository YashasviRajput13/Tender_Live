from backend.config import settings
import os
from pydantic_settings import BaseSettings, SettingsConfigDict

env_file = os.getenv("ENV_FILE", ".env")

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgres_secure_pwd@localhost:5432/tenderai"
    REDIS_URL: str = "redis://localhost:6379/0"

    JWT_SECRET_KEY: str = "super_secure_jwt_token_secret_key_change_in_production_123456"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    GROK_API_KEY: str = ""
    GROK_BASE_URL: str = "https://api.xai.com/v1"
    GROK_MODEL: str = "grok-beta"

    UPLOAD_DIR: str = "/app/uploads"

    model_config = SettingsConfigDict(
        env_file=env_file,
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
