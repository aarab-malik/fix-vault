from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://fixvault:fixvault@localhost:5432/fixvault"
    database_url_sync: str = "postgresql://fixvault:fixvault@localhost:5432/fixvault"
    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7
    credentials_encryption_key: str = "change-me"
    cookie_secure: bool = False
    cookie_samesite: str = "lax"
    cors_origins: str = "http://localhost:3000"

    # Gemini via OpenAI-compatible endpoint
    chat_model: str = "gemini-flash-latest"
    embedding_model: str = "gemini-embedding-001"
    embedding_dimensions: int = 1536
    default_openai_base_url: str = "https://generativelanguage.googleapis.com/v1beta/openai/"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
